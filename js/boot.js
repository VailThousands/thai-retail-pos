(async()=>{
 const keys=['pos-products-v2','pos-sales','pos-config','pos-categories-v1','pos-selling-units-v1','pos-customers-v1','pos-customer-payments-v1','pos-opening-debts-v1'];
 const storage=window.localStorage,originalSet=Storage.prototype.setItem;let revision=0,initialized=false,pushTimer=null,pushing=false,lastApplied=0;
 const status=text=>{let el=document.getElementById('syncStatus');if(el)el.textContent=text};
 function readState(){let state={};for(const key of keys){let value=storage.getItem(key);if(value!==null){try{state[key]=JSON.parse(value)}catch{}}}return state}
 function applyState(state){for(const key of keys){if(Object.prototype.hasOwnProperty.call(state,key))originalSet.call(storage,key,JSON.stringify(state[key]));else storage.removeItem(key)}lastApplied=Date.now()}
 async function fetchState(){let response=await fetch('/api/state',{cache:'no-store'});if(!response.ok)throw Error('อ่านฐานข้อมูลไม่สำเร็จ');return response.json()}
 async function pushState(){if(pushing)return; pushing=true;try{status('กำลังบันทึกข้อมูล…');let response=await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,state:readState()})});let result=await response.json();if(response.status===409){status('ข้อมูลเปลี่ยนจากเครื่องอื่น');alert('มีการเปลี่ยนแปลงข้อมูลจากอีกเครื่อง กำลังโหลดข้อมูลล่าสุด กรุณาทำรายการที่ยังไม่บันทึกซ้ำอีกครั้ง');const latest=await fetchState();revision=latest.revision;applyState(latest.state||{});location.reload();return}if(!response.ok)throw Error(result.error||'บันทึกไม่สำเร็จ');revision=result.revision;initialized=true;status('● ซิงก์แล้ว · '+new Date().toLocaleTimeString('th-TH'))}catch(error){status('ออฟไลน์ · รอซิงก์');console.error('POS sync:',error)}finally{pushing=false}}
 function schedulePush(){clearTimeout(pushTimer);pushTimer=setTimeout(pushState,350)}
 Storage.prototype.setItem=function(key,value){originalSet.call(this,key,value);if(this===storage&&keys.includes(key))schedulePush()};
 try{let initial=await fetchState();revision=initial.revision||0;initialized=!!initial.initialized;if(initialized)applyState(initial.state||{});status(initialized?'● เชื่อมฐานข้อมูลกลาง':'กำลังตั้งค่าฐานข้อมูลกลาง')}catch(error){status('เชื่อมฐานข้อมูลไม่ได้');document.body.innerHTML='<main style="font:16px Tahoma,sans-serif;padding:32px"><h2>เชื่อมฐานข้อมูลร้านไม่ได้</h2><p>ตรวจว่าเครื่องหลักกำลังเปิด POS อยู่และอุปกรณ์เชื่อมต่อ Wi-Fi วงเดียวกัน จากนั้นรีเฟรชหน้านี้</p></main>';console.error(error);return}
 const scripts=['/app.js','/js/catalog-ui.js','/js/units.js','/js/customers.js','/js/bill-editor.js','/js/profit-report.js','/js/pwa.js','/js/network-info.js'];
 for(const src of scripts){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(Error('โหลดไฟล์ไม่ได้: '+src));document.body.appendChild(script)}).catch(error=>{document.body.innerHTML='<main style="font:16px Tahoma,sans-serif;padding:32px"><h2>เปิด POS ไม่สำเร็จ</h2><p>'+error.message+'</p></main>';throw error})}
 if(typeof window.persist==='function')window.persist();
 setInterval(async()=>{if(document.visibilityState==='hidden'||pushing||pushTimer||document.getElementById('modal')?.style.display==='flex')return;try{const latest=await fetchState();if(latest.revision>revision&&Date.now()-lastApplied>1000){revision=latest.revision;applyState(latest.state||{});status('มีข้อมูลใหม่ · กำลังอัปเดต');location.reload()}}catch{status('ออฟไลน์ · รอซิงก์')}},1800);
 window.addEventListener('online',()=>{status('กลับมาออนไลน์ · กำลังซิงก์');schedulePush()});
})();



