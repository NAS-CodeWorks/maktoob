import { contextBridge, ipcRenderer } from 'electron';
import type { ContractInput, ContractTemplateInput, MaktoobAPI, OfficeProfile, PaymentInput } from '../shared/domain.js';

const api: MaktoobAPI = {
  platform: process.platform,
  version: '1.1.0',
  getLicenseState: () => ipcRenderer.invoke('license:status'),
  importLicense: () => ipcRenderer.invoke('license:import'),
  dashboard: () => ipcRenderer.invoke('dashboard:get'),
  listContracts: (query?: string) => ipcRenderer.invoke('contracts:list', query),
  getContract: (id: number) => ipcRenderer.invoke('contracts:get', id),
  createContract: (input: ContractInput) => ipcRenderer.invoke('contracts:create', input),
  updateContract: (id: number, input: ContractInput) => ipcRenderer.invoke('contracts:update', id, input),
  deleteContract: (id: number) => ipcRenderer.invoke('contracts:delete', id),
  previewContractHtml: (input: ContractInput, profile?: OfficeProfile) => ipcRenderer.invoke('contracts:preview-html', input, profile),
  renderContractHtml: (id: number) => ipcRenderer.invoke('contracts:render-html', id),
  listTemplates: (query?: string) => ipcRenderer.invoke('templates:list', query),
  createTemplate: (input: ContractTemplateInput) => ipcRenderer.invoke('templates:create', input),
  updateTemplate: (id: number, input: ContractTemplateInput) => ipcRenderer.invoke('templates:update', id, input),
  deleteTemplate: (id: number) => ipcRenderer.invoke('templates:delete', id),
  getOfficeProfile: () => ipcRenderer.invoke('office:get'),
  updateOfficeProfile: (profile: OfficeProfile) => ipcRenderer.invoke('office:update', profile),
  listParties: (query?: string) => ipcRenderer.invoke('parties:list', query),
  listPayments: (query?: string) => ipcRenderer.invoke('payments:list', query),
  addPayment: (input: PaymentInput) => ipcRenderer.invoke('payments:add', input),
  deletePayment: (id: number) => ipcRenderer.invoke('payments:delete', id),
  exportContractPdf: (id: number) => ipcRenderer.invoke('contracts:pdf', id),
  printContract: (id: number) => ipcRenderer.invoke('contracts:print', id),
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: () => ipcRenderer.invoke('backup:restore'),
  openContractViewer: (id: number) => ipcRenderer.invoke('contracts:open-viewer', id),
  editContractFromViewer: (id: number) => ipcRenderer.invoke('contracts:edit-from-viewer', id),
  onEditContractRequested: (callback: (contractId: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, contractId: number) => callback(contractId);
    ipcRenderer.on('contracts:edit-requested', handler);
    return () => {
      ipcRenderer.removeListener('contracts:edit-requested', handler);
    };
  },
  listContractsByTemplate: (templateId: number) => ipcRenderer.invoke('contracts:list-by-template', templateId),
  listContractsByParty: (partyId: number) => ipcRenderer.invoke('contracts:list-by-party', partyId),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getUpdateState: () => ipcRenderer.invoke('updater:get-state'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateStateChanged: (callback: (state: import('../shared/domain').UpdateState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: import('../shared/domain').UpdateState) => callback(state);
    ipcRenderer.on('updater:state-changed', handler);
    return () => {
      ipcRenderer.removeListener('updater:state-changed', handler);
    };
  },
};

contextBridge.exposeInMainWorld('maktoob', api);

