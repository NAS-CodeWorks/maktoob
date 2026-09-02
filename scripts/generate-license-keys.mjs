import { generateKeyPairSync } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve(process.argv[2] || 'license-authority');
const privatePath = path.join(outputDirectory, 'maktoob-license-private.pem');
const publicPath = path.join(outputDirectory, 'license-public.pem');

for (const target of [privatePath, publicPath]) {
  try { await access(target); throw new Error(`Refusing to overwrite existing key: ${target}`); } catch (error) { if (error instanceof Error && error.message.startsWith('Refusing')) throw error; }
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
await mkdir(outputDirectory, { recursive: true });
await writeFile(privatePath, privateKey, { mode: 0o600 });
await writeFile(publicPath, publicKey, { mode: 0o644 });
console.log(`Keys created in ${outputDirectory}`);

