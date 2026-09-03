import { BrowserWindow, dialog, ipcMain } from 'electron';
import { copyFile, rm, writeFile } from 'node:fs/promises';
import type { ContractInput, ContractTemplateInput, OfficeProfile, PaymentInput } from '../shared/domain.js';
import { MaktoobDatabase } from './database.js';
import { contractHtml } from './contract-html.js';
import { LicenseManager } from './licensing.js';

export function registerIpc(database: MaktoobDatabase, licenseManager: LicenseManager) {
  const licensed = <T>(operation: () => T) => { licenseManager.requireActive(); return operation(); };
  ipcMain.handle('license:status', () => licenseManager.getState());
  ipcMain.handle('license:import', async () => {
    const selection = await dialog.showOpenDialog({ title: 'اختيار ملف ترخيص مكتوب', properties: ['openFile'], filters: [{ name: 'Maktoob license', extensions: ['json', 'license'] }] });
    if (selection.canceled || !selection.filePaths[0]) return licenseManager.getState();
    return licenseManager.importLicense(selection.filePaths[0]);
  });
  ipcMain.handle('dashboard:get', () => licensed(() => database.dashboard()));
  ipcMain.handle('contracts:list', (_event, query?: string) => licensed(() => database.listContracts(query)));
  ipcMain.handle('contracts:get', (_event, id: number) => licensed(() => database.getContract(id)));
  ipcMain.handle('contracts:create', (_event, input: ContractInput) => licensed(() => database.createContract(input)));
  ipcMain.handle('contracts:update', (_event, id: number, input: ContractInput) => licensed(() => database.updateContract(id, input)));
  ipcMain.handle('contracts:delete', (_event, id: number) => licensed(() => database.deleteContract(id)));
  ipcMain.handle('templates:list', (_event, query?: string) => licensed(() => database.listTemplates(query)));
  ipcMain.handle('templates:create', (_event, input: ContractTemplateInput) => licensed(() => database.createTemplate(input)));
  ipcMain.handle('templates:update', (_event, id: number, input: ContractTemplateInput) => licensed(() => database.updateTemplate(id, input)));
  ipcMain.handle('templates:delete', (_event, id: number) => licensed(() => database.deleteTemplate(id)));
  ipcMain.handle('office:get', () => licensed(() => database.getOfficeProfile()));
  ipcMain.handle('office:update', (_event, profile: OfficeProfile) => licensed(() => database.updateOfficeProfile(profile)));
  ipcMain.handle('parties:list', (_event, query?: string) => licensed(() => database.listParties(query)));
  ipcMain.handle('payments:list', (_event, query?: string) => licensed(() => database.listPayments(query)));
  ipcMain.handle('payments:add', (_event, input: PaymentInput) => licensed(() => database.addPayment(input)));
  ipcMain.handle('payments:delete', (_event, id: number) => licensed(() => database.deletePayment(id)));

  ipcMain.handle('backup:create', async () => {
    licenseManager.requireActive();
    const selection = await dialog.showSaveDialog({
      title: 'حفظ نسخة احتياطية',
      defaultPath: `maktoob-backup-${new Date().toISOString().slice(0, 10)}.sqlite`,
      filters: [{ name: 'Maktoob backup', extensions: ['sqlite'] }],
    });
    if (selection.canceled || !selection.filePath) return { ok: false as const, message: 'تم إلغاء العملية' };
    await database.backup(selection.filePath);
    return { ok: true as const, path: selection.filePath };
  });

  ipcMain.handle('backup:restore', async () => {
    licenseManager.requireActive();
    const selection = await dialog.showOpenDialog({ title: 'استعادة نسخة احتياطية', properties: ['openFile'], filters: [{ name: 'Maktoob backup', extensions: ['sqlite', 'db'] }] });
    if (selection.canceled || !selection.filePaths[0]) return { ok: false as const, message: 'تم إلغاء العملية' };
    const source = selection.filePaths[0];
    if (!database.verifyBackup(source)) return { ok: false as const, message: 'الملف المحدد ليس نسخة مكتوب صالحة' };
    if (source === database.getPath()) return { ok: false as const, message: 'اختر ملف نسخة احتياطية منفصلاً عن قاعدة البيانات الحالية' };
    const rollbackPath = `${database.getPath()}.before-restore`;
    await database.backup(rollbackPath);
    database.close();
    try {
      await copyFile(source, database.getPath());
      await Promise.all([
        rm(`${database.getPath()}-wal`, { force: true }),
        rm(`${database.getPath()}-shm`, { force: true }),
      ]);
    } catch (error) {
      await copyFile(rollbackPath, database.getPath());
      throw error;
    } finally {
      database.reopen();
    }
    return { ok: true as const, path: source };
  });

  ipcMain.handle('contracts:pdf', async (_event, id: number) => {
    licenseManager.requireActive();
    const contract = database.getContract(id);
    const selection = await dialog.showSaveDialog({
      title: 'حفظ نسخة PDF',
      defaultPath: `${contract.contractNumber}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (selection.canceled || !selection.filePath) return { ok: false as const, message: 'تم إلغاء العملية' };
    const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true } });
    try {
      await window.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(contractHtml(contract, database.getOfficeProfile()))}`);
      const pdf = await window.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
      await writeFile(selection.filePath, pdf);
      return { ok: true as const, path: selection.filePath };
    } finally {
      window.destroy();
    }
  });

  ipcMain.handle('contracts:print', async (_event, id: number) => {
    licenseManager.requireActive();
    const contract = database.getContract(id);
    const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true } });
    try {
      await window.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(contractHtml(contract, database.getOfficeProfile()))}`);
      return await new Promise<{ ok: boolean; message?: string }>((resolve) => {
        window.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
          if (success) resolve({ ok: true as const });
          else resolve({ ok: false as const, message: failureReason || 'تم إلغاء الطباعة' });
        });
      });
    } finally {
      setTimeout(() => { if (!window.isDestroyed()) window.destroy(); }, 20000);
    }
  });
}
