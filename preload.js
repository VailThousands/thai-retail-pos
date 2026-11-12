const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('posSetup',{chooseHost:()=>ipcRenderer.invoke('pos:host'),connect:url=>ipcRenderer.invoke('pos:connect',url)});

