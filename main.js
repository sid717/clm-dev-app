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