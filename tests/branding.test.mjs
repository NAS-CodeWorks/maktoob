import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import { MaktoobDatabase } from '../dist-electron/electron/database.js';

test('branding: vector icon and multi-resolution ICO exist and have correct formats', async () => {
  const svgPath = path.resolve('resources/branding/maktoob-icon.svg');
  const svgContent = await readFile(svgPath, 'utf8');
  assert.ok(svgContent.includes('<svg'));
  assert.ok(svgContent.includes('م'));

  const icoPath = path.resolve('resources/branding/maktoob.ico');
  const icoStats = await stat(icoPath);
  assert.ok(icoStats.size > 5000, 'ICO file must contain multi-resolution frames');

  const icoBuffer = await readFile(icoPath);
  assert.equal(icoBuffer.readUInt16LE(0), 0, 'ICO reserved must be 0');
  assert.equal(icoBuffer.readUInt16LE(2), 1, 'ICO type must be 1');
  const imageCount = icoBuffer.readUInt16LE(4);
  assert.ok(imageCount >= 5, `Expected at least 5 icon resolutions, got ${imageCount}`);
});

test('branding: startup splash exists and contains product name and tagline', async () => {
  const splashPath = path.resolve('resources/branding/splash.html');
  const splashHtml = await readFile(splashPath, 'utf8');
  assert.ok(splashHtml.includes('مكتوب'));
  assert.ok(splashHtml.includes('من السجلات إلى الديسكتوب'));
  assert.ok(splashHtml.includes('ambient-glow'));
  assert.ok(splashHtml.includes('fade-out'));
});

test('branding: office branding architecture prepared for logo storage', async () => {
  const tempDbPath = path.resolve('resources/branding/temp-branding-test.sqlite');
  try {
    const db = new MaktoobDatabase(tempDbPath);
    const profile = db.getOfficeProfile();
    assert.equal(profile.logoData, null);

    const testLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const updated = db.updateOfficeProfile({ ...profile, logoData: testLogo });
    assert.equal(updated.logoData, testLogo);

    // Verify persistence across reload
    db.close();
    const reopenedDb = new MaktoobDatabase(tempDbPath);
    assert.equal(reopenedDb.getOfficeProfile().logoData, testLogo);
    reopenedDb.close();
  } finally {
    const { rm } = await import('node:fs/promises');
    await rm(tempDbPath, { force: true });
    await rm(`${tempDbPath}-wal`, { force: true });
    await rm(`${tempDbPath}-shm`, { force: true });
  }
});
