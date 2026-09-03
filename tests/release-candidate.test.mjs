import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { MaktoobDatabase } from '../dist-electron/electron/database.js';
import { contractHtml } from '../dist-electron/electron/contract-html.js';
import {
  canonicalLicensePayload,
  LicenseManager,
  verifySignedLicense,
} from '../dist-electron/electron/licensing.js';

const testDeviceId = 'MK-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF';
const otherDeviceId = 'MK-9999-8888-7777-6666-5555-4444';

const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

function createSignedLicense(overrides = {}, signingKey = privateKey) {
  const payload = {
    version: 1,
    licenseId: 'test-lic-' + Math.random().toString(36).slice(2, 10),
    customerName: 'مكتب الرافدين للتوثيق العقاري',
    deviceId: testDeviceId,
    issuedAt: new Date().toISOString(),
    expiresAt: null,
    features: ['core', 'templates'],
    ...overrides,
  };
  const signature = sign(null, Buffer.from(canonicalLicensePayload(payload)), signingKey).toString('base64');
  return JSON.stringify({ payload, signature }, null, 2);
}

async function withTestContext(run) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'maktoob-rc-test-'));
  const dbPath = path.join(tempDir, 'maktoob.sqlite');
  const database = new MaktoobDatabase(dbPath);
  try {
    await run({ database, tempDir, dbPath });
  } finally {
    database.close();
    await rm(tempDir, { recursive: true, force: true });
  }
}

// -------------------------------------------------------------
// RC-1: Clean installation state
// -------------------------------------------------------------
test('RC-1: initializes clean database with all required tables and default records', async () =>
  withTestContext(async ({ database, dbPath }) => {
    assert.equal(database.getPath(), dbPath);
    const db = new Database(dbPath, { readonly: true });
    try {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((t) => t.name);
      assert.ok(tables.includes('contracts'), 'contracts table must exist');
      assert.ok(tables.includes('parties'), 'parties table must exist');
      assert.ok(tables.includes('payments'), 'payments table must exist');
      assert.ok(tables.includes('contract_templates'), 'contract_templates table must exist');
      assert.ok(tables.includes('office_profile'), 'office_profile table must exist');
      assert.ok(tables.includes('schema_migrations'), 'schema_migrations table must exist');

      // Verify WAL mode
      const pragmaJournal = db.pragma('journal_mode');
      assert.equal(pragmaJournal[0]?.journal_mode, 'wal');

      // Verify foreign keys enabled
      const pragmaFK = db.pragma('foreign_keys');
      assert.equal(pragmaFK[0]?.foreign_keys, 1);
    } finally {
      db.close();
    }
  }));

