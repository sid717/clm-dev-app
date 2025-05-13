const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  loadTickets: () => ipcRenderer.invoke("tickets:load"),
  saveTickets: (tickets) => ipcRenderer.invoke("tickets:save", tickets),
  getFolderContents: (folderPath) => ipcRenderer.invoke("tickets:get-folder-contents", folderPath),
});