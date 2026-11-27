import fs from 'node:fs';
import path from 'node:path';
import { modules, SPRINT_START, SPRINT_DAYS } from './backlog.mjs';

const OUT = process.argv[2];           // ticket repo root
const DATA_OUT = process.argv[3];      // dir for tickets.json
const TODAY = '2026-11-27';
const LAYER = { db:['DB',4], api:['API',8], ui:['UI',8], qa:['QA',5] };
const MULT = {1:1, 2:1.5, 3:2.2};
const pad = n => 'T-' + String(n).padStart(4, '0');
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0,10); };
const sprintStart = s => addDays(SPRINT_START, s * SPRINT_DAYS);
const sprintEnd = s => addDays(SPRINT_START, s * SPRINT_DAYS + SPRINT_DAYS - 1);

let n = 0;
const rows = [];
const files = [];
const epicId = {};

const subStatus = s => /\[done\]/.test(s) ? 'done' : /\[in progress\]/.test(s) ? 'doing' : 'todo';
const clean = s => s.replace(/\s*\[(done|in progress)\]/, '');

// Pass 1: epic ids (so dependencies can reference them)
for (const m of modules) epicId[m.key] = pad(++n);

// Pass 2
let nn = modules.length;
for (const m of modules) {
  const eid = epicId[m.key];
  const epicRow = { id:eid, type:'epic', parent:'', module:m.key, moduleName:m.name, title:m.name, priority:m.prio, sprint:m.sprint,
    start:sprintStart(m.sprint), due:sprintEnd(m.sprint), dependsOn:m.deps.map(d=>epicId[d]), hours:0, doneHours:0, status:'Todo', pct:0, subtasks:0, subtasksDone:0, labels:['epic'], blocked:false, blockReason:'' };
  rows.push(epicRow);
  const storyIds = [];
  m.stories.forEach(([stitle, size, ac, layers], si) => {
    const sid = pad(++nn);
    storyIds.push(sid);
    const storyRow = { id:sid, type:'story', parent:eid, module:m.key, moduleName:m.name, title:stitle, priority:m.prio, sprint:m.sprint,
      start:sprintStart(m.sprint), due:sprintEnd(m.sprint), dependsOn:[], hours:0, doneHours:0, status:'Todo', pct:0, subtasks:0, subtasksDone:0, labels:['story'], ac, blocked:false, blockReason:'' };
    rows.push(storyRow);
    const taskIds = [];
    let prevLayerId = null, apiId = null;
    for (const key of ['db','api','ui','qa']) {
      const subs = layers[key];
      if (!subs) continue;
      const tid = pad(++nn);
      const [lab, base] = LAYER[key];
      const hours = Math.round(base * MULT[size] * 2) / 2;
      const per = hours / subs.length;
      const sstat = subs.map(subStatus);
      const doneN = sstat.filter(x => x === 'done').length;
      const status = doneN === subs.length ? 'Done' : (doneN > 0 || sstat.includes('doing')) ? 'In Progress' : 'Todo';
      const doneHours = Math.round(per * doneN * 2) / 2;
      const dep = key === 'qa' ? (apiId ? [apiId] : (prevLayerId ? [prevLayerId] : [])) : (prevLayerId ? [prevLayerId] : []);
      const row = { id:tid, type:'task', parent:sid, module:m.key, moduleName:m.name, title:`${stitle} — ${lab}`, priority:m.prio, sprint:m.sprint,
        start:sprintStart(m.sprint), due:sprintEnd(m.sprint), dependsOn:dep, hours, doneHours, status, pct:Math.round(100*doneN/subs.length), subtasks:subs.length, subtasksDone:doneN,
        labels:['task', lab.toLowerCase()], subs:subs.map((s,i)=>({ text:clean(s), state:sstat[i] })), blocked:false, blockReason:'' };
      rows.push(row); taskIds.push(tid);
      if (key === 'api') apiId = tid;
      prevLayerId = tid;
      storyRow.hours += hours; storyRow.doneHours += doneHours;
      storyRow.subtasks += subs.length; storyRow.subtasksDone += doneN;
    }
    storyRow.taskIds = taskIds;
    const sts = rows.filter(r => r.parent === sid).map(r => r.status);
    storyRow.status = sts.every(s => s === 'Done') ? 'Done' : sts.some(s => s !== 'Todo') ? 'In Progress' : 'Todo';
    storyRow.pct = storyRow.hours ? Math.round(100 * storyRow.doneHours / storyRow.hours) : 0;
    epicRow.hours += storyRow.hours; epicRow.doneHours += storyRow.doneHours;
    epicRow.subtasks += storyRow.subtasks; epicRow.subtasksDone += storyRow.subtasksDone;
  });
  epicRow.storyIds = storyIds;
  const sts = rows.filter(r => r.parent === eid).map(r => r.status);
  epicRow.status = sts.every(s => s === 'Done') ? 'Done' : sts.some(s => s !== 'Todo') ? 'In Progress' : 'Todo';
  epicRow.pct = epicRow.hours ? Math.round(100 * epicRow.doneHours / epicRow.hours) : 0;
}

