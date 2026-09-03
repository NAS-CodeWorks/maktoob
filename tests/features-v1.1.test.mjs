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
