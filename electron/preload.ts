import { contextBridge, ipcRenderer } from 'electron';
import type { ContractInput, MaktoobAPI, PaymentInput } from '../shared/domain.js';

const api: MaktoobAPI = {
  platform: process.platform,
  version: '0.1.0',
  dashboard: () => ipcRenderer.invoke('dashboard:get'),
  listContracts: (query?: string) => ipcRenderer.invoke('contracts:list', query),
  getContract: (id: number) => ipcRenderer.invoke('contracts:get', id),
  createContract: (input: ContractInput) => ipcRenderer.invoke('contracts:create', input),
  updateContract: (id: number, input: ContractInput) => ipcRenderer.invoke('contracts:update', id, input),
  deleteContract: (id: number) => ipcRenderer.invoke('contracts:delete', id),
  listParties: (query?: string) => ipcRenderer.invoke('parties:list', query),
  listPayments: (query?: string) => ipcRenderer.invoke('payments:list', query),
  addPayment: (input: PaymentInput) => ipcRenderer.invoke('payments:add', input),
  deletePayment: (id: number) => ipcRenderer.invoke('payments:delete', id),
  exportContractPdf: (id: number) => ipcRenderer.invoke('contracts:pdf', id),
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: () => ipcRenderer.invoke('backup:restore'),
};

contextBridge.exposeInMainWorld('maktoob', api);