// Known blockers (real, from this session)
const fnd = modules.find(m => m.key === 'FND');
const blockers = [
  ['Ticket format spec (Skills/trp.md Part 3) not available — tickets use an assumed format','Requires the file from the project owner'],
  ['No push access from the build session to Flow-Partners/otry-tickets','Claude GitHub App must be installed on the repo'],
  ['No SQL Server 2008 R2 instance for migration and integration testing','Provide a test instance or connection details'],
];
const bStory = pad(++nn);
const fEpic = rows.find(r => r.id === epicId.FND);
rows.push({ id:bStory, type:'story', parent:fEpic.id, module:'FND', moduleName:fnd.name, title:'Environment blockers to clear', priority:'P0', sprint:0, start:sprintStart(0), due:sprintEnd(0), dependsOn:[], hours:3, doneHours:0, status:'Blocked', pct:0, subtasks:0, subtasksDone:0, labels:['story','blocker'], ac:['All three blockers resolved'], taskIds:[], blocked:true, blockReason:'See child tasks' });
fEpic.storyIds.push(bStory); fEpic.hours += 3;
const bStoryRow = rows.find(r => r.id === bStory);
for (const [t, why] of blockers) {
  const id = pad(++nn);
  rows.push({ id, type:'task', parent:bStory, module:'FND', moduleName:fnd.name, title:t, priority:'P0', sprint:0, start:sprintStart(0), due:sprintEnd(0), dependsOn:[], hours:1, doneHours:0, status:'Blocked', pct:0, subtasks:0, subtasksDone:0, labels:['task','blocker'], subs:[], blocked:true, blockReason:why });
  bStoryRow.taskIds.push(id);
}
fEpic.status = 'In Progress';
fEpic.pct = Math.round(100 * fEpic.doneHours / fEpic.hours);

// Dependency-based blocking: epics whose dependencies are not done and whose sprint has started
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const currentSprint = Math.max(0, Math.floor((new Date(TODAY) - new Date(SPRINT_START)) / 86400000 / SPRINT_DAYS));
for (const r of rows) {
  if (r.type === 'epic' && r.sprint <= currentSprint) {
    const open = r.dependsOn.filter(d => byId[d].status !== 'Done');
    if (open.length && r.status !== 'Done') { r.blocked = true; r.blockReason = 'Waiting on ' + open.map(d => byId[d].title).join(', '); }
  }
}

