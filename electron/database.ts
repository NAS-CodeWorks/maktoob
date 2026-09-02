import Database from 'better-sqlite3';
import type {
  Contract,
  ContractInput,
  ContractListItem,
  ContractTemplate,
  ContractTemplateInput,
  Currency,
  DashboardSummary,
  OfficeProfile,
  PartyInput,
  PartySummary,
  Payment,
  PaymentInput,
  PaymentListItem,
  PropertyDetails,
  VehicleDetails,
} from '../shared/domain.js';

type ContractRow = {
  id: number;
  contract_number: string;
  type: string;
  contract_date: string;
  status: Contract['status'];
  amount: number;
  currency: Currency;
  notes: string;
  template_id: number | null;
  template_name_snapshot: string;
  clauses_snapshot: string;
  property_details_json: string;
  vehicle_details_json: string;
  first_party_id: number;
  second_party_id: number;
  first_party_name: string;
  first_party_phone: string;
  first_party_identifier: string;
  first_party_address: string;
  second_party_name: string;
  second_party_phone: string;
  second_party_identifier: string;
  second_party_address: string;
  paid_amount: number;
  payments_count: number;
  created_at: string;
  updated_at: string;
};

type TemplateRow = {
  id: number;
  name: string;
  description: string;
  clauses_json: string;
  is_default: number;
  contracts_count: number;
  created_at: string;
  updated_at: string;
};

const contractSelect = `
  SELECT c.*, fp.name AS first_party_name, fp.phone AS first_party_phone,
    fp.identifier AS first_party_identifier, fp.address AS first_party_address,
    sp.name AS second_party_name, sp.phone AS second_party_phone,
    sp.identifier AS second_party_identifier, sp.address AS second_party_address,
    COALESCE(SUM(p.amount), 0) AS paid_amount, COUNT(p.id) AS payments_count
  FROM contracts c
  JOIN parties fp ON fp.id = c.first_party_id
  JOIN parties sp ON sp.id = c.second_party_id
  LEFT JOIN payments p ON p.contract_id = c.id
`;

function cleanText(value: unknown, field: string, required = false) {
  if (typeof value !== 'string') throw new Error(`${field}: قيمة غير صالحة`);
  const cleaned = value.trim();
  if (required && !cleaned) throw new Error(`${field}: الحقل مطلوب`);
  if (cleaned.length > 5000) throw new Error(`${field}: النص طويل جداً`);
  return cleaned;
}

function validateParty(input: PartyInput, label: string): PartyInput {
  if (!input || typeof input !== 'object') throw new Error(`${label}: بيانات الطرف مطلوبة`);
  return {
    name: cleanText(input.name, `${label} / الاسم`, true),
    phone: cleanText(input.phone, `${label} / الهاتف`),
    identifier: cleanText(input.identifier, `${label} / رقم الهوية`),
    address: cleanText(input.address, `${label} / العنوان`),
  };
}

function validatePropertyDetails(input: unknown): PropertyDetails | null {
  if (!input || typeof input !== 'object') return null;
  const p = input as Partial<PropertyDetails>;
  const hasContent = Boolean(
    p.propertyType?.trim() || p.plotNumber?.trim() || p.districtNumber?.trim() ||
    p.area?.trim() || p.governorate?.trim() || p.cityDistrict?.trim() || p.locationNotes?.trim()
  );
  if (!hasContent) return null;
  return {
    propertyType: cleanText(p.propertyType ?? '', 'نوع العقار'),
    plotNumber: cleanText(p.plotNumber ?? '', 'رقم القطعة'),
    districtNumber: cleanText(p.districtNumber ?? '', 'المقاطعة'),
    area: cleanText(p.area ?? '', 'المساحة'),
    governorate: cleanText(p.governorate ?? '', 'المحافظة'),
    cityDistrict: cleanText(p.cityDistrict ?? '', 'القضاء / الناحية'),
    locationNotes: cleanText(p.locationNotes ?? '', 'تفاصيل الموقع والحدود'),
  };
}

