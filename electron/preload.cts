import { contextBridge, ipcRenderer } from 'electron';
import type { ContractInput, ContractTemplateInput, MaktoobAPI, OfficeProfile, PaymentInput } from '../shared/domain.js';

const api: MaktoobAPI = {
  platform: process.platform,
  version: '0.5.0',
  getLicenseState: () => ipcRenderer.invoke('license:status'),
  importLicense: () => ipcRenderer.invoke('license:import'),
  dashboard: () => ipcRenderer.invoke('dashboard:get'),
  listContracts: (query?: string) => ipcRenderer.invoke('contracts:list', query),
  getContract: (id: number) => ipcRenderer.invoke('contracts:get', id),
  createContract: (input: ContractInput) => ipcRenderer.invoke('contracts:create', input),
  updateContract: (id: number, input: ContractInput) => ipcRenderer.invoke('contracts:update', id, input),
  deleteContract: (id: number) => ipcRenderer.invoke('contracts:delete', id),
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
};

contextBridge.exposeInMainWorld('maktoob', api);
