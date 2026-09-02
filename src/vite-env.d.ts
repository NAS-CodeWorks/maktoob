/* eslint-disable @typescript-eslint/no-unused-vars */
/// <reference types="vite/client" />

import type { MaktoobAPI } from '../shared/domain';

declare global {
  interface Window {
    maktoob: MaktoobAPI;
  }
}

export {};

interface Window {
  maktoob: {
    platform: string;
    version: string;
  };
}
