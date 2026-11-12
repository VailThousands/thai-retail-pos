const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {exec}=require('node:child_process');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8'};
const allowed=new Set(['pos-products-v2','pos-sales','pos-config','pos-categories-v1','pos-selling-units-v1','pos-customers-v1','pos-customer-payments-v1','pos-opening-debts-v1']);
function createPosServer(options={}){
 const root=path.resolve(options.rootDir||__dirname),dataDir=path.resolve(options.databaseDir||path.join(root,'data')),dbFile=path.join(dataDir,'pos-data.json'),port=options.port??8765,host=options.host||'0.0.0.0',openBrowser=options.openBrowser!==false;
 let db={revision:0,initialized:false,state:{}},writeQueue=Promise.resolve();
 try{fs.mkdirSync(dataDir,{recursive:true});if(fs.existsSync(dbFile))db=JSON.parse(fs.readFileSync(dbFile,'utf8'))}catch(error){console.error('Could not read POS database:',error.message)}
 function persistDatabase(){writeQueue=writeQueue.then(async()=>{fs.mkdirSync(dataDir,{recursive:true});const tmp=dbFile+'.tmp';await fs.promises.writeFile(tmp,JSON.stringify(db,null,2),'utf8');await fs.promises.rename(tmp,dbFile)});return writeQueue}
 function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
 function readBody(req){return new Promise((resolve,reject)=>{let text='',size=0;req.on('data',chunk=>{size+=chunk.length;if(size>25*1024*1024){reject(new Error('PAYLOAD_TOO_LARGE'));req.destroy();return}text+=chunk});req.on('end',()=>{try{resolve(JSON.parse(text||'{}'))}catch{reject(new Error('INVALID_JSON'))}});req.on('error',reject)})}
 function lanAddresses(){const out=[];for(const list of Object.values(os.networkInterfaces()))for(const net of list||[])if(net.family==='IPv4'&&!net.internal)out.push(net.address);return out}
 const server=http.createServer(async(req,res)=>{
  let url;try{url=new URL(req.url,'http://localhost')}catch{return send(res,400,{error:'bad_url'})}
  if(url.pathname==='/api/state'&&req.method==='GET')return send(res,200,db);
  if(url.pathname==='/api/info'&&req.method==='GET')return send(res,200,{port,addresses:lanAddresses()});
  if(url.pathname==='/api/state'&&req.method==='POST'){
   let payload;try{payload=await readBody(req)}catch(error){return send(res,error.message==='PAYLOAD_TOO_LARGE'?413:400,{error:error.message})}
   if(payload.revision!==db.revision)return send(res,409,{error:'revision_conflict',revision:db.revision});
   if(!payload.state||typeof payload.state!=='object'||Array.isArray(payload.state))return send(res,400,{error:'invalid_state'});
   const state={};for(const key of allowed)if(Object.prototype.hasOwnProperty.call(payload.state,key))state[key]=payload.state[key];
   db={revision:db.revision+1,initialized:true,updatedAt:new Date().toISOString(),state};try{await persistDatabase();return send(res,200,db)}catch(error){console.error('Database write failed:',error);return send(res,500,{error:'database_write_failed'})}
  }
  let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{return send(res,400,{error:'bad_path'})}
  if(pathname==='/data'||pathname.startsWith('/data/')){res.writeHead(404);return res.end('Not found')}
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,''),file=path.resolve(root,relative);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(err.code==='ENOENT'?404:500);return res.end(err.code==='ENOENT'?'Not found':'Unable to read file')}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data)})
 });
 return new Promise((resolve,reject)=>{
  let triedFallback=false;
  const onError=error=>{
   if(error.code==='EADDRINUSE'&&port!==0&&!triedFallback){triedFallback=true;console.warn(`Port ${port} is already in use; selecting an available port.`);server.listen(0,host);return}
   server.removeListener('listening',onListening);reject(error)
  };
  const onListening=()=>{
   const actualPort=server.address().port,info={server,port:actualPort,host,addresses:lanAddresses(),databaseFile:dbFile};
   console.log(`POS database: ${dbFile}`);for(const ip of info.addresses)console.log(`Wi-Fi address: http://${ip}:${actualPort}`);
   if(openBrowser)exec(`start "" "http://localhost:${actualPort}"`);resolve(info)
  };
  server.on('error',onError);server.once('listening',onListening);server.listen(port,host)
 })
}
if(require.main===module)createPosServer().catch(error=>{console.error('Could not start POS:',error.message);process.exitCode=1});
module.exports={createPosServer};

