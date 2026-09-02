import { createHash, createPublicKey, verify } from 'node:crypto';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { LicensePayload, LicenseState, SignedLicense } from '../shared/domain.js';

const execFileAsync = promisify(execFile);

export function canonicalLicensePayload(payload: LicensePayload) {
  return JSON.stringify({
    version: payload.version,
    licenseId: payload.licenseId,
    customerName: payload.customerName,
    deviceId: payload.deviceId,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    features: [...payload.features].sort(),
  });
}

function validPayload(value: unknown): value is LicensePayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<LicensePayload>;
  return payload.version === 1
    && typeof payload.licenseId === 'string' && payload.licenseId.length >= 8 && payload.licenseId.length <= 100
    && typeof payload.customerName === 'string' && payload.customerName.trim().length > 0 && payload.customerName.length <= 200
    && typeof payload.deviceId === 'string' && /^MK-[A-F0-9]{4}(?:-[A-F0-9]{4}){5}$/.test(payload.deviceId)
    && typeof payload.issuedAt === 'string' && !Number.isNaN(Date.parse(payload.issuedAt))
    && (payload.expiresAt === null || (typeof payload.expiresAt === 'string' && !Number.isNaN(Date.parse(payload.expiresAt))))
    && Array.isArray(payload.features) && payload.features.length > 0 && payload.features.every((feature) => typeof feature === 'string' && feature.length > 0 && feature.length <= 80)
    && new Set(payload.features).size === payload.features.length;
}

function parseLicense(raw: string): SignedLicense | null {
  try {
    const license = JSON.parse(raw) as Partial<SignedLicense>;
    if (!validPayload(license.payload) || typeof license.signature !== 'string' || !license.signature) return null;
    return license as SignedLicense;
  } catch {
    return null;
  }
}

export function verifySignedLicense(raw: string, publicKeyPem: string, deviceId: string, now = new Date()): LicenseState {
  const license = parseLicense(raw);
  if (!license) return { status: 'invalid', deviceId, message: 'ملف الترخيص غير صالح أو تالف' };
  let signatureValid: boolean;
  try {
    signatureValid = verify(null, Buffer.from(canonicalLicensePayload(license.payload)), createPublicKey(publicKeyPem), Buffer.from(license.signature, 'base64'));
  } catch {
    return { status: 'configuration_error', deviceId, message: 'مفتاح التحقق المضمّن في التطبيق غير صالح' };
  }
  if (!signatureValid) return { status: 'invalid', deviceId, message: 'توقيع الترخيص غير صحيح' };
  if (!license.payload.features.includes('core')) return { status: 'invalid', deviceId, message: 'الترخيص لا يتضمن صلاحية تشغيل التطبيق' };
  if (license.payload.deviceId !== deviceId) return { status: 'wrong_device', deviceId, message: 'هذا الترخيص صادر لجهاز مختلف', payload: license.payload };
  if (license.payload.expiresAt && Date.parse(license.payload.expiresAt) < now.getTime()) return { status: 'expired', deviceId, message: 'انتهت صلاحية هذا الترخيص', payload: license.payload };
  return { status: 'active', deviceId, message: 'الترخيص فعّال', payload: license.payload };
}

function formatDeviceId(source: string) {
  const digest = createHash('sha256').update(`maktoob-device-v1:${source.trim().toLowerCase()}`).digest('hex').slice(0, 24).toUpperCase();
  return `MK-${digest.match(/.{4}/g)!.join('-')}`;
}

async function machineSource() {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync('reg.exe', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { windowsHide: true });
      const match = stdout.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
      if (match?.[1]) return `windows:${match[1].trim()}`;
    } catch { /* use the portable fallback */ }
  }
  for (const candidate of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
    try { const value = (await readFile(candidate, 'utf8')).trim(); if (value) return `${process.platform}:${value}`; } catch { /* try the next source */ }
  }
  const macs = Object.values(os.networkInterfaces()).flat().filter((entry) => entry && !entry.internal && entry.mac !== '00:00:00:00:00:00').map((entry) => entry!.mac).sort();
  return [process.platform, os.arch(), os.hostname(), os.totalmem(), ...macs].join(':');
}

export async function getDeviceId() {
  return formatDeviceId(await machineSource());
}

export class LicenseManager {
  private state: LicenseState = { status: 'missing', deviceId: '', message: 'لم يتم تثبيت ترخيص لهذا الجهاز' };
  private publicKey = '';

  constructor(private readonly licensePath: string, private readonly publicKeyPath: string, private readonly developmentBypass = false) {}

  async initialize() {
    const deviceId = await getDeviceId();
    if (this.developmentBypass) {
      this.state = { status: 'active', deviceId, message: 'وضع تطوير مرخّص', payload: { version: 1, licenseId: 'development', customerName: 'بيئة التطوير', deviceId, issuedAt: new Date(0).toISOString(), expiresAt: null, features: ['core', 'templates'] } };
      return this.state;
    }
    try { this.publicKey = await readFile(this.publicKeyPath, 'utf8'); createPublicKey(this.publicKey); }
    catch { this.state = { status: 'configuration_error', deviceId, message: 'نسخة التطبيق غير مجهزة بمفتاح تحقق صالح' }; return this.state; }
    try { this.state = verifySignedLicense(await readFile(this.licensePath, 'utf8'), this.publicKey, deviceId); }
    catch { this.state = { status: 'missing', deviceId, message: 'لم يتم تثبيت ترخيص لهذا الجهاز' }; }
    return this.state;
  }

  getState() { return this.state; }
  requireActive() { if (this.state.status !== 'active') throw new Error('يجب تفعيل ترخيص مكتوب قبل استخدام هذه العملية'); }

  async importLicense(sourcePath: string) {
    const raw = await readFile(sourcePath, 'utf8');
    const candidate = verifySignedLicense(raw, this.publicKey, this.state.deviceId);
    if (candidate.status !== 'active') return candidate;
    await mkdir(path.dirname(this.licensePath), { recursive: true });
    await copyFile(sourcePath, this.licensePath);
    this.state = candidate;
    return this.state;
  }
}