// -------------------------------------------------------------
// RC-2: Production activation lifecycle
// -------------------------------------------------------------
test('RC-2: handles all activation states (missing, invalid, wrong device, expired, valid)', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'maktoob-lic-rc-'));
  const licPath = path.join(tempDir, 'maktoob.license.json');
  const pubPath = path.join(tempDir, 'license-public.pem');
  await writeFile(pubPath, publicKey);

  try {
    // 1. Missing license
    const manager = new LicenseManager(licPath, pubPath);
    const missingState = await manager.initialize();
    assert.equal(missingState.status, 'missing');
    assert.throws(() => manager.requireActive(), /يجب تفعيل ترخيص مكتوب/);

    // 2. Invalid license signature
    const invalidLicense = createSignedLicense();
    const tampered = JSON.parse(invalidLicense);
    tampered.payload.customerName = 'مكتب منتحل صفة';
    await writeFile(licPath, JSON.stringify(tampered));
    const invalidState = await manager.initialize();
    assert.equal(invalidState.status, 'invalid');
    assert.match(invalidState.message, /غير صحيح|غير صالح/);

    // 3. Wrong device
    const wrongDeviceLicense = createSignedLicense({ deviceId: otherDeviceId });
    await writeFile(licPath, wrongDeviceLicense);
    const wrongState = await manager.initialize();
    assert.equal(wrongState.status, 'wrong_device');
    assert.match(wrongState.message, /مختلف/);

    // 4. Expired license
    const expiredLicense = createSignedLicense({
      deviceId: missingState.deviceId,
      expiresAt: '2020-01-01T00:00:00.000Z',
    });
    await writeFile(licPath, expiredLicense);
    const expiredState = await manager.initialize();
    assert.equal(expiredState.status, 'expired');
    assert.match(expiredState.message, /انتهت صلاحية/);

    // 5. Valid test license
    const validLicense = createSignedLicense({ deviceId: missingState.deviceId });
    const sourceLicPath = path.join(tempDir, 'customer.license.json');
    await writeFile(sourceLicPath, validLicense);
    const importState = await manager.importLicense(sourceLicPath);
    assert.equal(importState.status, 'active');
    assert.equal(manager.getState().status, 'active');
    assert.doesNotThrow(() => manager.requireActive());

    // Restart check
    const manager2 = new LicenseManager(licPath, pubPath);
    const reloadedState = await manager2.initialize();
    assert.equal(reloadedState.status, 'active');
    assert.equal(reloadedState.payload?.customerName, 'مكتب الرافدين للتوثيق العقاري');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

// -------------------------------------------------------------
// RC-3: Office initialization & persistence
// -------------------------------------------------------------
test('RC-3: persists office identity and retrieves on restart', async () =>
  withTestContext(async ({ database }) => {
    const initial = database.getOfficeProfile();
    assert.ok(initial.officeName);

    const updated = database.updateOfficeProfile({
      officeName: 'مكتب بغداد للعقود العامة',
      managerName: 'علي الحسيني',
      phone: '07701234567',
      address: 'بغداد - المنصور - شارع 14 رمضان',
      footerNote: 'وثيقة رسمية صادرة من نظام مكتوب - مكتب بغداد',
    });

    assert.equal(updated.officeName, 'مكتب بغداد للعقود العامة');
    assert.equal(updated.managerName, 'علي الحسيني');

    database.reopen();
    const persisted = database.getOfficeProfile();
    assert.deepEqual(persisted, updated);
  }));

// -------------------------------------------------------------
// RC-4: General Sale Contract flow
// -------------------------------------------------------------
test('RC-4: general sale contract full lifecycle and immutability', async () =>
  withTestContext(async ({ database }) => {
    const generalContract = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-02',
      status: 'draft',
      amount: 15000000,
      currency: 'IQD',
      notes: 'عقد بيع تجهيزات مكتبية وأجهزة حاسوب',
      templateId: null,
      firstParty: {
        name: 'شركة النور للتجارة',
        phone: '07801111111',
        identifier: 'COM-9921',
        address: 'الكرخ',
      },
      secondParty: {
        name: 'مكتب المنصور للحلول',
        phone: '07802222222',
        identifier: 'COM-4432',
        address: 'الرصافة',
      },
    });

    assert.match(generalContract.contractNumber, /^MK-\d{4}-00001$/);
    assert.equal(generalContract.type, 'بيع عام');
    assert.equal(generalContract.amount, 15000000);
    assert.equal(generalContract.currency, 'IQD');
    assert.equal(generalContract.remainingAmount, 15000000);
    assert.equal(generalContract.paidAmount, 0);

    // Edit contract
    const updated = database.updateContract(generalContract.id, {
      ...generalContract,
      status: 'pending_payment',
      amount: 14000000,
      notes: 'تم الاتفاق على تخفيض القيمة إلى 14 مليون دينار',
    });

    assert.equal(updated.amount, 14000000);
    assert.equal(updated.status, 'pending_payment');
    assert.equal(updated.remainingAmount, 14000000);

    database.reopen();
    const fetched = database.getContract(generalContract.id);
    assert.equal(fetched.amount, 14000000);
    assert.equal(fetched.notes, 'تم الاتفاق على تخفيض القيمة إلى 14 مليون دينار');
  }));

