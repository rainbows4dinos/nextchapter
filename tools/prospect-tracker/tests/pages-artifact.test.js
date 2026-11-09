import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, symlink, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workflow = await readFile(new URL('../../../.github/workflows/pages.yml', import.meta.url), 'utf8');
const script = fileURLToPath(new URL('../scripts/prepare-pages.mjs', import.meta.url));

for (const hasConfig of [true, false]) test(`Pages packages tracked site despite a dangling prototype dependency symlink (public config: ${hasConfig})`, async () => {
  const temp = await mkdtemp(join(tmpdir(), 'nextchapter-pages-test-'));
  const root = join(temp, 'checkout'), staged = join(temp, 'pages');
  try {
    await mkdir(join(root, 'tools/prospect-tracker'), { recursive: true });
    await mkdir(join(root, '.Designbase/prototype'), { recursive: true });
    await writeFile(join(root, 'index.html'), 'Current landing page');
    await writeFile(join(root, '.nojekyll'), '');
    await writeFile(join(root, 'tools/prospect-tracker/model.js'), "export const STATUSES = ['prospect', 'hired'];");
    await symlink('/missing/local/designbase/node_modules', join(root, '.Designbase/prototype/node_modules'));
    execFileSync('git', ['init', '-q', root]);
    execFileSync('git', ['-C', root, 'add', '.']);
    // Generated and untracked files arrive after checkout, like the Actions job.
    if (hasConfig) await writeFile(join(root, 'tools/prospect-tracker/public-env.js'), 'export default {SUPABASE_PUBLISHABLE_KEY:"sb_publishable_synthetic"};');
    await writeFile(join(root, 'career-radar-private-backup.json'), 'Synthetic untracked data must not be uploaded');
    await writeFile(join(root, 'tools/prospect-tracker/model.js'), "export const STATUSES = ['prospect', 'hired']; // current working bytes");
    const prepared = workflow.includes('node tools/prospect-tracker/scripts/prepare-pages.mjs');
    if (prepared) execFileSync(process.execPath, [script, staged], { cwd: root });
    // Reproduce upload-pages-artifact's symlink-dereferencing tar, not just copying.
    const artifactRoot = prepared ? staged : root;
    execFileSync('tar', ['-chf', join(temp, 'artifact.tar'), '-C', artifactRoot, '.'], { stdio: 'pipe' });
    assert.equal(await readFile(join(artifactRoot, 'tools/prospect-tracker/model.js'), 'utf8'), "export const STATUSES = ['prospect', 'hired']; // current working bytes");
    if (hasConfig) assert.match(await readFile(join(artifactRoot, 'tools/prospect-tracker/public-env.js'), 'utf8'), /sb_publishable_synthetic/);
    else await assert.rejects(readFile(join(artifactRoot, 'tools/prospect-tracker/public-env.js')), { code: 'ENOENT' });
    const files = await readdir(artifactRoot);
    assert.ok(files.includes('.nojekyll'));
    assert.ok(!files.includes('.Designbase'));
    assert.ok(!files.includes('career-radar-private-backup.json'));
    assert.match(workflow, /path: \$\{\{ runner.temp \}\}\/nextchapter-pages/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
