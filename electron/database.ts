import Database from 'better-sqlite3';
import type {
  Contract,
  ContractInput,
  ContractListItem,
  Currency,
  DashboardSummary,
  PartyInput,
  PartySummary,
  Payment,
  PaymentInput,
  PaymentListItem,
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

function validateContract(input: ContractInput): ContractInput {
  if (!input || typeof input !== 'object') throw new Error('بيانات العقد غير صالحة');
  if (!['draft', 'completed', 'pending_payment'].includes(input.status)) throw new Error('حالة العقد غير صالحة');
  if (!['IQD', 'USD'].includes(input.currency)) throw new Error('العملة غير صالحة');
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('قيمة العقد غير صالحة');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.contractDate)) throw new Error('تاريخ العقد غير صالح');
  return {
    type: cleanText(input.type, 'نوع العقد', true),
    contractDate: input.contractDate,
    status: input.status,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.currency,
    notes: cleanText(input.notes, 'الملاحظات'),
    firstParty: validateParty(input.firstParty, 'الطرف الأول'),
    secondParty: validateParty(input.secondParty, 'الطرف الثاني'),
  };
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
      CREATE INDEX IF NOT EXISTS idx_contracts_date ON contracts(contract_date DESC);
      CREATE INDEX IF NOT EXISTS idx_contracts_number ON contracts(contract_number);
      CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
      CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
      INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
    `);
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
    const candidate = new Database(path, { readonly: true, fileMustExist: true });
    try {
      const tables = candidate.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
      return ['contracts', 'parties', 'payments'].every((name) => tables.some((table) => table.name === name));
    } finally {
      candidate.close();
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
      const firstPartyId = this.insertParty(input.firstParty);
      const secondPartyId = this.insertParty(input.secondParty);
      const result = this.db.prepare(`INSERT INTO contracts
        (contract_number, type, contract_date, status, amount, currency, notes, first_party_id, second_party_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(this.nextContractNumber(), input.type, input.contractDate, input.status, input.amount, input.currency, input.notes, firstPartyId, secondPartyId);
      return Number(result.lastInsertRowid);
    })();
    return this.getContract(id);
  }

  updateContract(id: number, raw: ContractInput): Contract {
    const input = validateContract(raw);
    const current = this.getContract(id);
    if (input.amount < current.paidAmount) throw new Error('لا يمكن جعل قيمة العقد أقل من مجموع الدفعات المسجلة');
    this.db.transaction(() => {
      const updateParty = this.db.prepare('UPDATE parties SET name=?, phone=?, identifier=?, address=?, updated_at=CURRENT_TIMESTAMP WHERE id=?');
      updateParty.run(input.firstParty.name, input.firstParty.phone, input.firstParty.identifier, input.firstParty.address, current.firstParty.id);
      updateParty.run(input.secondParty.name, input.secondParty.phone, input.secondParty.identifier, input.secondParty.address, current.secondParty.id);
      this.db.prepare(`UPDATE contracts SET type=?, contract_date=?, status=?, amount=?, currency=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(input.type, input.contractDate, input.status, input.amount, input.currency, input.notes, id);
    })();
    return this.getContract(id);
  }

  deleteContract(id: number) {
    const contract = this.getContract(id);
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM contracts WHERE id=?').run(id);
      this.db.prepare('DELETE FROM parties WHERE id IN (?, ?)').run(contract.firstParty.id, contract.secondParty.id);
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