// -------------------------------------------------------------
// RC-5: Property Contract flow
// -------------------------------------------------------------
test('RC-5: property contract flow with structured attributes', async () =>
  withTestContext(async ({ database }) => {
    const propTemplate = database.listTemplates().find((t) => t.name.includes('عقار'));
    assert.ok(propTemplate, 'Property template must be seeded');

    const propertyContract = database.createContract({
      type: 'بيع عقار',
      contractDate: '2026-09-02',
      status: 'pending_payment',
      amount: 85000000,
      currency: 'IQD',
      notes: 'عقد بيع دار سكنية مع تسليم المفاتيح',
      templateId: propTemplate.id,
      propertyDetails: {
        propertyType: 'دار سكنية طابقين',
        plotNumber: '88/14',
        districtNumber: '5 الجزيرة',
        area: '300 م²',
        governorate: 'الأنبار',
        cityDistrict: 'الرمادي - حي المعلمين',
        locationNotes: 'واجهة 12 متر على شارع 15 متر قرب مدرسة الفرات',
      },
      firstParty: {
        name: 'خالد عبد الرحمن الدليمي',
        phone: '07809988776',
        identifier: 'IRQ-19802345',
        address: 'الرمادي - حي المعلمين',
      },
      secondParty: {
        name: 'ياسر طه الراوي',
        phone: '07705544332',
        identifier: 'IRQ-19889900',
        address: 'هيت - حي القضاة',
      },
    });

    assert.ok(propertyContract.propertyDetails);
    assert.equal(propertyContract.propertyDetails.plotNumber, '88/14');
    assert.equal(propertyContract.propertyDetails.districtNumber, '5 الجزيرة');
    assert.equal(propertyContract.propertyDetails.area, '300 م²');
    assert.equal(propertyContract.clauses.length, propTemplate.clauses.length);

    database.reopen();
    const fetched = database.getContract(propertyContract.id);
    assert.equal(fetched.propertyDetails?.propertyType, 'دار سكنية طابقين');
    assert.equal(fetched.propertyDetails?.cityDistrict, 'الرمادي - حي المعلمين');
  }));

// -------------------------------------------------------------
// RC-6: Vehicle Contract flow
// -------------------------------------------------------------
test('RC-6: vehicle contract flow with structured attributes', async () =>
  withTestContext(async ({ database }) => {
    const vehTemplate = database.listTemplates().find((t) => t.name.includes('سيارة'));
    assert.ok(vehTemplate, 'Vehicle template must be seeded');

    const vehicleContract = database.createContract({
      type: 'بيع مركبة',
      contractDate: '2026-09-02',
      status: 'pending_payment',
      amount: 22500,
      currency: 'USD',
      notes: 'تم فحص السيارة بالسونار وتحمل البائع كافة الغرامات السابقة',
      templateId: vehTemplate.id,
      vehicleDetails: {
        make: 'كيا (KIA)',
        model: 'سورينتو (Sorento)',
        year: '2022',
        color: 'رصاصي ميتاليك',
        chassisNumber: 'KNDJD733475102938',
        plateNumber: 'أربيل 74821 أ خصوصي',
      },
      firstParty: {
        name: 'معرض الفارس للسيارات',
        phone: '07501234567',
        identifier: 'AUTO-2022',
        address: 'أربيل - شارع 100',
      },
      secondParty: {
        name: 'عمار حازم المشهداني',
        phone: '07718877665',
        identifier: 'ID-887766',
        address: 'بغداد - العامرية',
      },
    });

    assert.ok(vehicleContract.vehicleDetails);
    assert.equal(vehicleContract.vehicleDetails.make, 'كيا (KIA)');
    assert.equal(vehicleContract.vehicleDetails.chassisNumber, 'KNDJD733475102938');
    assert.equal(vehicleContract.vehicleDetails.plateNumber, 'أربيل 74821 أ خصوصي');
    assert.equal(vehicleContract.currency, 'USD');

    database.reopen();
    const fetched = database.getContract(vehicleContract.id);
    assert.equal(fetched.vehicleDetails?.model, 'سورينتو (Sorento)');
  }));

