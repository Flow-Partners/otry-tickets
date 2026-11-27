// Ticks subtasks whose text contains the given substring(s).
// Usage: node tools/tick.mjs T-0053 "CRUD endpoints" ["another substring" ...]
import fs from 'node:fs';
import path from 'node:path';
const [id, ...needles] = process.argv.slice(2);
if (!id || needles.length === 0) { console.error('usage: tick.mjs <T-id> <substring> [...]'); process.exit(1); }
const file = path.join(process.cwd(), 'tickets', `${id}.md`);
const lines = fs.readFileSync(file, 'utf8').split('\n');
let hit = 0;
for (let i = 0; i < lines.length; i++) {
  if (/^- \[ \] /.test(lines[i]) && needles.some(n => lines[i].includes(n))) { lines[i] = lines[i].replace('- [ ] ', '- [x] '); hit++; }
}
fs.writeFileSync(file, lines.join('\n'));
console.log(`${id}: ticked ${hit} of ${needles.length} requested`);
