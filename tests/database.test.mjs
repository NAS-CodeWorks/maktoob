import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { MaktoobDatabase } from '../dist-electron/electron/database.js';

const contractInput = {
  type: 'بيع عقار', contractDate: '2026-09-02', status: 'pending_payment', amount: 1000000, currency: 'IQD', notes: 'اختبار تشغيلي', templateId: null,
  firstParty: { name: 'محمد سالم', phone: '07800000001', identifier: 'ID-1', address: 'الرمادي' },
  secondParty: { name: 'أحمد جاسم', phone: '07800000002', identifier: 'ID-2', address: 'الفلوجة' },
};

async function withDatabase(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'maktoob-test-'));
  const database = new MaktoobDatabase(path.join(directory, 'maktoob.sqlite'));
  try { await run(database, directory); } finally { database.close(); await rm(directory, { recursive: true, force: true }); }
}

test('creates, searches, updates, and deletes a contract atomically', async () => withDatabase(async (database) => {
  const created = database.createContract(contractInput);
  assert.match(created.contractNumber, /^MK-\d{4}-00001$/);
  assert.equal(created.firstParty.name, 'محمد سالم');
  assert.equal(database.listContracts('أحمد').length, 1);
  const updated = database.updateContract(created.id, { ...contractInput, type: 'بيع عام', amount: 1200000 });
  assert.equal(updated.type, 'بيع عام'); assert.equal(updated.amount, 1200000);
  database.deleteContract(created.id);
  assert.equal(database.listContracts().length, 0); assert.equal(database.listParties().length, 0);
}));

test('records payments and prevents overpayment', async () => withDatabase(async (database) => {
  const contract = database.createContract(contractInput);
  database.addPayment({ contractId: contract.id, amount: 250000, paymentDate: '2026-09-02', method: 'نقدي', note: 'دفعة أولى' });
  const current = database.getContract(contract.id);
  assert.equal(current.paidAmount, 250000); assert.equal(current.remainingAmount, 750000);
  assert.throws(() => database.updateContract(contract.id, { ...contractInput, amount: 200000 }), /أقل من مجموع الدفعات/);
  assert.throws(() => database.addPayment({ contractId: contract.id, amount: 800000, paymentDate: '2026-09-02', method: 'نقدي', note: '' }), /أكبر من المبلغ المتبقي/);
  assert.equal(database.listPayments('نقدي').length, 1);
}));

test('calculates dashboard and creates a valid backup', async () => withDatabase(async (database, directory) => {
  const contract = database.createContract(contractInput);
  database.addPayment({ contractId: contract.id, amount: 400000, paymentDate: '2026-09-02', method: 'تحويل', note: '' });
  const summary = database.dashboard();
  assert.equal(summary.totalContracts, 1); assert.equal(summary.receivedIQD, 400000); assert.equal(summary.pendingIQD, 600000);
  const backupPath = path.join(directory, 'backup.sqlite');
  await database.backup(backupPath);
  assert.equal(database.verifyBackup(backupPath), true);
}));

test('stores an immutable clause snapshot for each contract', async () => withDatabase(async (database) => {
  const defaultTemplate = database.listTemplates().find((template) => template.isDefault);
  assert.ok(defaultTemplate);
  const contract = database.createContract({ ...contractInput, templateId: defaultTemplate.id });
  assert.equal(contract.templateName, defaultTemplate.name);
  assert.deepEqual(contract.clauses, defaultTemplate.clauses);
  database.updateTemplate(defaultTemplate.id, { ...defaultTemplate, clauses: ['بند محدث للعقود الجديدة'] });
  assert.deepEqual(database.getContract(contract.id).clauses, defaultTemplate.clauses);
  const nextContract = database.createContract({ ...contractInput, templateId: defaultTemplate.id });
  assert.deepEqual(nextContract.clauses, ['بند محدث للعقود الجديدة']);
  database.updateTemplate(defaultTemplate.id, { ...defaultTemplate, name: 'قالب المكتب', clauses: ['بند محدث للعقود الجديدة'] });
  database.reopen();
  assert.deepEqual(database.listTemplates().map((template) => template.name), ['قالب المكتب']);
}));

test('keeps contract clauses after deleting a non-default template', async () => withDatabase(async (database) => {
  const template = database.createTemplate({ name: 'قالب مؤقت', description: '', clauses: ['بند محفوظ'], isDefault: false });
  const contract = database.createContract({ ...contractInput, templateId: template.id });
  database.deleteTemplate(template.id);
  const stored = database.getContract(contract.id);
  assert.equal(stored.templateId, null);
  assert.equal(stored.templateName, 'قالب مؤقت');
  assert.deepEqual(stored.clauses, ['بند محفوظ']);
}));

test('persists validated office identity settings', async () => withDatabase(async (database) => {
  assert.equal(database.getOfficeProfile().officeName, 'مكتب العقود');
  const profile = database.updateOfficeProfile({ officeName: 'مكتب الفرات للعقود', managerName: 'سفيان ناصر', phone: '07800000000', address: 'الرمادي', footerNote: 'وثيقة صادرة من مكتب الفرات' });
  assert.equal(profile.managerName, 'سفيان ناصر');
  database.reopen();
  assert.deepEqual(database.getOfficeProfile(), profile);
  assert.throws(() => database.updateOfficeProfile({ ...profile, officeName: '  ' }), /اسم المكتب/);
}));
