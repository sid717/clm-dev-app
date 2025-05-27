const { contextBridge, ipcRenderer } = require("electron");
const QRCode = require('qrcode');

contextBridge.exposeInMainWorld("electronAPI", {
loadTickets: () => ipcRenderer.invoke("tickets:load"),
saveTickets: (tickets) => ipcRenderer.invoke("tickets:save", tickets),
getFolderContents: (folderPath) => ipcRenderer.invoke("tickets:get-folder-contents", folderPath),
selectFolder: () => ipcRenderer.invoke("tickets:select-folder"),
openFolder: (fullPath) => ipcRenderer.invoke("tickets:open-path", fullPath),
openLink: (url) => ipcRenderer.invoke("tickets:open-link", url),
getTicketPreviewUrl: (ticketId) => ipcRenderer.invoke('get-ticket-preview-url', ticketId),
registerTicketFolders: (tickets) => ipcRenderer.invoke('register-ticket-folders', tickets),
generateQrDataUrl: (text) => QRCode.toDataURL(text),
previewUrl: (url) => ipcRenderer.invoke('preview-url', url),
openInVSCode: (filePath) => ipcRenderer.invoke('open-folder-in-vscode', filePath),
readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
writeFile: (filePath, content) => ipcRenderer.invoke("write-file", filePath, content)
});