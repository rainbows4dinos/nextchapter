// Root copies preserve published raw GitHub/Pages URLs for cached clients.
// Edit docs/career-context/, then run this script and commit both copies together.
import { readFile, writeFile } from 'node:fs/promises';

const files = ['resume-master.md', 'experience-framing.md', 'voice-and-format.md', 'tone-and-positioning.md', 'rules.json'];
const check = process.argv.includes('--check');
for (const name of files) {
  const source = await readFile(new URL(`../../../docs/career-context/${name}`, import.meta.url));
  const target = new URL(`../../../${name}`, import.meta.url);
  if (check) {
    const copy = await readFile(target);
    if (!source.equals(copy)) throw new Error(`${name} is stale. Run node tools/prospect-tracker/scripts/sync-context.js`);
  } else {
    await writeFile(target, source);
  }
}
console.log(check ? 'Career context compatibility copies match.' : 'Career context compatibility copies updated.');