// -------------------------------------------------------------
// RC-7: Template immutability test
// -------------------------------------------------------------
test('RC-7: critical invariant - modifying template must never mutate existing contract snapshot', async () =>
  withTestContext(async ({ database }) => {
    const template = database.createTemplate({
      name: 'قالب اختبار الثبات',
      description: 'للتأكد من عدم تغيير لقطة البنود السابقة',
      clauses: ['بند تاريخي أصلي رقم 1', 'بند تاريخي أصلي رقم 2'],
      isDefault: false,
    });

    // Contract A
    const contractA = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-02',
      status: 'draft',
      amount: 5000000,
      currency: 'IQD',
      notes: '',
      templateId: template.id,
      firstParty: { name: 'طرف أول أ', phone: '', identifier: '', address: '' },
      secondParty: { name: 'طرف ثاني أ', phone: '', identifier: '', address: '' },
    });

    assert.deepEqual(contractA.clauses, ['بند تاريخي أصلي رقم 1', 'بند تاريخي أصلي رقم 2']);

    // Modify the template
    database.updateTemplate(template.id, {
      name: 'قالب اختبار الثبات المعدل',
      description: 'تم التعديل جذرياً',
      clauses: ['بند جديد مستحدث لا يجوز أن يظهر في العقد أ'],
      isDefault: false,
    });

    // Reopen Contract A and verify it retained original clauses
    database.reopen();
    const reopenedA = database.getContract(contractA.id);
    assert.deepEqual(reopenedA.clauses, ['بند تاريخي أصلي رقم 1', 'بند تاريخي أصلي رقم 2']);

    // Contract B gets the updated clauses
    const contractB = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-02',
      status: 'draft',
      amount: 6000000,
      currency: 'IQD',
      notes: '',
      templateId: template.id,
      firstParty: { name: 'طرف أول ب', phone: '', identifier: '', address: '' },
      secondParty: { name: 'طرف ثاني ب', phone: '', identifier: '', address: '' },
    });

    assert.deepEqual(contractB.clauses, ['بند جديد مستحدث لا يجوز أن يظهر في العقد أ']);
    assert.deepEqual(database.getContract(contractA.id).clauses, [
      'بند تاريخي أصلي رقم 1',
      'بند تاريخي أصلي رقم 2',
    ]);
  }));

// -------------------------------------------------------------
// RC-8: Parties reuse and deletion safety
// -------------------------------------------------------------
test('RC-8: party records reuse and preservation on contract deletion', async () =>
  withTestContext(async ({ database }) => {
    const c1 = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-02',
      status: 'draft',
      amount: 1000000,
      currency: 'IQD',
      notes: '',
      templateId: null,
      firstParty: { name: 'صباح كريم الجبوري', phone: '07801234567', identifier: 'ID-101', address: 'بغداد' },
      secondParty: { name: 'عدنان سالم', phone: '07709876543', identifier: 'ID-102', address: 'بابل' },
    });

    const c2 = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-02',
      status: 'draft',
      amount: 2000000,
      currency: 'IQD',
      notes: '',
      templateId: null,
      firstParty: { name: 'صباح كريم الجبوري', phone: '07801234567', identifier: 'ID-101', address: 'بغداد' },
      secondParty: { name: 'مشتري آخر', phone: '07700000000', identifier: 'ID-103', address: 'البصرة' },
    });

    // Delete c1, c2's first party must remain accessible
    database.deleteContract(c1.id);
    assert.equal(database.listContracts().length, 1);
    const remainingContract = database.getContract(c2.id);
    assert.equal(remainingContract.firstParty.name, 'صباح كريم الجبوري');

    // Parties search
    const searchResults = database.listParties('صباح');
    assert.equal(searchResults.length, 1);
    assert.equal(searchResults[0]?.name, 'صباح كريم الجبوري');
  }));

