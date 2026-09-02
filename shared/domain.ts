export type ContractStatus = 'draft' | 'completed' | 'pending_payment';
export type Currency = 'IQD' | 'USD';

export type PartyInput = {
  name: string;
  phone: string;
  identifier: string;
  address: string;
};

export type ContractInput = {
  type: string;
  contractDate: string;
  status: ContractStatus;
  amount: number;
  currency: Currency;
  notes: string;
  templateId: number | null;
  firstParty: PartyInput;
  secondParty: PartyInput;
};

export type ContractTemplateInput = {
  name: string;
  description: string;
  clauses: string[];
  isDefault: boolean;
};

export type ContractTemplate = ContractTemplateInput & {
  id: number;
  contractsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PaymentInput = {
  contractId: number;
  amount: number;
  paymentDate: string;
  method: string;
  note: string;
};

export type Party = PartyInput & {
  id: number;
};

export type Payment = {
  id: number;
  contractId: number;
  amount: number;
  paymentDate: string;
  method: string;
  note: string;
  createdAt: string;
};

export type Contract = {
  id: number;
  contractNumber: string;
  type: string;
  contractDate: string;
  status: ContractStatus;
  amount: number;
  currency: Currency;
  notes: string;
  templateId: number | null;
  templateName: string;
  clauses: string[];
  firstParty: Party;
  secondParty: Party;
  paidAmount: number;
  remainingAmount: number;
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
};

export type ContractListItem = Omit<Contract, 'payments'> & { paymentsCount: number };

export type DashboardSummary = {
  totalContracts: number;
  currentMonthContracts: number;
  receivedIQD: number;
  pendingIQD: number;
  recentContracts: ContractListItem[];
};

export type PartySummary = Party & {
  contractsCount: number;
  totalValueIQD: number;
  totalValueUSD: number;
};

export type PaymentListItem = Payment & {
  contractNumber: string;
  contractType: string;
  currency: Currency;
};

export type OperationResult = { ok: true; path?: string } | { ok: false; message: string };

export type OfficeProfile = {
  officeName: string;
  managerName: string;
  phone: string;
  address: string;
  footerNote: string;
};

export type MaktoobAPI = {
  platform: string;
  version: string;
  dashboard: () => Promise<DashboardSummary>;
  listContracts: (query?: string) => Promise<ContractListItem[]>;
  getContract: (id: number) => Promise<Contract>;
  createContract: (input: ContractInput) => Promise<Contract>;
  updateContract: (id: number, input: ContractInput) => Promise<Contract>;
  deleteContract: (id: number) => Promise<void>;
  listTemplates: (query?: string) => Promise<ContractTemplate[]>;
  createTemplate: (input: ContractTemplateInput) => Promise<ContractTemplate>;
  updateTemplate: (id: number, input: ContractTemplateInput) => Promise<ContractTemplate>;
  deleteTemplate: (id: number) => Promise<void>;
  getOfficeProfile: () => Promise<OfficeProfile>;
  updateOfficeProfile: (profile: OfficeProfile) => Promise<OfficeProfile>;
  listParties: (query?: string) => Promise<PartySummary[]>;
  listPayments: (query?: string) => Promise<PaymentListItem[]>;
  addPayment: (input: PaymentInput) => Promise<Payment>;
  deletePayment: (id: number) => Promise<void>;
  exportContractPdf: (id: number) => Promise<OperationResult>;
  createBackup: () => Promise<OperationResult>;
  restoreBackup: () => Promise<OperationResult>;
};
