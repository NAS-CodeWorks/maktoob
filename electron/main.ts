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

function resolveSplashPath(): string | undefined {
  const candidates = [
    app.isPackaged ? path.join(process.resourcesPath, 'branding', 'splash.html') : '',
    path.join(app.getAppPath(), 'resources', 'branding', 'splash.html'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function createSplashWindow(iconPath?: string): BrowserWindow | null {
  const splashPath = resolveSplashPath();
  if (!splashPath) return null;

  const splash = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: false,
    backgroundColor: '#10251d',
    center: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: false,
    show: false,
    alwaysOnTop: true,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splash.removeMenu();
  void splash.loadFile(splashPath);
  splash.once('ready-to-show', () => splash.show());
  return splash;
}

function createMainWindow(iconPath?: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f3f5f2',
    show: false,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(currentDir, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    const devServer = process.env.VITE_DEV_SERVER_URL;
    if (!devServer || !url.startsWith(devServer)) event.preventDefault();
  });
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

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
  const splashStartTime = Date.now();
  const splash = createSplashWindow(iconPath);

  // Initialize database and licensing in background while splash is active
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

  // Create main window hidden
  const mainWindow = createMainWindow(iconPath);

  // Once main window is ready to show, transition smoothly from splash
  mainWindow.once('ready-to-show', async () => {
    if (splash && !splash.isDestroyed()) {
      const elapsed = Date.now() - splashStartTime;
      const minSplashDuration = 1800; // Optimal 1.8s perceived timing
      const remaining = Math.max(0, minSplashDuration - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      // Smooth fade-out transition
      try {
        if (!splash.isDestroyed()) {
          await splash.webContents.executeJavaScript("document.body.classList.add('fade-out')", true);
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      } catch {
        // ignore if window closed
      }

      if (!mainWindow.isDestroyed()) {
        mainWindow.show();
      }
      if (!splash.isDestroyed()) {
        splash.destroy();
      }
    } else {
      if (!mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createMainWindow(iconPath);
      win.once('ready-to-show', () => win.show());
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => database?.close());
