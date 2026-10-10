import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Offline CI tooling only; never imported by the app.
export function selectChannels(releases) {
  const selected = {};
  for (const release of releases) {
    if (release.draft) continue;
    const match = /^ota-(production|testing)-([1-9]\d*)$/.exec(release.tag_name ?? '');
    if (!match) continue;
    const [, channel, counter] = match, sequence = Number(counter);
    if (!Number.isSafeInteger(sequence)) throw new Error('Invalid release sequence');
    if (!selected[channel] || sequence > selected[channel].sequence) selected[channel] = { tag: release.tag_name, sequence };
  }
  return selected;
}

export async function preparePages(input, output, publicPem, selected) {
  const key = createPublicKey(publicPem);
  if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error('RSA 2048+ public key required');
  await mkdir(output, { recursive: true });
  for (const [channel, release] of Object.entries(selected)) {
    const root = join(input, channel);
    const raw = await readFile(join(root, `${channel}.json`));
    const envelope = JSON.parse(raw.toString());
    const payload = Buffer.from(envelope.payload, 'base64');
    if (!verify('RSA-SHA256', payload, key, Buffer.from(envelope.signature, 'base64'))) throw new Error('Invalid channel signature');
    const m = JSON.parse(payload.toString());
    const name = `${m.sequence}-${m.version}.zip`;
    if (m.appId !== 'app.smartautolauncher' || m.schema !== 1 || m.kind !== 'ota' || m.channel !== channel || m.sequence !== release.sequence
        || !/^\d+\.\d+\.\d+$/.test(m.version) || new URL(m.url).protocol !== 'https:' || new URL(m.url).pathname.split('/').pop() !== name) throw new Error('Invalid channel metadata');
    const bytes = await readFile(join(root, name));
    if (bytes.length !== m.bytes || bytes.length > 50 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== m.sha256) throw new Error('Invalid archive integrity');
    await copyFile(join(root, name), join(output, name));
    await writeFile(join(output, `${channel}.json`), raw);
  }
  await writeFile(join(output, '.nojekyll'), '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, source, target, keyFile] = process.argv.slice(2);
  if (command === 'select') {
    const pages = JSON.parse(await readFile(source, 'utf8'));
    await writeFile(target, JSON.stringify(selectChannels(pages.flat())));
  } else if (command === 'pages') {
    const selected = JSON.parse(await readFile(join(source, 'selected.json'), 'utf8'));
    await preparePages(source, target, await readFile(keyFile, 'utf8'), selected);
  } else throw new Error('Usage: github-ota.mjs select releases.json selected.json | pages input output public.pem');
}