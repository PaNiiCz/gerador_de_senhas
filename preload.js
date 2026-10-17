const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vaultAPI', {
    load: () => ipcRenderer.invoke('vault:load'),
    save: (text) => ipcRenderer.invoke('vault:save', text)
});