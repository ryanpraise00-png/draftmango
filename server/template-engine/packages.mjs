// Immutable, server-owned exports. The download URL is an identifier, never an
// authorization capability. Every download still needs a valid bearer token.
import {mkdir, readFile, writeFile, readdir, stat, link, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {gzip, gunzip} from 'node:zlib';
import {promisify} from 'node:util';
import {templateFiles} from './index.mjs';
import {hash, validateManifest} from './design-policy.mjs';
import {RemoteError} from '../template-access.mjs';

const compress = promisify(gzip), decompress = promisify(gunzip);
const maxRaw = 48 * 1024 * 1024, maxArchive = 32 * 1024 * 1024;
const idPattern = /^[a-z][a-z0-9-]{0,70}$/, versionPattern = /^[a-f0-9]{64}$/;
export class TemplatePackages {
  constructor({directory = process.env.DRAFTMANGO_TEMPLATE_PACKAGES_DIR || fileURLToPath(new URL('../../data/template-packages/', import.meta.url)), load = templateFiles, quota = 1024 * 1024 * 1024} = {}) {
    this.directory = path.resolve(directory); this.load = load; this.quota = quota;
  }
  filename(id, version) {
    if (!idPattern.test(id) || !versionPattern.test(version)) throw new RemoteError(400, 'invalid_package');
    return path.join(this.directory, `${id}.${version}.json.gz`);
  }
  async read(id, version) {
    const filename = this.filename(id, version);
    let info;
    try {info = await stat(filename);} catch (e) {if (e.code === 'ENOENT') return null; throw e;}
    if (!info.isFile() || info.size > maxArchive) throw new RemoteError(503, 'invalid_archive');
    const bytes = await readFile(filename);
    const raw = await decompress(bytes, {maxOutputLength:maxRaw});
    const bundle = JSON.parse(raw.toString('utf8'));
    validateManifest(bundle.manifest);
    if (bundle.template?.id !== id || bundle.template?.version !== version || bundle.manifest.template.id !== id || bundle.manifest.template.version !== version) throw new RemoteError(503, 'invalid_archive');
    return {bytes, bundle, sha256:hash(bytes)};
  }
  async ensure(id, version) {
    if (!idPattern.test(id) || (version !== undefined && !versionPattern.test(version))) throw new RemoteError(400, 'invalid_package');
    if (version) {const saved = await this.read(id, version); if (saved) return saved;}
    const bundle = await this.load(id);
    if (version && bundle.template.version !== version) throw new RemoteError(404, 'template_version_unavailable');
    version = bundle.template.version;
    const saved = await this.read(id, version); if (saved) return saved;
    const raw = Buffer.from(JSON.stringify(bundle));
    if (raw.length > maxRaw) throw new RemoteError(413, 'package_too_large');
    const bytes = await compress(raw, {level:6});
    if (bytes.length > maxArchive) throw new RemoteError(413, 'package_too_large');
    await mkdir(this.directory, {recursive:true, mode:0o700});
    let total = 0;
    const entries = await readdir(this.directory, {withFileTypes:true});
    if (entries.length > 2000) throw new RemoteError(507, 'package_storage_full');
    for (const item of entries) if (item.isFile()) total += (await stat(path.join(this.directory,item.name))).size;
    if (total + bytes.length > this.quota) throw new RemoteError(507, 'package_storage_full');
    const destination = this.filename(id, version), temporary = path.join(this.directory, randomUUID()+'.tmp');
    await writeFile(temporary, bytes, {flag:'wx', mode:0o600});
    try {
      // Atomic, no replacement: concurrent gateways cannot overwrite a pinned
      // archive. Retain old versions across releases; never auto-evict them.
      try {await link(temporary, destination);} catch (e) {if (e.code !== 'EEXIST') throw e;}
    } finally {await unlink(temporary);}
    return this.read(id, version);
  }
}
