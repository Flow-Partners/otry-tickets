// Sets a ticket's status and, for Done, ticks all its subtasks.
// Usage: node tools/set-status.mjs T-0034 Done|"In Progress"|Todo|Blocked [reason]
import fs from 'node:fs';
import path from 'node:path';
const [id, status, ...reason] = process.argv.slice(2);
if (!id || !['Todo', 'In Progress', 'Done', 'Blocked'].includes(status)) {
  console.error('usage: set-status.mjs <T-id> <Todo|In Progress|Done|Blocked> [reason]'); process.exit(1);
}
const file = path.join(process.cwd(), 'tickets', `${id}.md`);
let t = fs.readFileSync(file, 'utf8');
t = t.replace(/^status: .*$/m, `status: ${status}`).replace(/^blocked: .*$/m, `blocked: ${status === 'Blocked'}`);
if (status === 'Done') {
  const [head, rest = ''] = t.split(/(?=\n## Subtasks\n)/);
  t = head + rest.replace(/^- \[ \] /gm, '- [x] ');
}
if (status === 'Blocked' && reason.length) t = t.replace(/\n## Blocked\n[\s\S]*?(?=\n## |$)/, '') + `\n## Blocked\n\n${reason.join(' ')}\n`;
fs.writeFileSync(file, t);
console.log(`${id} -> ${status}`);
