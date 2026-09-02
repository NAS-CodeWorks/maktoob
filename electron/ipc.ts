import { BrowserWindow, dialog, ipcMain } from 'electron';
import { copyFile, rm, writeFile } from 'node:fs/promises';
import type { Contract, ContractInput, ContractTemplateInput, OfficeProfile, PaymentInput } from '../shared/domain.js';
import { MaktoobDatabase } from './database.js';
import { LicenseManager } from './licensing.js';

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}

function money(value: number, currency: Contract['currency']) {
  return `${new Intl.NumberFormat(currency === 'IQD' ? 'ar-IQ' : 'en-US', { maximumFractionDigits: currency === 'IQD' ? 0 : 2 }).format(value)} ${currency === 'IQD' ? 'د.ع' : '$'}`;
}

function contractHtml(contract: Contract, profile: OfficeProfile) {
  const status = { draft: 'مسودة', completed: 'مكتمل', pending_payment: 'بانتظار الدفع' }[contract.status];
  const paymentRows = contract.payments.length
    ? contract.payments.map((payment) => `<tr><td>${escapeHtml(payment.paymentDate)}</td><td>${escapeHtml(payment.method)}</td><td>${money(payment.amount, contract.currency)}</td><td>${escapeHtml(payment.note)}</td></tr>`).join('')
    : '<tr><td colspan="4">لا توجد دفعات مسجلة</td></tr>';
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#17211d;font-size:12px;line-height:1.8}
    header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #b8954e;padding-bottom:14px;margin-bottom:24px}
    h1{font-size:24px;margin:0}.muted{color:#68736d}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}.box{border:1px solid #d9dfdb;padding:12px;border-radius:6px}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:14px}.party h2{font-size:15px;margin:0 0 8px;color:#795f2f}.party p{margin:3px 0}
    table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #d9dfdb;padding:8px;text-align:right}th{background:#f3f5f2}
    .summary{margin-top:20px;margin-right:auto;width:280px}.summary div{display:flex;justify-content:space-between;border-bottom:1px solid #e4e7e5;padding:6px 0}
    .clauses{margin-top:20px}.clauses h2{font-size:16px;color:#795f2f}.clauses ol{padding-right:22px}.clauses li{margin-bottom:9px}
    footer{margin-top:40px;padding-top:12px;border-top:1px solid #d9dfdb;text-align:center;color:#7b847f;font-size:10px}.office-contact{margin-top:5px}
  </style></head><body>
    <header><div><h1>${escapeHtml(profile.officeName)}</h1><div class="muted">${profile.managerName ? `المسؤول: ${escapeHtml(profile.managerName)}` : 'نظام إدارة العقود'}</div></div><div><strong>${escapeHtml(contract.contractNumber)}</strong><br><span class="muted">${escapeHtml(status)}</span></div></header>
    <div class="meta"><div class="box"><span class="muted">نوع العقد</span><br><strong>${escapeHtml(contract.type)}</strong></div><div class="box"><span class="muted">تاريخ العقد</span><br><strong>${escapeHtml(contract.contractDate)}</strong></div><div class="box"><span class="muted">قيمة العقد</span><br><strong>${money(contract.amount, contract.currency)}</strong></div></div>
    ${contract.propertyDetails ? `<section class="box property-details" style="margin:14px 0"><h2 style="font-size:14px;margin:0 0 10px;color:#795f2f">بيانات العقار / المبيع</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"><div><span class="muted">نوع العقار: </span><strong>${escapeHtml(contract.propertyDetails.propertyType || '—')}</strong></div><div><span class="muted">رقم القطعة: </span><strong>${escapeHtml(contract.propertyDetails.plotNumber || '—')}</strong></div><div><span class="muted">المقاطعة: </span><strong>${escapeHtml(contract.propertyDetails.districtNumber || '—')}</strong></div><div><span class="muted">المساحة: </span><strong>${escapeHtml(contract.propertyDetails.area || '—')}</strong></div><div><span class="muted">المحافظة: </span><strong>${escapeHtml(contract.propertyDetails.governorate || '—')}</strong></div><div><span class="muted">القضاء/الناحية: </span><strong>${escapeHtml(contract.propertyDetails.cityDistrict || '—')}</strong></div></div>${contract.propertyDetails.locationNotes ? `<div style="margin-top:8px;padding-top:6px;border-top:1px dashed #d9dfdb"><span class="muted">الموقع والحدود: </span>${escapeHtml(contract.propertyDetails.locationNotes)}</div>` : ''}</section>` : ''}
    ${contract.vehicleDetails ? `<section class="box vehicle-details" style="margin:14px 0"><h2 style="font-size:14px;margin:0 0 10px;color:#795f2f">بيانات المركبة / المبيع</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"><div><span class="muted">الماركة/الشركة: </span><strong>${escapeHtml(contract.vehicleDetails.make || '—')}</strong></div><div><span class="muted">الموديل/الطراز: </span><strong>${escapeHtml(contract.vehicleDetails.model || '—')}</strong></div><div><span class="muted">سنة الصنع: </span><strong>${escapeHtml(contract.vehicleDetails.year || '—')}</strong></div><div><span class="muted">اللون: </span><strong>${escapeHtml(contract.vehicleDetails.color || '—')}</strong></div><div><span class="muted">رقم الهيكل: </span><strong style="direction:ltr;display:inline-block">${escapeHtml(contract.vehicleDetails.chassisNumber || '—')}</strong></div><div><span class="muted">رقم اللوحة: </span><strong>${escapeHtml(contract.vehicleDetails.plateNumber || '—')}</strong></div></div></section>` : ''}
    <section class="parties"><div class="box party"><h2>الطرف الأول</h2><p><strong>${escapeHtml(contract.firstParty.name)}</strong></p><p>الهاتف: ${escapeHtml(contract.firstParty.phone || '—')}</p><p>الهوية: ${escapeHtml(contract.firstParty.identifier || '—')}</p><p>العنوان: ${escapeHtml(contract.firstParty.address || '—')}</p></div>
    <div class="box party"><h2>الطرف الثاني</h2><p><strong>${escapeHtml(contract.secondParty.name)}</strong></p><p>الهاتف: ${escapeHtml(contract.secondParty.phone || '—')}</p><p>الهوية: ${escapeHtml(contract.secondParty.identifier || '—')}</p><p>العنوان: ${escapeHtml(contract.secondParty.address || '—')}</p></div></section>
    ${contract.notes ? `<div class="box" style="margin-top:14px"><strong>ملاحظات العقد</strong><br>${escapeHtml(contract.notes)}</div>` : ''}
    ${contract.clauses.length ? `<section class="clauses"><h2>${escapeHtml(contract.templateName || 'بنود العقد')}</h2><ol>${contract.clauses.map((clause) => `<li>${escapeHtml(clause)}</li>`).join('')}</ol></section>` : ''}
    <table><thead><tr><th>تاريخ الدفعة</th><th>طريقة الدفع</th><th>المبلغ</th><th>ملاحظة</th></tr></thead><tbody>${paymentRows}</tbody></table>
    <div class="summary"><div><span>قيمة العقد</span><strong>${money(contract.amount, contract.currency)}</strong></div><div><span>المستلم</span><strong>${money(contract.paidAmount, contract.currency)}</strong></div><div><span>المتبقي</span><strong>${money(contract.remainingAmount, contract.currency)}</strong></div></div>
    <footer>${escapeHtml(profile.footerNote || 'أُنشئ بواسطة نظام مكتوب — NAS CodeWorks')}<div class="office-contact">${[profile.phone, profile.address].filter(Boolean).map(escapeHtml).join(' · ')}</div></footer></body></html>`;
}

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
