import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('maktoob', {
  platform: process.platform,
  version: '0.1.0',
});
