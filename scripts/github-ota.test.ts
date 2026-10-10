// @vitest-environment node
import { expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';

it('selects the highest published sequence independently for both channels', async () => {
  const { selectChannels } = await import('./github-ota.mjs');
  expect(selectChannels([{ tag_name: 'ota-production-2' }, { tag_name: 'v9' }, { tag_name: 'ota-testing-8' }, { tag_name: 'ota-production-3' }, { tag_name: 'ota-production-10', draft: true }])).toEqual({ production: { tag: 'ota-production-3', sequence: 3 }, testing: { tag: 'ota-testing-8', sequence: 8 } });
});

it('mirrors signed archives unchanged and rejects tampered data', async () => {
  const { preparePages } = await import('./github-ota.mjs');
  const { publishOta } = await import('./package-ota.mjs');
  const root = await mkdtemp(join(tmpdir(), 'github-ota-'));
  try {
    const input = join(root, 'client'), downloads = join(root, 'downloads'), output = join(root, 'pages');
    await mkdir(input); await writeFile(join(input, 'index.html'), '<html>Launcher</html>');
    const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const key = join(root, 'private.pem'), metadata = join(root, 'metadata.json');
    await writeFile(key, keys.privateKey.export({ type: 'pkcs8', format: 'pem' }));
    for (const [channel, sequence] of [['testing', 2], ['production', 3]] as const) {
      await writeFile(metadata, JSON.stringify({ schema: 1, appId: 'app.smartautolauncher', sequence, version: '1.1.0', channel, kind: 'ota', minNativeCode: 1, maxNativeCode: 1, minLauncherVersion: '1.0.0', bridgeRevision: 1, publishedAt: Date.now(), expiresAt: Date.now() + 86400000, notes: 'Release', url: `https://owner.github.io/launcher/${sequence}-1.1.0.zip` }));
      await publishOta({ input, output: join(downloads, channel), manifest: metadata, keyFile: key });
    }
    const selected = { testing: { tag: 'ota-testing-2', sequence: 2 }, production: { tag: 'ota-production-3', sequence: 3 } };
    const publicPem = keys.publicKey.export({ type: 'spki', format: 'pem' });
    await preparePages(downloads, output, publicPem, selected);
    expect(await readFile(join(output, 'production.json'), 'utf8')).toBe(await readFile(join(downloads, 'production', 'production.json'), 'utf8'));
    expect(await readFile(join(output, '2-1.1.0.zip'))).toEqual(await readFile(join(downloads, 'testing', '2-1.1.0.zip')));
    await writeFile(join(downloads, 'testing', '2-1.1.0.zip'), 'corrupt');
    await expect(preparePages(downloads, join(root, 'bad'), publicPem, selected)).rejects.toThrow('Invalid archive integrity');
    const wrong = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'pem' });
    await expect(preparePages(downloads, join(root, 'wrong'), wrong, selected)).rejects.toThrow('Invalid channel signature');
  } finally { await rm(root, { recursive: true, force: true }); }
});