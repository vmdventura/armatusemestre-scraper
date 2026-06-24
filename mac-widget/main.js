const { app, BrowserWindow, ipcMain, screen, nativeTheme } = require('electron');
const path = require('path');
const { readAllUsageData } = require('./src/claude-reader');

let win;

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 370,
    height: 600,
    x: width - 390,
    y: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    minimizable: true,
    skipTaskbar: false,
    hasShadow: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());

ipcMain.handle('get-usage-data', async () => {
  return await readAllUsageData();
});

ipcMain.handle('get-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

ipcMain.on('close-window',    () => app.quit());
ipcMain.on('minimize-window', () => win?.minimize());