function validateVehicleDetails(input: unknown): VehicleDetails | null {
  if (!input || typeof input !== 'object') return null;
  const v = input as Partial<VehicleDetails>;
  const hasContent = Boolean(
    v.make?.trim() || v.model?.trim() || v.year?.trim() ||
    v.color?.trim() || v.chassisNumber?.trim() || v.plateNumber?.trim()
  );
  if (!hasContent) return null;
  return {
    make: cleanText(v.make ?? '', 'الماركة / الشركة'),
    model: cleanText(v.model ?? '', 'الموديل / الطراز'),
    year: cleanText(v.year ?? '', 'سنة الصنع'),
    color: cleanText(v.color ?? '', 'اللون'),
    chassisNumber: cleanText(v.chassisNumber ?? '', 'رقم الشاصي / الهيكل'),
    plateNumber: cleanText(v.plateNumber ?? '', 'رقم اللوحة'),
  };
}

function validateContract(input: ContractInput): ContractInput {
  if (!input || typeof input !== 'object') throw new Error('بيانات العقد غير صالحة');
  if (!['draft', 'completed', 'pending_payment'].includes(input.status)) throw new Error('حالة العقد غير صالحة');
  if (!['IQD', 'USD'].includes(input.currency)) throw new Error('العملة غير صالحة');
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('قيمة العقد غير صالحة');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.contractDate)) throw new Error('تاريخ العقد غير صالح');
  if (input.templateId !== null && (!Number.isInteger(input.templateId) || input.templateId <= 0)) throw new Error('قالب العقد غير صالح');
  return {
    type: cleanText(input.type, 'نوع العقد', true),
    contractDate: input.contractDate,
    status: input.status,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.currency,
    notes: cleanText(input.notes, 'الملاحظات'),
    templateId: input.templateId,
    propertyDetails: validatePropertyDetails(input.propertyDetails),
    vehicleDetails: validateVehicleDetails(input.vehicleDetails),
    firstParty: validateParty(input.firstParty, 'الطرف الأول'),
    secondParty: validateParty(input.secondParty, 'الطرف الثاني'),
  };
}

function validateTemplate(input: ContractTemplateInput): ContractTemplateInput {
  if (!input || typeof input !== 'object') throw new Error('بيانات القالب غير صالحة');
  if (!Array.isArray(input.clauses)) throw new Error('بنود القالب غير صالحة');
  const clauses = input.clauses.map((clause, index) => cleanText(clause, `البند ${index + 1}`, true));
  if (!clauses.length) throw new Error('يجب إضافة بند واحد على الأقل');
  if (clauses.length > 40) throw new Error('الحد الأعلى هو 40 بنداً');
  return {
    name: cleanText(input.name, 'اسم القالب', true),
    description: cleanText(input.description, 'وصف القالب'),
    clauses,
    isDefault: Boolean(input.isDefault),
  };
}

function validateOfficeProfile(input: OfficeProfile): OfficeProfile {
  if (!input || typeof input !== 'object') throw new Error('بيانات المكتب غير صالحة');
  return {
    officeName: cleanText(input.officeName, 'اسم المكتب', true),
    managerName: cleanText(input.managerName, 'اسم المسؤول'),
    phone: cleanText(input.phone, 'هاتف المكتب'),
    address: cleanText(input.address, 'عنوان المكتب'),
    footerNote: cleanText(input.footerNote, 'تذييل المستند'),
  };
}

function parseClauses(value: string) {
  try {
    const clauses = JSON.parse(value);
    return Array.isArray(clauses) ? clauses.filter((clause): clause is string => typeof clause === 'string') : [];
  } catch {
    return [];
  }
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function validatePayment(input: PaymentInput): PaymentInput {
  if (!input || typeof input !== 'object') throw new Error('بيانات الدفعة غير صالحة');
  if (!Number.isInteger(input.contractId) || input.contractId <= 0) throw new Error('العقد غير صالح');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('قيمة الدفعة يجب أن تكون أكبر من صفر');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate)) throw new Error('تاريخ الدفعة غير صالح');
  return {
    contractId: input.contractId,
    amount: Math.round(input.amount * 100) / 100,
    paymentDate: input.paymentDate,
    method: cleanText(input.method, 'طريقة الدفع', true),
    note: cleanText(input.note, 'ملاحظة الدفعة'),
  };
}

export class MaktoobDatabase {
  private db: Database.Database;

  constructor(private readonly databasePath: string) {
    this.db = this.open();
    this.migrate();
  }

