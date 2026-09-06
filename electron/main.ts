import { app, BrowserWindow, Menu } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MaktoobDatabase } from './database.js';
import { registerIpc } from './ipc.js';
import { LicenseManager } from './licensing.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function resolveIconPath(): string | undefined {
  const candidates = [
    app.isPackaged ? path.join(process.resourcesPath, 'branding', 'maktoob.ico') : '',
    app.isPackaged ? path.join(process.resourcesPath, 'icon.ico') : '',
    path.join(app.getAppPath(), 'resources', 'branding', 'maktoob.ico'),
    path.join(app.getAppPath(), 'resources', 'icon.ico'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function createMainWindow(iconPath?: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#10251D',
    show: false,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(currentDir, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Remove native default development menu
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    const devServer = process.env.VITE_DEV_SERVER_URL;
    if (!devServer || !url.startsWith(devServer)) event.preventDefault();
  });
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  // The window immediately reveals at full application bounds with the startup overlay active
  window.once('ready-to-show', () => {
    window.show();
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) void window.loadURL(devServer);
  else void window.loadFile(path.join(app.getAppPath(), 'dist/index.html'));

  return window;
}

let database: MaktoobDatabase | undefined;

app.whenReady().then(async () => {
  // Remove native default menu bar globally
  Menu.setApplicationMenu(null);

  const iconPath = resolveIconPath();

  // Initialize database and licensing
  database = new MaktoobDatabase(path.join(app.getPath('userData'), 'maktoob.sqlite'));
  const publicKeyPath = app.isPackaged
    ? path.join(process.resourcesPath, 'license-public.pem')
    : path.join(app.getAppPath(), 'resources', 'license-public.pem');
  const licenseManager = new LicenseManager(
    path.join(app.getPath('userData'), 'license', 'maktoob.license.json'),
    publicKeyPath,
    !app.isPackaged && process.env.MAKTOOB_DEV_LICENSE_BYPASS === '1'
  );
  await licenseManager.initialize();
  registerIpc(database, licenseManager);

  // Create single continuous application window
  createMainWindow(iconPath);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(iconPath);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => database?.close());
