import { createHash, createPrivateKey, sign } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, lstat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

export async function publishOta({ input, output, manifest, keyFile }) {
  const m = JSON.parse(await readFile(manifest, 'utf8'));
  if (m.schema !== 1 || m.appId !== 'app.smartautolauncher' || !Number.isSafeInteger(m.sequence) || m.sequence < 1
      || !/^\d+\.\d+\.\d+$/.test(m.version) || !['ota', 'native'].includes(m.kind)
      || !['production', 'testing'].includes(m.channel) || !Number.isSafeInteger(m.minNativeCode)
      || !Number.isSafeInteger(m.maxNativeCode) || m.maxNativeCode < m.minNativeCode
      || !/^\d+\.\d+\.\d+$/.test(m.minLauncherVersion) || m.bridgeRevision !== 1
      || !Number.isSafeInteger(m.publishedAt) || !Number.isSafeInteger(m.expiresAt) || m.expiresAt <= m.publishedAt
      || typeof m.notes !== 'string' || m.notes.length > 4000) throw new Error('Invalid release metadata');
  const url = new URL(m.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('HTTPS package URL required');
  await mkdir(output, { recursive: true });
  if (m.kind === 'ota') {
    const root = resolve(input), entries = [];
    async function inspect(dir) {
      for (const name of await readdir(dir)) {
        const full = join(dir, name), local = relative(root, full), stat = await lstat(full);
        if (stat.isSymbolicLink() || name.startsWith('.') || /^(node_modules|server|android)$/.test(name)
            || /\.(jks|keystore|pem|key|map)$/i.test(name) || name === 'capacitor.config.json' || /[\r\n]/.test(name)) throw new Error(`Forbidden bundle entry: ${local}`);
        if (stat.isDirectory()) await inspect(full);
        else if (stat.isFile()) entries.push(local);
      }
    }
    await inspect(root);
    if (!entries.includes('index.html')) throw new Error('Offline index.html required at bundle root');
    const zip = resolve(output, `${m.sequence}-${m.version}.zip`);
    try { await lstat(zip); throw new Error('Release archive already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    execFileSync('zip', ['-q', zip, '-@'], { cwd: root, input: entries.join('\n') + '\n' });
    const bytes = await readFile(zip);
    if (bytes.length > 50 * 1024 * 1024) throw new Error('Bundle exceeds 50 MiB');
    m.bytes = bytes.length; m.sha256 = createHash('sha256').update(bytes).digest('hex');
    if (url.pathname.split('/').pop() !== `${m.sequence}-${m.version}.zip`) throw new Error('URL must identify the release archive');
    await writeFile(join(output, 'entries.txt'), entries.join('\n') + '\n');
  }
  const privateKey = createPrivateKey(await readFile(keyFile));
  if (privateKey.asymmetricKeyType !== 'rsa' || (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error('RSA 2048+ signing key required');
  const payload = Buffer.from(JSON.stringify(m));
  const envelope = { payload: payload.toString('base64'), signature: sign('RSA-SHA256', payload, privateKey).toString('base64') };
  await writeFile(join(output, `${m.channel}.json`), JSON.stringify(envelope));
  await writeFile(join(output, 'release.json'), JSON.stringify(m, null, 2));
  return m;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output, manifest, keyFile] = process.argv.slice(2);
  if (!input || !output || !manifest || !keyFile) throw new Error('Usage: package-ota.mjs dist/client /tmp/release metadata.json /secure/private.pem');
  await publishOta({ input, output, manifest, keyFile });
  console.log('Signed release prepared. Publish immutable zip first, then channel manifest atomically.');
}