import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { canonicalLicensePayload, verifySignedLicense } from '../dist-electron/electron/licensing.js';

const deviceId = 'MK-1111-2222-3333-4444-5555-6666';
const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

function signedLicense(overrides = {}) {
  const payload = {
    version: 1,
    licenseId: 'license-test-001',
    customerName: 'مكتب الاختبار',
    deviceId,
    issuedAt: '2026-09-02T00:00:00.000Z',
    expiresAt: null,
    features: ['templates', 'core'],
    ...overrides,
  };
  const signature = sign(null, Buffer.from(canonicalLicensePayload(payload)), privateKey).toString('base64');
  return JSON.stringify({ payload, signature });
}

test('accepts an authentic license for the current device', () => {
  const result = verifySignedLicense(signedLicense(), publicKey, deviceId, new Date('2026-09-03'));
  assert.equal(result.status, 'active');
  assert.equal(result.payload?.customerName, 'مكتب الاختبار');
});

test('rejects wrong-device, expired, and tampered licenses', () => {
  assert.equal(verifySignedLicense(signedLicense(), publicKey, 'MK-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF').status, 'wrong_device');
  assert.equal(verifySignedLicense(signedLicense({ expiresAt: '2026-09-01T23:59:59.999Z' }), publicKey, deviceId, new Date('2026-09-03')).status, 'expired');
  const tampered = JSON.parse(signedLicense());
  tampered.payload.customerName = 'اسم مزور';
  assert.equal(verifySignedLicense(JSON.stringify(tampered), publicKey, deviceId).status, 'invalid');
});

test('rejects malformed licenses and invalid verifier configuration', () => {
  assert.equal(verifySignedLicense('{broken', publicKey, deviceId).status, 'invalid');
  assert.equal(verifySignedLicense(signedLicense(), 'not-a-public-key', deviceId).status, 'configuration_error');
  assert.equal(verifySignedLicense(signedLicense({ features: ['templates'] }), publicKey, deviceId).status, 'invalid');
});
