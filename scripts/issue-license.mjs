import { randomUUID, sign } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function args() {
  const result = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index]?.replace(/^--/, '');
    const value = process.argv[index + 1];
    if (!key || value === undefined) throw new Error('Arguments must use --name value pairs');
    result[key] = value;
  }
  return result;
}

function canonical(payload) {
  return JSON.stringify({ version: payload.version, licenseId: payload.licenseId, customerName: payload.customerName, deviceId: payload.deviceId, issuedAt: payload.issuedAt, expiresAt: payload.expiresAt, features: [...payload.features].sort() });
}

const options = args();
if (!options['private-key'] || !options.device || !options.customer || !options.out) throw new Error('Required: --private-key --device --customer --out');
if (!/^MK-[A-F0-9]{4}(?:-[A-F0-9]{4}){5}$/.test(options.device)) throw new Error('Invalid Maktoob device ID');
const expiresAt = options.expires ? new Date(`${options.expires}T23:59:59.999Z`).toISOString() : null;
if (options.expires && Number.isNaN(Date.parse(expiresAt))) throw new Error('Invalid expiry date; use YYYY-MM-DD');
const payload = {
  version: 1,
  licenseId: randomUUID(),
  customerName: options.customer.trim(),
  deviceId: options.device,
  issuedAt: new Date().toISOString(),
  expiresAt,
  features: [...new Set((options.features || 'core,templates').split(',').map((feature) => feature.trim()).filter(Boolean))],
};
if (!payload.customerName) throw new Error('Customer name is required');
if (!payload.features.includes('core')) throw new Error('License features must include core');
const privateKey = await readFile(path.resolve(options['private-key']), 'utf8');
const signature = sign(null, Buffer.from(canonical(payload)), privateKey).toString('base64');
const outputPath = path.resolve(options.out);
await writeFile(outputPath, `${JSON.stringify({ payload, signature }, null, 2)}\n`, { flag: 'wx' });
console.log(`License created: ${outputPath}`);