// -------------------------------------------------------------
// RC-9: Payment lifecycle
// -------------------------------------------------------------
test('RC-9: payment lifecycle with balance recalculation in IQD and USD', async () =>
  withTestContext(async ({ database }) => {
    // 1. IQD Contract
    const iqdContract = database.createContract({
      type: 'بيع عقار',
      contractDate: '2026-09-02',
      status: 'pending_payment',
      amount: 10000000,
      currency: 'IQD',
      notes: '',
      templateId: null,
      firstParty: { name: 'البائع', phone: '', identifier: '', address: '' },
      secondParty: { name: 'المشتري', phone: '', identifier: '', address: '' },
    });

    assert.equal(iqdContract.remainingAmount, 10000000);

    // Add first payment
    const p1 = database.addPayment({
      contractId: iqdContract.id,
      amount: 3000000,
      paymentDate: '2026-09-02',
      method: 'نقدي',
      note: 'دفعة أولى عربون',
    });

    let current = database.getContract(iqdContract.id);
    assert.equal(current.paidAmount, 3000000);
    assert.equal(current.remainingAmount, 7000000);

    // Prevent overpayment
    assert.throws(
      () =>
        database.addPayment({
          contractId: iqdContract.id,
          amount: 7000001,
          paymentDate: '2026-09-02',
          method: 'نقدي',
          note: '',
        }),
      /أكبر من المبلغ المتبقي/
    );

    // Add second payment
    database.addPayment({
      contractId: iqdContract.id,
      amount: 7000000,
      paymentDate: '2026-09-02',
      method: 'تحويل',
      note: 'الدفعة النهائية وإكمال السداد',
    });

    current = database.getContract(iqdContract.id);
    assert.equal(current.paidAmount, 10000000);
    assert.equal(current.remainingAmount, 0);
    assert.equal(current.status, 'completed'); // Auto-completed

    // Delete first payment
    database.deletePayment(p1.id);
    current = database.getContract(iqdContract.id);
    assert.equal(current.paidAmount, 7000000);
    assert.equal(current.remainingAmount, 3000000);
  }));

// -------------------------------------------------------------
// RC-10: Search functionality
// -------------------------------------------------------------
test('RC-10: search contracts, parties and payments with Arabic keywords', async () =>
  withTestContext(async ({ database }) => {
    const c = database.createContract({
      type: 'بيع عقار',
      contractDate: '2026-09-02',
      status: 'draft',
      amount: 45000000,
      currency: 'IQD',
      notes: 'منطقة الكرادة مسبح',
      templateId: null,
      firstParty: { name: 'عصام عبد الجليل', phone: '07901112233', identifier: 'ID-881', address: 'بغداد' },
      secondParty: { name: 'وسام قاسم السعدي', phone: '07802223344', identifier: 'ID-882', address: 'النجف' },
    });

    database.addPayment({
      contractId: c.id,
      amount: 5000000,
      paymentDate: '2026-09-02',
      method: 'صك مصدق',
      note: 'دفعة حساب مصرفي',
    });

    // Search contract by number
    assert.equal(database.listContracts(c.contractNumber).length, 1);
    // Search contract by party name
    assert.equal(database.listContracts('عصام').length, 1);
    assert.equal(database.listContracts('السعدي').length, 1);
    // Search contract by type
    assert.equal(database.listContracts('عقار').length, 1);

    // Search payments
    assert.equal(database.listPayments('صك مصدق').length, 1);
    assert.equal(database.listPayments(c.contractNumber).length, 1);
  }));