  private open() {
    const db = new Database(this.databasePath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    return db;
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const appliedVersions = new Set(
      (this.db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>).map((row) => row.version)
    );

    if (!appliedVersions.has(1)) {
      this.db.transaction(() => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS parties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL DEFAULT '',
            identifier TEXT NOT NULL DEFAULT '',
            address TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contract_number TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL,
            contract_date TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('draft', 'completed', 'pending_payment')),
            amount REAL NOT NULL CHECK(amount >= 0),
            currency TEXT NOT NULL CHECK(currency IN ('IQD', 'USD')),
            notes TEXT NOT NULL DEFAULT '',
            first_party_id INTEGER NOT NULL REFERENCES parties(id),
            second_party_id INTEGER NOT NULL REFERENCES parties(id),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
            amount REAL NOT NULL CHECK(amount > 0),
            payment_date TEXT NOT NULL,
            method TEXT NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS contract_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL DEFAULT '',
            clauses_json TEXT NOT NULL,
            is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1)),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS office_profile (
            id INTEGER PRIMARY KEY CHECK(id = 1),
            office_name TEXT NOT NULL,
            manager_name TEXT NOT NULL DEFAULT '',
            phone TEXT NOT NULL DEFAULT '',
            address TEXT NOT NULL DEFAULT '',
            footer_note TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_contracts_date ON contracts(contract_date DESC);
          CREATE INDEX IF NOT EXISTS idx_contracts_number ON contracts(contract_number);
          CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
          CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
          INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
        `);
      })();
      appliedVersions.add(1);
    }

    if (!appliedVersions.has(2)) {
      this.db.transaction(() => {
        const contractColumns = this.db.prepare('PRAGMA table_info(contracts)').all() as Array<{ name: string }>;
        if (!contractColumns.some((column) => column.name === 'template_id')) {
          this.db.exec('ALTER TABLE contracts ADD COLUMN template_id INTEGER REFERENCES contract_templates(id) ON DELETE SET NULL');
        }
        if (!contractColumns.some((column) => column.name === 'template_name_snapshot')) {
          this.db.exec("ALTER TABLE contracts ADD COLUMN template_name_snapshot TEXT NOT NULL DEFAULT ''");
        }
        if (!contractColumns.some((column) => column.name === 'clauses_snapshot')) {
          this.db.exec("ALTER TABLE contracts ADD COLUMN clauses_snapshot TEXT NOT NULL DEFAULT '[]'");
        }
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_contracts_template ON contracts(template_id);
          INSERT INTO contract_templates(name, description, clauses_json, is_default)
          SELECT
            'القالب العام',
            'هيكل أولي قابل للتعديل، ويجب مراجعته قانونياً قبل الاعتماد.',
            '["أقر الطرفان بأهليتهما القانونية للتعاقد وبصحة البيانات المثبتة في هذا العقد.","اتفق الطرفان على موضوع العقد وقيمته وطريقة الوفاء المبينة في السجل.","يُعد توقيع الطرفين إقراراً بقراءة البنود وفهمها والموافقة عليها."]',
            1
          WHERE NOT EXISTS (SELECT 1 FROM contract_templates);
          INSERT OR IGNORE INTO schema_migrations(version) VALUES (2);
        `);
      })();
      appliedVersions.add(2);
    }

    if (!appliedVersions.has(3)) {
      this.db.transaction(() => {
        this.db.exec(`
          INSERT OR IGNORE INTO office_profile(id, office_name, footer_note)
          VALUES (1, 'مكتب العقود', 'أُنشئ بواسطة نظام مكتوب — NAS CodeWorks');
          INSERT OR IGNORE INTO schema_migrations(version) VALUES (3);
        `);
      })();
      appliedVersions.add(3);
    }

    if (!appliedVersions.has(4)) {
      this.db.transaction(() => {
        const contractColumns = this.db.prepare('PRAGMA table_info(contracts)').all() as Array<{ name: string }>;
        if (!contractColumns.some((column) => column.name === 'property_details_json')) {
          this.db.exec("ALTER TABLE contracts ADD COLUMN property_details_json TEXT NOT NULL DEFAULT ''");
        }
        if (!contractColumns.some((column) => column.name === 'vehicle_details_json')) {
          this.db.exec("ALTER TABLE contracts ADD COLUMN vehicle_details_json TEXT NOT NULL DEFAULT ''");
        }

        const insertTemplate = this.db.prepare(`
          INSERT INTO contract_templates(name, description, clauses_json, is_default)
          SELECT ?, ?, ?, 0
          WHERE NOT EXISTS (SELECT 1 FROM contract_templates WHERE name = ?)
        `);

        insertTemplate.run(
          'قالب بيع وشراء عقار',
          'قالب تشغيلي لعقود بيع وشراء العقارات والأراضي والمنازل مع توثيق الأوصاف والموقع.',
          JSON.stringify([
            'يقر البائع بملكيته التامة للعقار موضوع العقد وخلوه من أي حجز أو رهن أو نزاع قضائي حتى تاريخ توقيع هذا العقد.',
            'عاين المشتري العقار المعاينة التامة النافية للجهالة شرعاً وقانوناً وقبل بشرائه بحالته الراهنة.',
            'يلتزم الطرفان بالمبالغ وتواريخ الدفعات المثبتة في هذا السجل، ويعد الإخلال بالموعد سبباً لفسخ الاتفاق وفقاً للشروط المتفق عليها.',
            'يتعهد البائع بالحضور أمام دائرة التسجيل العقاري المختصة للتنازل وإتمام نقل الملكية عند سداد كامل الثمن المتفق عليه.'
          ]),
          'قالب بيع وشراء عقار'
        );

        insertTemplate.run(
          'قالب بيع وشراء سيارة',
          'قالب تشغيلي لمعارض ومكاتب بيع المركبات متضمناً رقم الهيكل ورقم اللوحة والفحص.',
          JSON.stringify([
            'يقر البائع بأن المركبة الموصوفة في العقد ملك له وغير مطلوبة لأي جهة أمنية أو قضائية وخالية من أي حجز تنفيذي.',
            'قام المشتري بفحص المركبة ومعاينتها وتجربتها وقبل بشرائها بحالتها الحاضرة ومواصفاتها المبينة أعلاه.',
            'يتحمل البائع كافة الغرامات المرورية والرسوم والتبعات المالية أو القانونية السابقة لتاريخ توقيع هذا العقد وتسليم السيارة.',
            'يلتزم الطرفان بمراجعة مديرية المرور المختصة لإكمال نقل الملكية وتحويل السنوية خلال المدة المحددة باتفاق الطرفين.'
          ]),
          'قالب بيع وشراء سيارة'
        );

        this.db.exec('INSERT OR IGNORE INTO schema_migrations(version) VALUES (4);');
      })();
      appliedVersions.add(4);
    }
  }

  close() {
    if (this.db.open) this.db.close();
  }

  reopen() {
    if (this.db.open) this.db.close();
    this.db = this.open();
    this.migrate();
  }

  async backup(destination: string) {
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    await this.db.backup(destination);
  }

  verifyBackup(path: string) {
    try {
      const candidate = new Database(path, { readonly: true, fileMustExist: true });
      try {
        const integrity = candidate.pragma('integrity_check') as Array<{ integrity_check: string }>;
        if (!integrity.length || integrity[0]?.integrity_check !== 'ok') return false;
        const tables = candidate.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
        const required = ['contracts', 'parties', 'payments', 'contract_templates', 'office_profile'];
        return required.every((name) => tables.some((table) => table.name === name));
      } finally {
        candidate.close();
      }
    } catch {
      return false;
    }
  }

  getPath() {
    return this.databasePath;
  }

  private insertParty(input: PartyInput) {
    const result = this.db.prepare('INSERT INTO parties(name, phone, identifier, address) VALUES (?, ?, ?, ?)')
      .run(input.name, input.phone, input.identifier, input.address);
    return Number(result.lastInsertRowid);
  }

  private nextContractNumber() {
    const year = new Date().getFullYear();
    const prefix = `MK-${year}-`;
    const row = this.db.prepare('SELECT contract_number FROM contracts WHERE contract_number LIKE ? ORDER BY id DESC LIMIT 1')
      .get(`${prefix}%`) as { contract_number: string } | undefined;
    const sequence = row ? Number(row.contract_number.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(sequence).padStart(5, '0')}`;
  }

  private mapContract(row: ContractRow, withPayments = false): Contract | ContractListItem {
    const base = {
      id: row.id,
      contractNumber: row.contract_number,
      type: row.type,
      contractDate: row.contract_date,
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      notes: row.notes,
      templateId: row.template_id,
      templateName: row.template_name_snapshot,
      clauses: parseClauses(row.clauses_snapshot),
      propertyDetails: parseJson<PropertyDetails | null>(row.property_details_json, null),
      vehicleDetails: parseJson<VehicleDetails | null>(row.vehicle_details_json, null),
      firstParty: { id: row.first_party_id, name: row.first_party_name, phone: row.first_party_phone, identifier: row.first_party_identifier, address: row.first_party_address },
      secondParty: { id: row.second_party_id, name: row.second_party_name, phone: row.second_party_phone, identifier: row.second_party_identifier, address: row.second_party_address },
      paidAmount: row.paid_amount,
      remainingAmount: Math.max(0, row.amount - row.paid_amount),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    if (withPayments) return { ...base, payments: this.listContractPayments(row.id) };
    return { ...base, paymentsCount: row.payments_count };
  }

  listContracts(query = ''): ContractListItem[] {
    const value = `%${query.trim()}%`;
    const rows = this.db.prepare(`${contractSelect}
      WHERE (? = '%%' OR c.contract_number LIKE ? OR c.type LIKE ? OR fp.name LIKE ? OR sp.name LIKE ?)
      GROUP BY c.id ORDER BY c.contract_date DESC, c.id DESC`).all(value, value, value, value, value) as ContractRow[];
    return rows.map((row) => this.mapContract(row) as ContractListItem);
  }

  getContract(id: number): Contract {
    if (!Number.isInteger(id) || id <= 0) throw new Error('رقم العقد غير صالح');
    const row = this.db.prepare(`${contractSelect} WHERE c.id = ? GROUP BY c.id`).get(id) as ContractRow | undefined;
    if (!row) throw new Error('العقد غير موجود');
    return this.mapContract(row, true) as Contract;
  }

  createContract(raw: ContractInput): Contract {
    const input = validateContract(raw);
    const id = this.db.transaction(() => {
      const template = input.templateId ? this.getTemplate(input.templateId) : null;
      const firstPartyId = this.insertParty(input.firstParty);
      const secondPartyId = this.insertParty(input.secondParty);
      const result = this.db.prepare(`INSERT INTO contracts
        (contract_number, type, contract_date, status, amount, currency, notes, template_id, template_name_snapshot, clauses_snapshot, property_details_json, vehicle_details_json, first_party_id, second_party_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          this.nextContractNumber(),
          input.type,
          input.contractDate,
          input.status,
          input.amount,
          input.currency,
          input.notes,
          template?.id ?? null,
          template?.name ?? '',
          JSON.stringify(template?.clauses ?? []),
          input.propertyDetails ? JSON.stringify(input.propertyDetails) : '',
          input.vehicleDetails ? JSON.stringify(input.vehicleDetails) : '',
          firstPartyId,
          secondPartyId
        );
      return Number(result.lastInsertRowid);
    })();
    return this.getContract(id);
  }

  updateContract(id: number, raw: ContractInput): Contract {
    const input = validateContract(raw);
    const current = this.getContract(id);
    if (input.amount < current.paidAmount) throw new Error('لا يمكن جعل قيمة العقد أقل من مجموع الدفعات المسجلة');
    this.db.transaction(() => {
      const templateChanged = input.templateId !== current.templateId;
      const template = templateChanged && input.templateId ? this.getTemplate(input.templateId) : null;
      const updateParty = this.db.prepare('UPDATE parties SET name=?, phone=?, identifier=?, address=?, updated_at=CURRENT_TIMESTAMP WHERE id=?');
      updateParty.run(input.firstParty.name, input.firstParty.phone, input.firstParty.identifier, input.firstParty.address, current.firstParty.id);
      updateParty.run(input.secondParty.name, input.secondParty.phone, input.secondParty.identifier, input.secondParty.address, current.secondParty.id);
      this.db.prepare(`UPDATE contracts SET type=?, contract_date=?, status=?, amount=?, currency=?, notes=?,
        template_id=?, template_name_snapshot=?, clauses_snapshot=?, property_details_json=?, vehicle_details_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(
          input.type,
          input.contractDate,
          input.status,
          input.amount,
          input.currency,
          input.notes,
          input.templateId,
          templateChanged ? template?.name ?? '' : current.templateName,
          templateChanged ? JSON.stringify(template?.clauses ?? []) : JSON.stringify(current.clauses),
          input.propertyDetails ? JSON.stringify(input.propertyDetails) : '',
          input.vehicleDetails ? JSON.stringify(input.vehicleDetails) : '',
          id
        );
    })();
    return this.getContract(id);
  }

  private mapTemplate(row: TemplateRow): ContractTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      clauses: parseClauses(row.clauses_json),
      isDefault: Boolean(row.is_default),
      contractsCount: Number(row.contracts_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  listTemplates(query = ''): ContractTemplate[] {
    const value = `%${query.trim()}%`;
    const rows = this.db.prepare(`SELECT t.*, COUNT(c.id) AS contracts_count
      FROM contract_templates t LEFT JOIN contracts c ON c.template_id=t.id
      WHERE (?='%%' OR t.name LIKE ? OR t.description LIKE ?)
      GROUP BY t.id ORDER BY t.is_default DESC, t.name`).all(value, value, value) as TemplateRow[];
    return rows.map((row) => this.mapTemplate(row));
  }

  getTemplate(id: number): ContractTemplate {
    if (!Number.isInteger(id) || id <= 0) throw new Error('رقم القالب غير صالح');
    const row = this.db.prepare(`SELECT t.*, COUNT(c.id) AS contracts_count
      FROM contract_templates t LEFT JOIN contracts c ON c.template_id=t.id WHERE t.id=? GROUP BY t.id`).get(id) as TemplateRow | undefined;
    if (!row) throw new Error('قالب العقد غير موجود');
    return this.mapTemplate(row);
  }

  createTemplate(raw: ContractTemplateInput): ContractTemplate {
    const input = validateTemplate(raw);
    const id = this.db.transaction(() => {
      if (input.isDefault) this.db.prepare('UPDATE contract_templates SET is_default=0').run();
      const result = this.db.prepare('INSERT INTO contract_templates(name, description, clauses_json, is_default) VALUES (?, ?, ?, ?)')
        .run(input.name, input.description, JSON.stringify(input.clauses), input.isDefault ? 1 : 0);
      return Number(result.lastInsertRowid);
    })();
    return this.getTemplate(id);
  }

  updateTemplate(id: number, raw: ContractTemplateInput): ContractTemplate {
    const input = validateTemplate(raw);
    this.getTemplate(id);
    this.db.transaction(() => {
      if (input.isDefault) this.db.prepare('UPDATE contract_templates SET is_default=0 WHERE id<>?').run(id);
      this.db.prepare(`UPDATE contract_templates SET name=?, description=?, clauses_json=?, is_default=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(input.name, input.description, JSON.stringify(input.clauses), input.isDefault ? 1 : 0, id);
    })();
    return this.getTemplate(id);
  }

  deleteTemplate(id: number) {
    const template = this.getTemplate(id);
    if (template.isDefault) throw new Error('لا يمكن حذف القالب الافتراضي؛ عيّن قالباً آخر كافتراضي أولاً');
    this.db.prepare('DELETE FROM contract_templates WHERE id=?').run(id);
  }

  getOfficeProfile(): OfficeProfile {
    const row = this.db.prepare('SELECT * FROM office_profile WHERE id=1').get() as Record<string, unknown> | undefined;
    if (!row) throw new Error('تعذر تحميل إعدادات المكتب');
    return {
      officeName: String(row.office_name),
      managerName: String(row.manager_name),
      phone: String(row.phone),
      address: String(row.address),
      footerNote: String(row.footer_note),
    };
  }

  updateOfficeProfile(raw: OfficeProfile): OfficeProfile {
    const input = validateOfficeProfile(raw);
    this.db.prepare(`UPDATE office_profile SET office_name=?, manager_name=?, phone=?, address=?, footer_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=1`)
      .run(input.officeName, input.managerName, input.phone, input.address, input.footerNote);
    return this.getOfficeProfile();
  }

  deleteContract(id: number) {
    const contract = this.getContract(id);
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM contracts WHERE id=?').run(id);
      this.db.prepare(`
        DELETE FROM parties
        WHERE id IN (?, ?)
          AND id NOT IN (SELECT first_party_id FROM contracts UNION SELECT second_party_id FROM contracts)
      `).run(contract.firstParty.id, contract.secondParty.id);
    })();
  }

  private listContractPayments(contractId: number): Payment[] {
    const rows = this.db.prepare('SELECT * FROM payments WHERE contract_id=? ORDER BY payment_date DESC, id DESC').all(contractId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: Number(row.id), contractId: Number(row.contract_id), amount: Number(row.amount), paymentDate: String(row.payment_date),
      method: String(row.method), note: String(row.note), createdAt: String(row.created_at),
    }));
  }

  addPayment(raw: PaymentInput): Payment {
    const input = validatePayment(raw);
    const contract = this.getContract(input.contractId);
    if (input.amount > contract.remainingAmount) throw new Error('قيمة الدفعة أكبر من المبلغ المتبقي');
    const id = this.db.transaction(() => {
      const result = this.db.prepare('INSERT INTO payments(contract_id, amount, payment_date, method, note) VALUES (?, ?, ?, ?, ?)')
        .run(input.contractId, input.amount, input.paymentDate, input.method, input.note);
      if (input.amount === contract.remainingAmount && contract.status === 'pending_payment') {
        this.db.prepare("UPDATE contracts SET status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(input.contractId);
      }
      return Number(result.lastInsertRowid);
    })();
    return this.listContractPayments(input.contractId).find((payment) => payment.id === id)!;
  }

  deletePayment(id: number) {
    if (!Number.isInteger(id) || id <= 0) throw new Error('رقم الدفعة غير صالح');
    const result = this.db.prepare('DELETE FROM payments WHERE id=?').run(id);
    if (!result.changes) throw new Error('الدفعة غير موجودة');
  }

  listParties(query = ''): PartySummary[] {
    const value = `%${query.trim()}%`;
    const rows = this.db.prepare(`
      SELECT p.*, COUNT(DISTINCT c.id) AS contracts_count,
        COALESCE(SUM(CASE WHEN c.currency='IQD' THEN c.amount ELSE 0 END), 0) AS total_iqd,
        COALESCE(SUM(CASE WHEN c.currency='USD' THEN c.amount ELSE 0 END), 0) AS total_usd
      FROM parties p LEFT JOIN contracts c ON c.first_party_id=p.id OR c.second_party_id=p.id
      WHERE (?='%%' OR p.name LIKE ? OR p.phone LIKE ? OR p.identifier LIKE ?)
      GROUP BY p.id ORDER BY p.name`).all(value, value, value, value) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: Number(row.id), name: String(row.name), phone: String(row.phone), identifier: String(row.identifier), address: String(row.address),
      contractsCount: Number(row.contracts_count), totalValueIQD: Number(row.total_iqd), totalValueUSD: Number(row.total_usd),
    }));
  }

  listPayments(query = ''): PaymentListItem[] {
    const value = `%${query.trim()}%`;
    const rows = this.db.prepare(`SELECT p.*, c.contract_number, c.type AS contract_type, c.currency
      FROM payments p JOIN contracts c ON c.id=p.contract_id
      WHERE (?='%%' OR c.contract_number LIKE ? OR c.type LIKE ? OR p.method LIKE ?)
      ORDER BY p.payment_date DESC, p.id DESC`).all(value, value, value, value) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: Number(row.id), contractId: Number(row.contract_id), amount: Number(row.amount), paymentDate: String(row.payment_date), method: String(row.method),
      note: String(row.note), createdAt: String(row.created_at), contractNumber: String(row.contract_number), contractType: String(row.contract_type), currency: row.currency as Currency,
    }));
  }

  dashboard(): DashboardSummary {
    const totals = this.db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN strftime('%Y-%m', contract_date)=strftime('%Y-%m','now','localtime') THEN 1 ELSE 0 END) AS current_month,
      COALESCE(SUM(CASE WHEN currency='IQD' THEN amount ELSE 0 END),0) AS value_iqd FROM contracts`).get() as Record<string, number>;
    const paid = this.db.prepare(`SELECT COALESCE(SUM(p.amount),0) AS total FROM payments p JOIN contracts c ON c.id=p.contract_id WHERE c.currency='IQD'`).get() as { total: number };
    return {
      totalContracts: Number(totals.total), currentMonthContracts: Number(totals.current_month), receivedIQD: Number(paid.total),
      pendingIQD: Math.max(0, Number(totals.value_iqd) - Number(paid.total)), recentContracts: this.listContracts().slice(0, 6),
    };
  }
}
