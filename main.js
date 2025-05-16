const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const express = require('express');

const staticApp = express();
const STATIC_PORT = 3333;

// This will map ticketId -> folderPath (absolute)
let ticketFolders = {};
ipcMain.handle('register-ticket-folders', (event, ticketArray) => {
    ticketFolders = {};
    ticketArray.forEach(ticket => {
        if (ticket.id && ticket.folderPath) {
            ticketFolders[ticket.id] = ticket.folderPath;
        }
    });
});

// Serve /preview/:ticketId/* dynamically from each ticket's folderPath
staticApp.get('/preview/:ticketId/*', (req, res) => {
    const ticketId = req.params.ticketId;
    const relPath = req.params[0] || '';
    const baseFolder = ticketFolders[ticketId];
    if (!baseFolder) return res.status(404).send('Ticket not found');
    const filePath = path.join(baseFolder, relPath);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    res.sendFile(filePath);
});

staticApp.listen(STATIC_PORT, () => {
    console.log(`Dynamic static server running on port ${STATIC_PORT}`);
});



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

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

ipcMain.handle('preview-url', (event, url) => {
    const win = new BrowserWindow({
        width: 1366,  // iPad Pro 12.9" landscape
        height: 1024,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        // Optional: Remove the window frame for a more device-like experience
        // frame: false,
    });

    // Optional: Set an iPad User-Agent for better emulation
    win.webContents.setUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
    );

    win.loadURL(url);
});

ipcMain.handle('get-ticket-preview-url', async (event, ticketId) => {
    const ip = getLocalIp();

    const baseFolder = ticketFolders[ticketId];
    if (!baseFolder) throw new Error("No folder set for this ticket.");

    const dirs = fs.readdirSync(baseFolder, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    // Find all folders ending with _NNN (where NNN is a number)
    const pageFolders = dirs
        .map(name => {
            const match = name.match(/_(\d+)$/);
            return match ? { name, num: parseInt(match[1], 10) } : null;
        })
        .filter(Boolean);

    // Sort by num ascending and pick the smallest
    if (pageFolders.length === 0) throw new Error("No numbered page folder found in this ticket!");

    pageFolders.sort((a, b) => a.num - b.num);
    const firstPageFolder = pageFolders[0].name;

    // Compose preview URL
    return `http://${ip}:${STATIC_PORT}/preview/${encodeURIComponent(ticketId)}/${encodeURIComponent(firstPageFolder)}/index.html`;
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

// ipcMain.handle('tickets:open-link', async (event, url) => {
//     await shell.openExternal(url);
// });

ipcMain.handle('tickets:open-link', async (event, url) => {
    try {
        if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) {
            throw new Error("Invalid URL");
        }
        await shell.openExternal(url);
    } catch (err) {
        console.error("Error opening link:", err);
        throw err;
    }
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
