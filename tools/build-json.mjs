// Builds tickets.json from tickets/*.md. The Markdown files are the source of truth.
// Usage: node tools/build-json.mjs [repoRoot]
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || process.cwd();
const dir = path.join(root, 'tickets');

function parse(file) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const fm = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const list = v => (v || '').replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean);
  const boxes = [...m[2].matchAll(/^- \[( |x|X)\] /gm)];
  const subs = m[2].split(/\n## Subtasks\n/)[1]?.split(/\n## /)[0] ?? '';
  const sub = [...subs.matchAll(/^- \[( |x|X)\] /gm)];
  return {
    id: fm.id, type: fm.type, parent: fm.parent === '-' ? '' : fm.parent, module: fm.module,
    title: fm.title.replace(/^"|"$/g, '').replace(/\\"/g, '"'), priority: fm.priority, status: fm.status,
    hours: Number(fm.estimate_hours) || 0, sprint: fm.sprint, start: fm.start, due: fm.due,
    depends_on: list(fm.depends_on), blocked: fm.blocked === 'true',
    subtasks: sub.length, subtasks_done: sub.filter(b => b[1] !== ' ').length,
    block_reason: (m[2].split(/\n## Blocked\n\n/)[1] || '').split('\n')[0].trim(),
  };
}

const rows = fs.readdirSync(dir).filter(f => /^T-\d+\.md$/.test(f)).sort().map(parse);
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const kids = id => rows.filter(r => r.parent === id);

// Task progress: Done = 100%, otherwise the share of ticked subtasks.
for (const r of rows.filter(r => r.type === 'task')) {
  const ratio = r.status === 'Done' ? 1 : r.subtasks ? r.subtasks_done / r.subtasks : 0;
  r.done_hours = Math.round(r.hours * ratio * 2) / 2;
  if (r.status !== 'Blocked' && r.status !== 'Done' && ratio > 0) r.status = 'In Progress';
  if (r.status === 'Todo' && ratio === 1) r.status = 'Done';
}
// Roll up stories, then epics.
const roll = (r, parts) => {
  r.hours = parts.reduce((a, p) => a + p.hours, 0);
  r.done_hours = parts.reduce((a, p) => a + p.done_hours, 0);
  r.subtasks = parts.reduce((a, p) => a + p.subtasks, 0);
  r.subtasks_done = parts.reduce((a, p) => a + p.subtasks_done, 0);
  const st = parts.map(p => p.status);
  r.status = st.length && st.every(s => s === 'Done') ? 'Done'
    : st.some(s => s === 'Done' || s === 'In Progress') ? 'In Progress'
    : st.includes('Blocked') ? 'Blocked' : 'Todo';
  r.blocked = r.blocked || st.includes('Blocked');
};
for (const s of rows.filter(r => r.type === 'story')) roll(s, kids(s.id));
for (const e of rows.filter(r => r.type === 'epic')) {
  roll(e, kids(e.id));
  const open = e.depends_on.filter(d => byId[d] && byId[d].status !== 'Done');
  if (e.status !== 'Done' && !e.blocked && open.length && e.start <= new Date().toISOString().slice(0, 10)) {
    e.blocked = true; e.block_reason = 'Waiting on ' + open.map(d => byId[d].title).join(', ');
  }
}
const moduleName = Object.fromEntries(rows.filter(r => r.type === 'epic').map(e => [e.module, e.title]));

const out = rows.map(r => ({
  id: r.id, type: r.type, parent: r.parent, module: r.module, module_name: moduleName[r.module] || r.module,
  title: r.title, priority: r.priority, status: r.status,
  percent: r.hours ? Math.round(100 * (r.done_hours ?? 0) / r.hours) : 0,
  hours: r.hours, done_hours: r.done_hours ?? 0, sprint: r.sprint, start: r.start, due: r.due,
  depends_on: r.depends_on.join(' '), blocked: r.blocked ? 'yes' : 'no', block_reason: r.block_reason,
  subtasks: r.subtasks, subtasks_done: r.subtasks_done,
}));
const meta = [
  { label: 'Source', value: 'tickets/*.md in Flow-Partners/otry-tickets' },
  { label: 'Built by', value: 'tools/build-json.mjs' },
];
fs.writeFileSync(path.join(root, 'tickets.json'), JSON.stringify({ rows: out, meta }) + '\n');
// Refresh the board table in README.md (epics only).
const readmePath = path.join(root, 'README.md');
if (fs.existsSync(readmePath)) {
  const epicsOut = out.filter(r => r.type === 'epic');
  const board = ['| Ticket | Title | Priority | Status | Sprint | % | Assignee |', '|--------|-------|----------|--------|--------|---|----------|',
    ...epicsOut.map(e => `| [${e.id}](tickets/${e.id}.md) | ${e.title} | ${e.priority} | ${e.status}${e.blocked === 'yes' ? ' (blocked)' : ''} | ${e.sprint} | ${e.percent}% | unassigned |`)].join('\n');
  const readme = fs.readFileSync(readmePath, 'utf8');
  fs.writeFileSync(readmePath, readme.replace(/<!-- board:start -->[\s\S]*<!-- board:end -->/, `<!-- board:start -->\n${board}\n<!-- board:end -->`));
}
const tasks = out.filter(r => r.type === 'task');
const total = tasks.reduce((a, r) => a + r.hours, 0), done = tasks.reduce((a, r) => a + r.done_hours, 0);
console.log(`${out.length} tickets, ${tasks.filter(t => t.status === 'Done').length}/${tasks.length} tasks done, ${Math.round(100 * done / total)}% by hours`);