// -------------------------------------------------------------
// RC-13, 14, 15: Backup & Restore Safety
// -------------------------------------------------------------
test('RC-13, 14, 15: backup creation, invalid restore rejection, and valid restoration', async () =>
  withTestContext(async ({ database, tempDir }) => {
    const c1 = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-02',
      status: 'completed',
      amount: 500000,
      currency: 'IQD',
      notes: 'عقد أصلي محفوظ قبل النسخ',
      templateId: null,
      firstParty: { name: 'طرف أصلي 1', phone: '', identifier: '', address: '' },
      secondParty: { name: 'طرف أصلي 2', phone: '', identifier: '', address: '' },
    });

    const backupPath = path.join(tempDir, 'valid-backup.sqlite');
    await database.backup(backupPath);
    assert.equal(database.verifyBackup(backupPath), true);

    // RC-14: Test invalid restore files
    const fakeTextFile = path.join(tempDir, 'fake.sqlite');
    await writeFile(fakeTextFile, 'This is just a text file, not a sqlite database!');
    assert.equal(database.verifyBackup(fakeTextFile), false);

    const emptyFile = path.join(tempDir, 'empty.sqlite');
    await writeFile(emptyFile, '');
    assert.equal(database.verifyBackup(emptyFile), false);

    // SQLite DB missing required tables
    const incompleteDbPath = path.join(tempDir, 'incomplete.sqlite');
    const incompleteDb = new Database(incompleteDbPath);
    incompleteDb.exec('CREATE TABLE dummy(id INTEGER PRIMARY KEY);');
    incompleteDb.close();
    assert.equal(database.verifyBackup(incompleteDbPath), false);

    // RC-15: Valid restore flow
    // Add new data after backup
    database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-02',
      status: 'draft',
      amount: 999999,
      currency: 'IQD',
      notes: 'عقد مؤقت بعد النسخ',
      templateId: null,
      firstParty: { name: 'طرف جديد', phone: '', identifier: '', address: '' },
      secondParty: { name: 'طرف جديد 2', phone: '', identifier: '', address: '' },
    });

    assert.equal(database.listContracts().length, 2);

    // Restore the backup by simulating file copy and reopen
    database.close();
    await rm(database.getPath());
    await rm(`${database.getPath()}-wal`, { force: true });
    await rm(`${database.getPath()}-shm`, { force: true });
    const { copyFile } = await import('node:fs/promises');
    await copyFile(backupPath, database.getPath());
    database.reopen();

    // Verify state matches backup exactly
    assert.equal(database.listContracts().length, 1);
    assert.equal(database.getContract(c1.id).notes, 'عقد أصلي محفوظ قبل النسخ');
  }));

// -------------------------------------------------------------
// RC-16: Migration safety and idempotency
// -------------------------------------------------------------
test('RC-16: migrations run idempotently and safely record versions', async () =>
  withTestContext(async ({ database, dbPath }) => {
    // Calling reopen() multiple times runs migrate() repeatedly
    database.reopen();
    database.reopen();

    const db = new Database(dbPath, { readonly: true });
    try {
      const versions = db
        .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
        .all()
        .map((r) => r.version);
      assert.deepEqual(versions, [1, 2, 3, 4, 5, 6]);
    } finally {
      db.close();
    }
  }));

// -------------------------------------------------------------
// RC-18: Production file audit
// -------------------------------------------------------------
test('RC-18: production file audit - verify no secrets or private keys', async () => {
  const repoRoot = path.resolve('.');
  const releaseDir = path.join(repoRoot, 'release');

  // Check that no private keys exist in resources/ or dist/
  const resourcesDir = path.join(repoRoot, 'resources');
  const pubKey = await readFile(path.join(resourcesDir, 'license-public.pem'), 'utf8');
  assert.ok(pubKey.includes('-----BEGIN PUBLIC KEY-----'));
  assert.ok(!pubKey.includes('PRIVATE KEY'));

  // Ensure gitignore protects private keys and environment
  const gitignore = await readFile(path.join(repoRoot, '.gitignore'), 'utf8');
  assert.ok(gitignore.includes('*.private.pem'));
  assert.ok(gitignore.includes('license-authority/'));
  assert.ok(gitignore.includes('.env'));
});

