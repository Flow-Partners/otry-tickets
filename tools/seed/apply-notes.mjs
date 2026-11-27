// Appends/refreshes a "Technical notes" section on every epic from tech-notes.mjs. Safe to re-run.
import fs from 'node:fs';
import { notes } from './tech-notes.mjs';
const START = '<!-- tech:start -->', END = '<!-- tech:end -->';
let n = 0;
for (const f of fs.readdirSync('tickets').filter(f => /^T-\d+\.md$/.test(f))) {
  let t = fs.readFileSync(`tickets/${f}`, 'utf8');
  if (!/^type: epic$/m.test(t)) continue;
  const key = t.match(/^module: (\w+)$/m)[1];
  const o = notes[key]; if (!o) continue;
  const list = (title, arr, empty) => `### ${title}\n\n${arr.length ? arr.map(x => `- ${x}`).join('\n') : `- ${empty}`}\n`;
  const block = `${START}\n## Technical notes\n\n${list('Database', o.tables, 'No new tables')}\n${list('API', o.endpoints, 'No new endpoints')}\n${list('Screens', o.screens, 'No screens')}\n${list('Open questions', o.open, 'None')}${END}\n`;
  t = t.includes(START) ? t.replace(new RegExp(`${START}[\\s\\S]*?${END}\\n?`), block) : t.replace(/\n*$/, '\n\n') + block;
  fs.writeFileSync(`tickets/${f}`, t); n++;
}
console.log(`notes applied to ${n} epics`);
