import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MaktoobDatabase } from '../dist-electron/electron/database.js';
import { contractHtml } from '../dist-electron/electron/contract-html.js';

function createTempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maktoob-v11-test-'));
  const dbPath = path.join(dir, 'maktoob.db');
  const database = new MaktoobDatabase(dbPath);
  return {
    database,
    cleanup: () => {
      database.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

const mockPhoto1 = 'data:image/jpeg;base64,' + Buffer.from('photo-first-party').toString('base64');
const mockPhoto2 = 'data:image/jpeg;base64,' + Buffer.from('photo-second-party').toString('base64');
const mockLogo = 'data:image/png;base64,' + Buffer.from('office-logo-png').toString('base64');

test('party photos: saves and retrieves first and second party photos in contract', () => {
  const { database, cleanup } = createTempDb();
  try {
    const contract = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-03',
      status: 'completed',
      amount: 5000000,
      currency: 'IQD',
      notes: 'عقد مع صور الأطراف',
      templateId: null,
      firstParty: {
        name: 'سفيان علي',
        phone: '07701112233',
        identifier: '19901234',
        address: 'بغداد',
      },
      secondParty: {
        name: 'محمد كريم',
        phone: '07802223344',
        identifier: '19925678',
        address: 'النجف',
      },
      firstPartyPhoto: mockPhoto1,
      secondPartyPhoto: mockPhoto2,
    });

    assert.equal(contract.firstPartyPhoto, mockPhoto1);
    assert.equal(contract.secondPartyPhoto, mockPhoto2);

    const retrieved = database.getContract(contract.id);
    assert.equal(retrieved.firstPartyPhoto, mockPhoto1);
    assert.equal(retrieved.secondPartyPhoto, mockPhoto2);
  } finally {
    cleanup();
  }
});

test('office snapshot: contract retains creation-time snapshot even after office profile is modified', () => {
  const { database, cleanup } = createTempDb();
  try {
    // Set initial office profile
    database.updateOfficeProfile({
      officeName: 'مكتب الرافدين الأصلي',
      managerName: 'أحمد شاكر',
      phone: '07701111111',
      address: 'بغداد — الكرادة',
      footerNote: 'تذييل النسخة الأولى',
      logoData: mockLogo,
      theme: 'original',
    });

    // Create contract
    const contract = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-03',
      status: 'completed',
      amount: 1000000,
      currency: 'IQD',
      notes: '',
      templateId: null,
      firstParty: { name: 'طرف 1', phone: '', identifier: '', address: '' },
      secondParty: { name: 'طرف 2', phone: '', identifier: '', address: '' },
    });

    assert.ok(contract.officeSnapshot);
    assert.equal(contract.officeSnapshot.officeName, 'مكتب الرافدين الأصلي');
    assert.equal(contract.officeSnapshot.logoData, mockLogo);

    // Later: modify office profile completely
    database.updateOfficeProfile({
      officeName: 'مكتب دجلة الجديد',
      managerName: 'علي كمال',
      phone: '07809999999',
      address: 'أربيل',
      footerNote: 'تذييل النسخة المعدلة',
      logoData: null,
      theme: 'official',
    });

    // The existing contract snapshot MUST remain unmodified!
    const contractAfter = database.getContract(contract.id);
    assert.equal(contractAfter.officeSnapshot.officeName, 'مكتب الرافدين الأصلي');
    assert.equal(contractAfter.officeSnapshot.managerName, 'أحمد شاكر');
    assert.equal(contractAfter.officeSnapshot.logoData, mockLogo);
  } finally {
    cleanup();
  }
});

test('office themes: persists and retrieves all 4 visual themes', () => {
  const { database, cleanup } = createTempDb();
  try {
    const themes = ['original', 'official', 'iraqi_warm', 'high_contrast'];
    for (const theme of themes) {
      const updated = database.updateOfficeProfile({
        officeName: 'مكتب الاختبار',
        managerName: '',
        phone: '',
        address: '',
        footerNote: '',
        theme,
      });
      assert.equal(updated.theme, theme);
      const retrieved = database.getOfficeProfile();
      assert.equal(retrieved.theme, theme);
    }
  } finally {
    cleanup();
  }
});