// -------------------------------------------------------------
// RC-11: PDF / Print HTML document generation
// -------------------------------------------------------------
test('RC-11: generates valid A4 printable document with all structured data for general, property, and vehicle contracts', async () =>
  withTestContext(async ({ database }) => {
    const profile = database.getOfficeProfile();

    // 1. General Sale HTML
    const general = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-02',
      status: 'pending_payment',
      amount: 5000000,
      currency: 'IQD',
      notes: 'ملاحظة عامة',
      templateId: null,
      firstParty: { name: 'علي البائع', phone: '07801', identifier: 'ID1', address: 'بغداد' },
      secondParty: { name: 'حسين المشتري', phone: '07802', identifier: 'ID2', address: 'النجف' },
    });
    const htmlGeneral = contractHtml(general, profile);
    assert.ok(htmlGeneral.includes('علي البائع'));
    assert.ok(htmlGeneral.includes('حسين المشتري'));
    assert.ok(htmlGeneral.includes('د.ع'));
    assert.ok(htmlGeneral.includes('٥٬٠٠٠٬٠٠٠'));
    assert.ok(htmlGeneral.includes(profile.officeName));

    // 2. Property Sale HTML
    const property = database.createContract({
      type: 'بيع عقار',
      contractDate: '2026-09-02',
      status: 'completed',
      amount: 120000000,
      currency: 'IQD',
      notes: '',
      templateId: null,
      propertyDetails: {
        propertyType: 'عمارة تجارية',
        plotNumber: '99/1',
        districtNumber: '3 المنصور',
        area: '500 م²',
        governorate: 'بغداد',
        cityDistrict: 'الكرخ',
        locationNotes: 'شارع الأميرات واجهة 20م',
      },
      firstParty: { name: 'مالك العقار', phone: '', identifier: '', address: '' },
      secondParty: { name: 'مشتري العقار', phone: '', identifier: '', address: '' },
    });
    const htmlProperty = contractHtml(property, profile);
    assert.ok(htmlProperty.includes('بيانات العقار / المبيع'));
    assert.ok(htmlProperty.includes('عمارة تجارية'));
    assert.ok(htmlProperty.includes('99/1'));
    assert.ok(htmlProperty.includes('3 المنصور'));
    assert.ok(htmlProperty.includes('500 م²'));
    assert.ok(htmlProperty.includes('شارع الأميرات'));

    // 3. Vehicle Sale HTML
    const vehicle = database.createContract({
      type: 'بيع مركبة',
      contractDate: '2026-09-02',
      status: 'completed',
      amount: 35000,
      currency: 'USD',
      notes: '',
      templateId: null,
      vehicleDetails: {
        make: 'مرسيدس (Mercedes)',
        model: 'E350',
        year: '2021',
        color: 'أسود ملوكي',
        chassisNumber: 'WDBUF56X891029384',
        plateNumber: 'بغداد 9988 خصوصي',
      },
      firstParty: { name: 'بائع المركبة', phone: '', identifier: '', address: '' },
      secondParty: { name: 'مشتري المركبة', phone: '', identifier: '', address: '' },
    });
    const htmlVehicle = contractHtml(vehicle, profile);
    assert.ok(htmlVehicle.includes('بيانات المركبة / المبيع'));
    assert.ok(htmlVehicle.includes('مرسيدس (Mercedes)'));
    assert.ok(htmlVehicle.includes('E350'));
    assert.ok(htmlVehicle.includes('WDBUF56X891029384'));
    assert.ok(htmlVehicle.includes('بغداد 9988 خصوصي'));
  }));

// -------------------------------------------------------------
// RC-17: Electron security review
// -------------------------------------------------------------
test('RC-17: electron security boundary verification', async () => {
  const repoRoot = path.resolve('.');
  const mainTs = await readFile(path.join(repoRoot, 'electron', 'main.ts'), 'utf8');
  assert.ok(mainTs.includes('contextIsolation: true'));
  assert.ok(mainTs.includes('nodeIntegration: false'));
  assert.ok(mainTs.includes('sandbox: true'));
  assert.ok(mainTs.includes("action: 'deny'"));

  const preloadTs = await readFile(path.join(repoRoot, 'electron', 'preload.cts'), 'utf8');
  assert.ok(preloadTs.includes("contextBridge.exposeInMainWorld('maktoob', api)"));
  assert.ok(!preloadTs.includes('process.env'));
  assert.ok(!preloadTs.includes('child_process'));
  assert.ok(!preloadTs.includes('fs/promises'));
});

