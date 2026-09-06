import { app, BrowserWindow, Menu } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MaktoobDatabase } from '../dist-electron/electron/database.js';
import { registerIpc } from '../dist-electron/electron/ipc.js';
import { LicenseManager } from '../dist-electron/electron/licensing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const artifactDir = 'C:\\Users\\sufia\\.gemini\\antigravity\\brain\\69b5dcad-f0ba-4094-b0e1-05d20789aa24';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Generate clean avatar data URIs
function generateAvatarSvg(name, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="172" viewBox="0 0 140 172">
    <rect width="100%" height="100%" fill="${bg}"/>
    <circle cx="70" cy="55" r="32" fill="#ffffff" opacity="0.85"/>
    <path d="M20 155 C20 105 120 105 120 155 Z" fill="#ffffff" opacity="0.85"/>
    <text x="70" y="165" text-anchor="middle" fill="#333333" font-size="12" font-family="sans-serif">${name}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const photo1 = generateAvatarSvg('الطرف الأول', '#e2e8f0');
const photo2 = generateAvatarSvg('الطرف الثاني', '#cbd5e1');

let database;

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await fs.mkdir(artifactDir, { recursive: true });

  const tempDbPath = path.join(app.getPath('userData'), 'maktoob-viewer-test.sqlite');
  try {
    await fs.unlink(tempDbPath);
  } catch (_) {}

  database = new MaktoobDatabase(tempDbPath);

  // Read logo from public/branding/maktoob-256.png
  const logoBuffer = await fs.readFile(path.join(rootDir, 'public', 'branding', 'maktoob-256.png'));
  const logoData = 'data:image/png;base64,' + logoBuffer.toString('base64');

  // Set office profile
  database.updateOfficeProfile({
    officeName: 'مكتب الرافدين للخدمات القانونية والعقارية',
    managerName: 'الأستاذ رعد سالم الناصري',
    phone: '0770 123 4567',
    address: 'بغداد — الكرادة داخل — عمارة الرافدين الطابق الثاني',
    footerNote: 'وثيقة رسمية صادرة ومعتمدة وموثقة إلكترونياً بسجلات المكتب',
    logoData,
    theme: 'original',
  });

  // Seed 1: General Sale
  const c1 = database.createContract({
    type: 'بيع عام',
    contractDate: '2026-09-06',
    status: 'completed',
    amount: 15000000,
    currency: 'IQD',
    notes: 'عقد بيع موجودات ومعدات مكتبية مع التسليم الفوري.',
    templateId: null,
    firstParty: {
      name: 'الحاج صباح كريم الجبوري',
      phone: '0780 111 2233',
      identifier: 'IRQ-1972-882910',
      address: 'بغداد — المنصور — محلة 603',
    },
    secondParty: {
      name: 'عدنان سالم المفرجي',
      phone: '0771 999 8877',
      identifier: 'IRQ-1980-449102',
      address: 'بغداد — الكرادة — محلة 901',
    },
    firstPartyPhoto: photo1,
    secondPartyPhoto: photo2,
  });

  database.addPayment({
    contractId: c1.id,
    amount: 15000000,
    paymentDate: '2026-09-06',
    method: 'نقدي معتمد',
    note: 'كامل الثمن مستلم عند توقيع العقد',
  });

  // Seed 2: Property Sale
  const c2 = database.createContract({
    type: 'بيع عقار',
    contractDate: '2026-09-06',
    status: 'pending_payment',
    amount: 180000,
    currency: 'USD',
    notes: 'تم البيع بعد المعاينة النافية للجهالة والاتفاق على تسليم السند بعد الدفعة الأخيرة.',
    templateId: null,
    propertyDetails: {
      propertyType: 'دار سكنية طابقين',
      plotNumber: '14/88',
      districtNumber: '5 الجزيرة',
      area: '300 م²',
      governorate: 'بغداد',
      cityDistrict: 'المنصور — حي دراغ',
      locationNotes: 'واجهة 12 متر، ركن مفتوح على شارعين، كامل الخدمات والفرز نظامي طابو صرف',
    },
    firstParty: {
      name: 'عمر فاروق التميمي',
      phone: '0770 555 4411',
      identifier: 'IRQ-1985-718290',
      address: 'بغداد — المنصور — شارع الأميرات',
    },
    secondParty: {
      name: 'حيدر جاسم الزبيدي',
      phone: '0781 222 3344',
      identifier: 'IRQ-1988-109283',
      address: 'بغداد — الجادرية — المجمع الرئاسي',
    },
    firstPartyPhoto: photo1,
    secondPartyPhoto: photo2,
  });

  database.addPayment({
    contractId: c2.id,
    amount: 100000,
    paymentDate: '2026-09-06',
    method: 'صك مصدق',
    note: 'دفعة مقدمة أولى عند تنظيم العقد',
  });

  // Seed 3: Vehicle Sale
  const c3 = database.createContract({
    type: 'بيع مركبة',
    contractDate: '2026-09-06',
    status: 'pending_payment',
    amount: 24500,
    currency: 'USD',
    notes: 'السيارة خالية من الصدمات والصبغ وبحالة الوكالة مع فحص السونار.',
    templateId: null,
    vehicleDetails: {
      make: 'تويوتا (Toyota)',
      model: 'كامري جراندي (Camry High)',
      year: '2023',
      color: 'أبيض لؤلؤي ميتاليك',
      chassisNumber: '4T1B11HK5PU129845',
      plateNumber: 'بغداد 78241 ب خصوصي',
    },
    firstParty: {
      name: 'معرض الرافدين لتجارة السيارات',
      phone: '0750 333 4455',
      identifier: 'AUTO-BG-2022',
      address: 'أربيل — شارع 100 متري',
    },
    secondParty: {
      name: 'مصطفى كاظم الشمري',
      phone: '0772 444 8811',
      identifier: 'IRQ-1992-665544',
      address: 'بغداد — الشعب — محلة 324',
    },
    firstPartyPhoto: photo1,
    secondPartyPhoto: photo2,
  });

  database.addPayment({
    contractId: c3.id,
    amount: 10000,
    paymentDate: '2026-09-06',
    method: 'نقدي بالدولار',
    note: 'عربون وتثبيت البيع',
  });

  const licenseManager = new LicenseManager(
    path.join(app.getPath('userData'), 'license', 'maktoob.license.json'),
    path.join(rootDir, 'resources', 'license-public.pem'),
    true
  );
  await licenseManager.initialize();
  registerIpc(database, licenseManager);

  // Launch BrowserWindow at 1180x900 content size
  const win = new BrowserWindow({
    width: 1180,
    height: 900,
    useContentSize: true,
    backgroundColor: '#525659',
    show: true,
    webPreferences: {
      preload: path.join(rootDir, 'dist-electron', 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const viewerHtmlPath = path.join(rootDir, 'dist', 'viewer.html');

  async function captureContract(contractId, filename) {
    console.log(`Loading contract ${contractId} for ${filename}...`);
    await win.loadFile(viewerHtmlPath, { query: { id: String(contractId) } });

    // Wait for document and frame rendering
    await sleep(2500);

    const image = await win.webContents.capturePage();
    const pngBuffer = image.toPNG();

    const artifactPath = path.join(artifactDir, filename);
    await fs.writeFile(artifactPath, pngBuffer);
    console.log(`Saved screenshot to ${artifactPath}`);
  }

  // 1. General Sale
  await captureContract(c1.id, 'viewer-general-sale.png');

  // 2. Property Sale
  await captureContract(c2.id, 'viewer-property-sale.png');

  // 3. Vehicle Sale
  await captureContract(c3.id, 'viewer-vehicle-sale.png');

  console.log('All 3 viewer screenshots captured successfully!');
  win.close();
  app.quit();
});
