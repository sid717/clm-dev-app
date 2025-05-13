const {app, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow;

const TICKET_STORE_PATH = path.join(app.getPath("userData"), "tickets.json");

function loadTickets() {
    try {
        const data = fs.readFileSync(TICKET_STORE_PATH, 'utf8');
        return JSON.parse(data)
    } catch {
        return [];
    }
}

function saveTickets(tickets) {
    fs.writeFileSync(TICKET_STORE_PATH, JSON.stringify(tickets, null, 2));
}

ipcMain.handle('tickets:load', () => loadTickets());
ipcMain.handle("tickets:save", (event, incomingTickets) => {
    saveTickets(incomingTickets);
  });

  app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true
        }
    });
    mainWindow.loadFile('index.html');
    console.log(TICKET_STORE_PATH)
});

ipcMain.handle('get-app-path', async () => {
    return app.getPath('userData')
})

ipcMain.handle('tickets:select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle("tickets:open-path", async (_, fullPath) => {
    const { shell } = require("electron");
    return await shell.openPath(fullPath);
  });

ipcMain.handle("tickets:get-folder-contents", async (_, folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        return files.map(file => {
          const fullPath = path.join(folderPath, file);
          const isDir = fs.statSync(fullPath).isDirectory();
          return {
            name: file,
            isDir,
            fullPath
          };
        });
      } catch (err) {
        console.error("Error reading folder:", err);
        return [];
      }
});
  