test('live contract preview: generates identical A4 HTML with photos and logo without saving to DB', () => {
  const { database, cleanup } = createTempDb();
  try {
    const initialContractsCount = database.listContracts().length;

    const html = database.previewContractHtml({
      type: 'بيع عقار',
      contractDate: '2026-09-03',
      status: 'draft',
      amount: 85000000,
      currency: 'IQD',
      notes: 'عقد تجريبي للمعاينة فقط',
      templateId: null,
      propertyDetails: {
        propertyType: 'دار سكنية',
        plotNumber: '10/5',
        districtNumber: '3 المنصور',
        area: '300 م²',
        governorate: 'بغداد',
        cityDistrict: 'المنصور',
        locationNotes: 'قرب ساحة الرواد',
      },
      firstParty: { name: 'بائع المعاينة', phone: '0770', identifier: '111', address: 'بغداد' },
      secondParty: { name: 'مشتري المعاينة', phone: '0780', identifier: '222', address: 'بغداد' },
      firstPartyPhoto: mockPhoto1,
      secondPartyPhoto: mockPhoto2,
    });

    // Verify HTML contains required elements
    assert.ok(html.includes('A4 portrait'), 'Must specify A4 page');
    assert.ok(html.includes(mockPhoto1), 'Must contain first party photo');
    assert.ok(html.includes(mockPhoto2), 'Must contain second party photo');
    assert.ok(html.includes('دار سكنية'), 'Must contain property type');
    assert.ok(html.includes('قرب ساحة الرواد'), 'Must contain location notes');

    // Verify preview did NOT create any record in the database
    const afterContractsCount = database.listContracts().length;
    assert.equal(afterContractsCount, initialContractsCount, 'Preview must not mutate database');
  } finally {
    cleanup();
  }
});

test('saved contract preview preserves the real number, payments, clauses, and office snapshot', () => {
  const { database, cleanup } = createTempDb();
  try {
    database.updateOfficeProfile({
      officeName: 'مكتب المعاينة الفعلي',
      managerName: 'مدير المكتب',
      phone: '07700000000',
      address: 'بغداد',
      footerNote: 'تذييل رسمي',
      logoData: mockLogo,
      theme: 'original',
    });
    const contract = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-03',
      status: 'pending_payment',
      amount: 1000000,
      currency: 'IQD',
      notes: 'عقد محفوظ',
      templateId: null,
      firstParty: { name: 'البائع', phone: '', identifier: '', address: '' },
      secondParty: { name: 'المشتري', phone: '', identifier: '', address: '' },
    });
    database.addPayment({
      contractId: contract.id,
      amount: 250000,
      paymentDate: '2026-09-03',
      method: 'تحويل مصرفي',
      note: 'دفعة مثبتة',
    });

    const html = database.renderContractHtml(contract.id);
    assert.ok(html.includes(contract.contractNumber));
    assert.ok(!html.includes('معاينة-0000'));
    assert.ok(html.includes('دفعة مثبتة'));
    assert.ok(html.includes('مكتب المعاينة الفعلي'));
    assert.ok(html.includes('تذييل رسمي'));
  } finally {
    cleanup();
  }
});

test('financial status follows the recorded balance and recovers after deleting a payment', () => {
  const { database, cleanup } = createTempDb();
  try {
    const contract = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-03',
      status: 'completed',
      amount: 500000,
      currency: 'IQD',
      notes: '',
      templateId: null,
      firstParty: { name: 'البائع', phone: '', identifier: '', address: '' },
      secondParty: { name: 'المشتري', phone: '', identifier: '', address: '' },
    });
    assert.equal(contract.status, 'pending_payment');

    const payment = database.addPayment({
      contractId: contract.id,
      amount: 500000,
      paymentDate: '2026-09-03',
      method: 'نقدي',
      note: '',
    });
    assert.equal(database.getContract(contract.id).status, 'completed');

    database.deletePayment(payment.id);
    assert.equal(database.getContract(contract.id).status, 'pending_payment');
  } finally {
    cleanup();
  }
});

test('dashboard reports IQD and USD balances independently and excludes draft values', () => {
  const { database, cleanup } = createTempDb();
  try {
    const active = database.createContract({
      type: 'بيع مركبة', contractDate: '2026-09-03', status: 'pending_payment', amount: 1000, currency: 'USD', notes: '', templateId: null,
      firstParty: { name: 'البائع', phone: '', identifier: '', address: '' },
      secondParty: { name: 'المشتري', phone: '', identifier: '', address: '' },
    });
    database.addPayment({ contractId: active.id, amount: 250, paymentDate: '2026-09-03', method: 'نقدي', note: '' });
    database.createContract({
      type: 'مسودة', contractDate: '2026-09-03', status: 'draft', amount: 9999, currency: 'USD', notes: '', templateId: null,
      firstParty: { name: 'طرف أول', phone: '', identifier: '', address: '' },
      secondParty: { name: 'طرف ثان', phone: '', identifier: '', address: '' },
    });

    const dashboard = database.dashboard();
    assert.equal(dashboard.receivedUSD, 250);
    assert.equal(dashboard.pendingUSD, 750);
    assert.equal(dashboard.receivedIQD, 0);
    assert.equal(dashboard.pendingIQD, 0);
  } finally {
    cleanup();
  }
});

