const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const vaultPath = () => path.join(app.getPath('userData'), 'cofre.json');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 760,
        height: 820,
        minWidth: 420,
        minHeight: 560,
        backgroundColor: '#131313',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    Menu.setApplicationMenu(null);
    mainWindow.loadFile('index.html');

    // Bloqueia abrir janelas/sites externos dentro do app
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', e => e.preventDefault());
}

// Só uma janela do app por vez
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
    app.whenReady().then(createWindow);
    app.on('window-all-closed', () => app.quit());
}

// ---- Arquivo do cofre (já chega criptografado) ----
ipcMain.handle('vault:load', () => {
    try {
        return fs.readFileSync(vaultPath(), 'utf8');
    } catch (e) {
        return null;
    }
});

ipcMain.handle('vault:save', (_event, text) => {
    if (typeof text !== 'string' || text.length > 5000000) throw new Error('invalid');
    const file = vaultPath();
    if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');   // cópia de segurança
    fs.writeFileSync(file + '.tmp', text, 'utf8');
    fs.renameSync(file + '.tmp', file);                               // troca atômica
});