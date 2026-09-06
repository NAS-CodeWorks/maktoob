import electron from 'electron';
import electronUpdater from 'electron-updater';
import type { UpdateState } from '../shared/domain.js';

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

function getAutoUpdater() {
  if (!app?.getVersion) return null;
  try {
    return electronUpdater?.autoUpdater || null;
  } catch {
    return null;
  }
}

export class UpdateService {
  private state: UpdateState;
  private checkPromise: Promise<UpdateState> | null = null;
  private isInitialized = false;

  constructor() {
    this.state = {
      status: 'idle',
      currentVersion: app?.getVersion ? app.getVersion() : '1.1.0',
    };
  }

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Only packaged production apps poll/check against GitHub Releases
    if (!app?.isPackaged) {
      this.state.message = 'التطبيق قيد التشغيل في بيئة التطوير التجريبية';
      return;
    }

    const autoUpdater = getAutoUpdater();
    if (!autoUpdater) return;

    try {
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;

      autoUpdater.on('checking-for-update', () => {
        this.updateState({ status: 'checking', message: 'جارٍ التحقق من وجود تحديث...' });
      });

      autoUpdater.on('update-available', (info) => {
        this.updateState({
          status: 'update-available',
          availableVersion: info.version,
          message: `يتوفر إصدار جديد: ${info.version}`,
        });
      });

      autoUpdater.on('update-not-available', () => {
        this.updateState({
          status: 'no-update',
          message: 'أنت تستخدم أحدث إصدار من مكتوب.',
        });
      });

      autoUpdater.on('download-progress', (progress) => {
        const percent = Math.round(progress.percent || 0);
        this.updateState({
          status: 'downloading',
          percent,
          message: `جارٍ تنزيل التحديث — ${percent}%`,
        });
      });

      autoUpdater.on('update-downloaded', (info) => {
        this.updateState({
          status: 'downloaded',
          availableVersion: info.version,
          percent: 100,
          message: 'التحديث جاهز للتثبيت.',
        });
      });

      autoUpdater.on('error', (err) => {
        const raw = err?.message || String(err);
        let userMessage = 'تعذر التحقق من وجود تحديث. تحقق من اتصال الإنترنت وحاول مرة أخرى.';
        if (raw.includes('net::ERR_INTERNET_DISCONNECTED') || raw.includes('ENOTFOUND')) {
          userMessage = 'لا يوجد اتصال بالإنترنت. تحقق من الاتصال وحاول مرة أخرى.';
        }
        this.updateState({
          status: 'error',
          message: userMessage,
        });
      });

      // Delayed automatic check shortly after startup (7 seconds)
      setTimeout(() => {
        this.checkForUpdates(true).catch(() => {});
      }, 7000);
    } catch (caught) {
      console.error('Failed to initialize auto-updater:', caught);
    }
  }

  private updateState(partial: Partial<UpdateState>) {
    this.state = {
      ...this.state,
      ...partial,
      currentVersion: app?.getVersion ? app.getVersion() : '1.1.0',
    };
    this.broadcastState();
  }

  private broadcastState() {
    if (!BrowserWindow?.getAllWindows) return;
    const allWindows = BrowserWindow.getAllWindows();
    for (const win of allWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send('updater:state-changed', this.state);
      }
    }
  }

  getState(): UpdateState {
    return { ...this.state, currentVersion: app?.getVersion ? app.getVersion() : '1.1.0' };
  }

  async checkForUpdates(isAuto = false): Promise<UpdateState> {
    const autoUpdater = getAutoUpdater();
    if (!app?.isPackaged || !autoUpdater) {
      this.updateState({
        status: isAuto ? 'idle' : 'no-update',
        message: 'أنت تستخدم أحدث إصدار من مكتوب.',
      });
      return this.getState();
    }

    if (this.checkPromise) {
      return this.checkPromise;
    }

    this.updateState({ status: 'checking', message: 'جارٍ التحقق من وجود تحديث...' });

    this.checkPromise = (async () => {
      try {
        await autoUpdater.checkForUpdates();
        return this.getState();
      } catch {
        this.updateState({
          status: 'error',
          message: 'تعذر التحقق من وجود تحديث. تحقق من اتصال الإنترنت وحاول مرة أخرى.',
        });
        return this.getState();
      } finally {
        this.checkPromise = null;
      }
    })();

    return this.checkPromise;
  }

  async downloadUpdate(): Promise<void> {
    const autoUpdater = getAutoUpdater();
    if (!app?.isPackaged || !autoUpdater) {
      throw new Error('تنزيل التحديثات متاح فقط في النسخة المثبتة الرسمية.');
    }
    this.updateState({ status: 'downloading', percent: 0, message: 'جارٍ بدء تنزيل التحديث...' });
    await autoUpdater.downloadUpdate();
  }

  async quitAndInstall(): Promise<void> {
    const autoUpdater = getAutoUpdater();
    if (!app?.isPackaged || !autoUpdater) {
      throw new Error('تثبيت التحديثات متاح فقط في النسخة المثبتة الرسمية.');
    }
    autoUpdater.quitAndInstall(false, true);
  }
}

export const updateService = new UpdateService();
