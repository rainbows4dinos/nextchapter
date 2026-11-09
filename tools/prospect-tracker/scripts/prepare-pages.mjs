import { execFileSync } from 'node:child_process';
import { copyFile, lstat, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

// Preserve the static site's root-relative layout without uploading the checkout.
// Only tracked regular files plus the explicitly generated public config are copied.
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
if (!process.argv[2]) throw new Error('Supply an empty staging directory outside the checkout.');
const destination = resolve(process.argv[2]);
const fromRoot = relative(root, destination);
if (fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`)) throw new Error('Pages staging must be outside the checkout.');
await mkdir(destination, { recursive: true });
if ((await readdir(destination)).length) throw new Error('Pages staging directory must be empty.');
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const files = new Set(tracked.filter(path => !['.github', '.Designbase'].includes(path.split('/')[0])));
const config = 'tools/prospect-tracker/public-env.js';
try { await lstat(join(root, config)); files.add(config); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const path of files) {
  const source = join(root, path);
  // Never dereference a developer-machine symlink into a public artifact.
  if (!(await lstat(source)).isFile()) throw new Error(`Pages source must be a regular file: ${path}`);
  const target = join(destination, path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}
console.log(`Prepared ${files.size} public site files for Pages.`);