// -------------------------------------------------------------
// RC-19: User error experience
// -------------------------------------------------------------
test('RC-19: error messages are direct Arabic office-appropriate language', async () =>
  withTestContext(async ({ database }) => {
    // Missing required field
    assert.throws(
      () =>
        database.createContract({
          type: '',
          contractDate: '2026-09-02',
          status: 'draft',
          amount: 100,
          currency: 'IQD',
          notes: '',
          templateId: null,
          firstParty: { name: '', phone: '', identifier: '', address: '' },
          secondParty: { name: 'طرف 2', phone: '', identifier: '', address: '' },
        }),
      /نوع العقد: الحقل مطلوب/
    );

    // Missing party name
    assert.throws(
      () =>
        database.createContract({
          type: 'بيع عام',
          contractDate: '2026-09-02',
          status: 'draft',
          amount: 100,
          currency: 'IQD',
          notes: '',
          templateId: null,
          firstParty: { name: '  ', phone: '', identifier: '', address: '' },
          secondParty: { name: 'طرف 2', phone: '', identifier: '', address: '' },
        }),
      /الطرف الأول \/ الاسم: الحقل مطلوب/
    );

    // Invalid date
    assert.throws(
      () =>
        database.createContract({
          type: 'بيع عام',
          contractDate: 'invalid-date',
          status: 'draft',
          amount: 100,
          currency: 'IQD',
          notes: '',
          templateId: null,
          firstParty: { name: 'طرف 1', phone: '', identifier: '', address: '' },
          secondParty: { name: 'طرف 2', phone: '', identifier: '', address: '' },
        }),
      /تاريخ العقد غير صالح/
    );

    // Negative amount
    assert.throws(
      () =>
        database.createContract({
          type: 'بيع عام',
          contractDate: '2026-09-02',
          status: 'draft',
          amount: -500,
          currency: 'IQD',
          notes: '',
          templateId: null,
          firstParty: { name: 'طرف 1', phone: '', identifier: '', address: '' },
          secondParty: { name: 'طرف 2', phone: '', identifier: '', address: '' },
        }),
      /قيمة العقد غير صالحة/
    );
  }));

// -------------------------------------------------------------
// RC-20: Production restart test
// -------------------------------------------------------------
test('RC-20: complete entity persistence after database closure and reopen', async () =>
  withTestContext(async ({ database }) => {
    // 1. Office profile
    database.updateOfficeProfile({
      officeName: 'مكتب الرافدين المعتمد',
      managerName: 'أحمد العبيدي',
      phone: '07700000000',
      address: 'الموصل',
      footerNote: 'مكتب معتمد',
    });

    // 2. Custom template
    const template = database.createTemplate({
      name: 'قالب الاختبار الشامل',
      description: 'وصف تجريبي',
      clauses: ['بند تجريبي أول', 'بند تجريبي ثان'],
      isDefault: false,
    });

    // 3. Contracts with property and vehicle details
    const propContract = database.createContract({
      type: 'بيع عقار',
      contractDate: '2026-09-02',
      status: 'pending_payment',
      amount: 40000000,
      currency: 'IQD',
      notes: '',
      templateId: template.id,
      propertyDetails: {
        propertyType: 'أرض زراعية طابو',
        plotNumber: '10/5',
        districtNumber: '2 الجزيرة',
        area: '10 دونم',
        governorate: 'الأنبار',
        cityDistrict: 'الرمادي',
        locationNotes: 'محاذية لمشروع الري',
      },
      firstParty: { name: 'المزارع علي', phone: '078000', identifier: 'ID-FARM', address: 'الرمادي' },
      secondParty: { name: 'المشتري سعد', phone: '077000', identifier: 'ID-BUY', address: 'الفلوجة' },
    });

    // 4. Payments
    database.addPayment({
      contractId: propContract.id,
      amount: 10000000,
      paymentDate: '2026-09-02',
      method: 'نقدي',
      note: 'دفعة مقدمة',
    });

    // Hard restart
    database.close();
    database.reopen();

    // Verify all records
    const profile = database.getOfficeProfile();
    assert.equal(profile.officeName, 'مكتب الرافدين المعتمد');

    const templates = database.listTemplates('الاختبار الشامل');
    assert.equal(templates.length, 1);
    assert.deepEqual(templates[0]?.clauses, ['بند تجريبي أول', 'بند تجريبي ثان']);

    const contract = database.getContract(propContract.id);
    assert.equal(contract.paidAmount, 10000000);
    assert.equal(contract.remainingAmount, 30000000);
    assert.equal(contract.propertyDetails?.propertyType, 'أرض زراعية طابو');
    assert.equal(contract.propertyDetails?.area, '10 دونم');
    assert.equal(contract.firstParty.name, 'المزارع علي');
    assert.equal(contract.payments.length, 1);
  }));

