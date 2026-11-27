// One-off: adds the "Settings & Receipts" module (spec 4: Settings, payment methods, receipt layout) that the first backlog missed.
import fs from 'node:fs';
const fm = (o) => ['---', `id: ${o.id}`, `type: ${o.type}`, `module: SET`, `parent: ${o.parent || '-'}`, `title: "${o.title}"`, `priority: ${o.priority}`,
  `status: Todo`, `percent_complete: 0`, `estimate_hours: ${o.hours || 0}`, `sprint: S2`, `start: 2026-12-28`, `due: 2027-01-10`,
  `depends_on: [${(o.deps || []).join(', ')}]`, `blocked: false`, `labels: [${o.type}${o.label ? ', ' + o.label : ''}]`, 'assignee: unassigned', '---', ''].join('\n');
const link = (id, t) => `- [${id}](${id}.md) ${t}`;
const write = (o, body) => fs.writeFileSync(`tickets/${o.id}.md`, fm(o) + `# ${o.id} — ${o.title}\n\n` + body);

const epic = { id: 'T-0279', type: 'epic', title: 'Settings & Receipts', priority: 'P1', deps: ['T-0001', 'T-0002'] };
const stories = [
  { id: 'T-0280', title: 'Store settings', ac: ['Store name, address, phone, currency and receipt footer are editable by Admin only', 'Settings are read by billing and receipts without a redeploy', 'Changes are audited'],
    tasks: [['T-0281', 'API', 6, ['Store settings keys on the existing SystemSettings table', 'GET/PUT api/settings/store with validation', 'Cache with invalidation on save']],
            ['T-0282', 'UI', 6, ['Settings > Store screen', 'Form validation and save feedback']],
            ['T-0283', 'QA', 4, ['Non-admin forbidden', 'Boundary: max lengths, empty required values', 'Audit entry written on change']]] },
  { id: 'T-0284', title: 'Receipt layout and bill printing', ac: ['Receipt shows store details, items, discount, payment, change and bill number', 'Layout is chosen from templates and previewed before printing', 'Reprints are marked as copies'],
    tasks: [['T-0285', 'API', 8, ['Receipt token set for the existing printing module', 'Render receipt from a finalised bill', 'Copy marker for reprints']],
            ['T-0286', 'UI', 8, ['Template picker with live preview', 'Print button wired to the billing and bill-history screens']],
            ['T-0287', 'QA', 5, ['Receipt totals equal bill totals', 'Missing printer returns a clear error', 'Reprint is labelled as a copy']]] },
  { id: 'T-0288', title: 'Payment methods', ac: ['Cash, Card, Credit and Other exist by default', 'Admin can add, rename and deactivate methods; a method used on a bill cannot be deleted', 'Credit is flagged so billing asks for a customer'],
    tasks: [['T-0289', 'DB', 4, ['PaymentMethods table (Id, Name, Kind, IsActive) with unique name', 'Seed the four default methods (idempotent)']],
            ['T-0290', 'API', 8, ['CRUD endpoints with paging', 'Block delete when in use; deactivate instead']],
            ['T-0291', 'UI', 6, ['Payment methods settings screen']],
            ['T-0292', 'QA', 5, ['Duplicate name rejected', 'Delete in use returns conflict', 'Inactive method not offered at billing']]] },
];
const ids = [];
let storyHours = 0;
for (const s of stories) {
  let h = 0, prev = null, apiId = null; const taskLinks = [];
  for (const [id, label, hours, subs] of s.tasks) {
    const dep = label === 'QA' ? (apiId ? [apiId] : []) : (prev ? [prev] : []);
    write({ id, type: 'task', parent: s.id, title: `${s.title} — ${label}`, priority: 'P1', hours, label: label.toLowerCase(), deps: dep },
      `Part of [${s.id}](${s.id}.md) ${s.title}.\n\n## Subtasks\n\n${subs.map(x => `- [ ] ${x}`).join('\n')}\n\n## Acceptance criteria (from story)\n\n${s.ac.map(a => `- ${a}`).join('\n')}\n`
      + (dep.length ? `\n## Depends on\n\n${dep.map(d => `- [${d}](${d}.md)`).join('\n')}\n` : ''));
    if (label === 'API') apiId = id; prev = id; h += hours; taskLinks.push(link(id, `${s.title} — ${label} (Todo, ${hours} h)`));
  }
  write({ id: s.id, type: 'story', parent: epic.id, title: s.title, priority: 'P1', hours: h },
    `Part of [${epic.id}](${epic.id}.md) ${epic.title}.\n\n## Acceptance criteria\n\n${s.ac.map(a => `- [ ] ${a}`).join('\n')}\n\n## Tasks\n\n${taskLinks.join('\n')}\n`);
  ids.push(link(s.id, `${s.title} (Todo, ${h} h)`)); storyHours += h;
}
write({ ...epic, hours: storyHours },
  `Store settings, payment methods and receipt layout (spec section 4, Settings screen). Receipts reuse the template's existing printing module.\n\n## Stories\n\n${ids.join('\n')}\n\n## Depends on\n\n- [T-0001](T-0001.md) Foundation & Environment\n- [T-0002](T-0002.md) Users, Roles & Access\n`);
console.log('added T-0279..T-0292');