// Write markdown
const dir = path.join(OUT, 'tickets');
fs.mkdirSync(dir, { recursive: true });
for (const f of fs.readdirSync(dir)) if (/^T-\d+\.md$/.test(f)) fs.unlinkSync(path.join(dir, f));
const link = id => `[${id}](${id}.md)`;
for (const r of rows) {
  const fm = [
    '---', `id: ${r.id}`, `type: ${r.type}`, `module: ${r.module}`, `parent: ${r.parent || '-'}`, `title: "${r.title.replace(/"/g,'\\"')}"`,
    `priority: ${r.priority}`, `status: ${r.status}`, `percent_complete: ${r.pct}`, `estimate_hours: ${r.hours}`, `sprint: S${r.sprint}`,
    `start: ${r.start}`, `due: ${r.due}`, `depends_on: [${r.dependsOn.join(', ')}]`, `blocked: ${r.blocked}`, `labels: [${r.labels.join(', ')}]`, 'assignee: unassigned', '---', ''
  ];
  let body = `# ${r.id} — ${r.title}\n\n`;
  if (r.type === 'epic') {
    const m = modules.find(x => x.key === r.module);
    body += `${m.summary}\n\n## Stories\n\n` + r.storyIds.map(id => `- ${link(id)} ${byId[id].title} (${byId[id].status}, ${byId[id].hours} h)`).join('\n') + '\n';
    if (r.dependsOn.length) body += `\n## Depends on\n\n` + r.dependsOn.map(d => `- ${link(d)} ${byId[d].title}`).join('\n') + '\n';
  } else if (r.type === 'story') {
    body += `Part of ${link(r.parent)} ${byId[r.parent].title}.\n\n## Acceptance criteria\n\n` + r.ac.map(a => `- [ ] ${a}`).join('\n') + '\n\n## Tasks\n\n' + r.taskIds.map(id => `- ${link(id)} ${byId[id].title} (${byId[id].status}, ${byId[id].hours} h)`).join('\n') + '\n';
  } else {
    const story = byId[r.parent];
    body += `Part of ${link(story.id)} ${story.title}.\n\n## Subtasks\n\n` + (r.subs.length ? r.subs.map(s => `- [${s.state === 'done' ? 'x' : ' '}] ${s.text}`).join('\n') : '_none_') + '\n';
    if (story.ac) body += `\n## Acceptance criteria (from story)\n\n` + story.ac.map(a => `- ${a}`).join('\n') + '\n';
    if (r.dependsOn.length) body += `\n## Depends on\n\n` + r.dependsOn.map(d => `- ${link(d)} ${byId[d].title}`).join('\n') + '\n';
    if (r.blocked) body += `\n## Blocked\n\n${r.blockReason}\n`;
  }
  fs.writeFileSync(path.join(dir, r.id + '.md'), fm.join('\n') + body);
}

// Board in README (epics only, to keep it readable)
const readmePath = path.join(OUT, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');
const epics = rows.filter(r => r.type === 'epic');
const board = ['| Ticket | Title | Priority | Status | Sprint | % | Assignee |', '|--------|-------|----------|--------|--------|---|----------|',
  ...epics.map(e => `| [${e.id}](tickets/${e.id}.md) | ${e.title} | ${e.priority} | ${e.status}${e.blocked ? ' (blocked)' : ''} | S${e.sprint} | ${e.pct}% | unassigned |`)].join('\n');
readme = readme.replace(/<!-- board:start -->[\s\S]*<!-- board:end -->/, `<!-- board:start -->\n${board}\n<!-- board:end -->`);
fs.writeFileSync(readmePath, readme);

// Data for dashboard
const flat = rows.map(r => ({ id:r.id, type:r.type, parent:r.parent, module:r.module, module_name:r.moduleName, title:r.title, priority:r.priority,
  status:r.status, percent:r.pct, hours:r.hours, done_hours:r.doneHours, sprint:'S'+r.sprint, start:r.start, due:r.due,
  depends_on:r.dependsOn.join(' '), blocked:r.blocked ? 'yes' : 'no', block_reason:r.blockReason, subtasks:r.subtasks, subtasks_done:r.subtasksDone }));
fs.mkdirSync(DATA_OUT, { recursive: true });
fs.writeFileSync(path.join(DATA_OUT, 'tickets.json'), JSON.stringify({ rows: flat, meta: [{ label:'Source', value:'otry-tickets/tickets/*.md (generated by backlog.mjs)' }, { label:'Generated', value: TODAY }] }, null, 0));
const c = t => rows.filter(r => r.type === t).length;
console.log(`epics ${c('epic')} stories ${c('story')} tasks ${c('task')} total ${rows.length} hours ${rows.filter(r=>r.type==='task').reduce((a,b)=>a+b.hours,0)}`);