test('A4 output reserves print margins and repeats header and footer on every page', () => {
  const { database, cleanup } = createTempDb();
  try {
    const contract = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-03',
      status: 'draft',
      amount: 0,
      currency: 'IQD',
      notes: '',
      templateId: null,
      firstParty: { name: 'البائع', phone: '', identifier: '', address: '' },
      secondParty: { name: 'المشتري', phone: '', identifier: '', address: '' },
    });
    const html = database.renderContractHtml(contract.id);
    assert.match(html, /@page\s*\{[\s\S]*margin:\s*28mm 14mm 20mm 14mm/);
    assert.match(html, /@media print[\s\S]*header\s*\{[\s\S]*position:\s*fixed/);
    assert.match(html, /@media print[\s\S]*footer\s*\{[\s\S]*position:\s*fixed/);
    assert.ok(html.includes('class="document-content"'));
  } finally {
    cleanup();
  }
});

test('listContractsByTemplate: returns all contracts created with a specific template', () => {
  const { database, cleanup } = createTempDb();
  try {
    const template1 = database.createTemplate({
      name: 'قالب بيع الأراضي',
      description: 'خاص بالأراضي',
      category: 'عقارات',
      clauses: ['بند 1', 'بند 2'],
      isDefault: false,
    });
    const template2 = database.createTemplate({
      name: 'قالب إيجار دوري',
      description: 'خاص بالإيجار',
      category: 'إيجارات',
      clauses: ['بند أ', 'بند ب'],
      isDefault: false,
    });

    const c1 = database.createContract({
      type: 'بيع عقار',
      contractDate: '2026-09-01',
      status: 'completed',
      amount: 100000,
      currency: 'USD',
      notes: '',
      templateId: template1.id,
      firstParty: { name: 'علي البائع', phone: '', identifier: '', address: '' },
      secondParty: { name: 'عمر المشتري', phone: '', identifier: '', address: '' },
    });

    const c2 = database.createContract({
      type: 'بيع عقار ثان',
      contractDate: '2026-09-02',
      status: 'pending_payment',
      amount: 200000,
      currency: 'USD',
      notes: '',
      templateId: template1.id,
      firstParty: { name: 'علي البائع', phone: '', identifier: '', address: '' },
      secondParty: { name: 'حسن المشتري', phone: '', identifier: '', address: '' },
    });

    const c3 = database.createContract({
      type: 'إيجار سنوي',
      contractDate: '2026-09-03',
      status: 'completed',
      amount: 50000,
      currency: 'USD',
      notes: '',
      templateId: template2.id,
      firstParty: { name: 'أحمد المؤجر', phone: '', identifier: '', address: '' },
      secondParty: { name: 'سالم المستأجر', phone: '', identifier: '', address: '' },
    });

    const template1Contracts = database.listContractsByTemplate(template1.id);
    assert.equal(template1Contracts.length, 2);
    assert.ok(template1Contracts.some((c) => c.id === c1.id));
    assert.ok(template1Contracts.some((c) => c.id === c2.id));

    const template2Contracts = database.listContractsByTemplate(template2.id);
    assert.equal(template2Contracts.length, 1);
    assert.equal(template2Contracts[0].id, c3.id);

    // Invalid template id returns empty array
    assert.deepEqual(database.listContractsByTemplate(99999), []);
    assert.deepEqual(database.listContractsByTemplate(-1), []);
  } finally {
    cleanup();
  }
});

test('listContractsByParty: returns all contracts where party is first or second party', () => {
  const { database, cleanup } = createTempDb();
  try {
    const c1 = database.createContract({
      type: 'بيع عام',
      contractDate: '2026-09-01',
      status: 'completed',
      amount: 10000,
      currency: 'IQD',
      notes: '',
      templateId: null,
      firstParty: { name: 'زيد الرافدين', phone: '07700000001', identifier: 'ID-001', address: 'بغداد' },
      secondParty: { name: 'بكر المنصور', phone: '07700000002', identifier: 'ID-002', address: 'البصرة' },
    });

    const partyZaid = c1.firstParty.id;
    const partyBakr = c1.secondParty.id;

    // Verify first party lookup
    const zaidContracts = database.listContractsByParty(partyZaid);
    assert.equal(zaidContracts.length, 1);
    assert.equal(zaidContracts[0].id, c1.id);

    // Verify second party lookup
    const bakrContracts = database.listContractsByParty(partyBakr);
    assert.equal(bakrContracts.length, 1);
    assert.equal(bakrContracts[0].id, c1.id);

    // If another contract is linked to partyZaid as second party:
    const c2 = database.createContract({
      type: 'بيع مركبة',
      contractDate: '2026-09-02',
      status: 'pending_payment',
      amount: 20000,
      currency: 'USD',
      notes: '',
      templateId: null,
      firstParty: { name: 'خالد الكرخي', phone: '07700000003', identifier: 'ID-003', address: 'بغداد' },
      secondParty: { name: 'شخص مؤقت', phone: '', identifier: '', address: '' },
    });
    // Link c2's second party to partyZaid
    database.db.prepare('UPDATE contracts SET second_party_id = ? WHERE id = ?').run(partyZaid, c2.id);

    const zaidBothContracts = database.listContractsByParty(partyZaid);
    assert.equal(zaidBothContracts.length, 2);
    assert.ok(zaidBothContracts.some((c) => c.id === c1.id));
    assert.ok(zaidBothContracts.some((c) => c.id === c2.id));

    // Nonexistent party returns empty array
    assert.deepEqual(database.listContractsByParty(99999), []);
    assert.deepEqual(database.listContractsByParty(-1), []);
  } finally {
    cleanup();
  }
});

