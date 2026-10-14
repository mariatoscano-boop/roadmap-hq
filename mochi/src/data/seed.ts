/**
 * Sample workspace so the app opens in a realistic, lived-in state. Dates are relative to today.
 * Tengu tasks match the "remote" copies held by the mock Tengu provider.
 */
import { addDays, today } from '../lib/dates';
import type { Activity, Member, Project, Task, Team } from '../types';

export const SEED_MEMBERS: Member[] = [
  { id: 'maria', name: 'Maria', initials: 'MT', color: 'pink', role: 'Product lead' },
  { id: 'bryan', name: 'Bryan', initials: 'BR', color: 'blue', role: 'Engineering' },
  { id: 'malika', name: 'Malika', initials: 'MA', color: 'violet', role: 'Design' },
  { id: 'natalia', name: 'Natalia', initials: 'NA', color: 'orange', role: 'Growth' },
];

export const SEED_PROJECTS: Project[] = [
  {
    id: 'fiji', name: 'FIJI', key: 'FIJI', color: 'pink', source: 'tengu', tenguSpaceId: 'space-fiji',
    memberIds: ['maria', 'bryan', 'natalia'],
    blurb: 'Buyer and broker matching platform.',
    milestones: [
      { id: 'fiji-1', name: 'Alpha', at: 0.25 },
      { id: 'fiji-2', name: 'Beta', at: 0.5 },
      { id: 'fiji-3', name: 'Launch prep', at: 0.75 },
      { id: 'fiji-4', name: 'Launch', at: 1 },
    ],
  },
  {
    id: 'dosify', name: 'Dosify', key: 'DOS', color: 'violet', source: 'tengu', tenguSpaceId: 'space-dosify',
    memberIds: ['maria', 'malika', 'bryan', 'natalia'],
    blurb: 'Marketing site and community launch.',
    milestones: [
      { id: 'dos-1', name: 'Wireframes', at: 0.25 },
      { id: 'dos-2', name: 'Design done', at: 0.5 },
      { id: 'dos-3', name: 'Content locked', at: 0.75 },
      { id: 'dos-4', name: 'Live', at: 1 },
    ],
  },
  {
    id: 'personal', name: 'Personal', key: 'ME', color: 'green', source: 'local',
    memberIds: ['maria'], ownerId: 'maria',
    blurb: 'Only you can see this.',
    milestones: [
      { id: 'me-1', name: 'Halfway', at: 0.5 },
      { id: 'me-2', name: 'Clear', at: 1 },
    ],
  },
];

export const SEED_TEAMS: Team[] = [
  { id: 'all', name: 'Prizm Studio', projectIds: ['fiji', 'dosify', 'personal'], memberIds: ['maria', 'bryan', 'malika', 'natalia'] },
  { id: 'fiji-team', name: 'FIJI Team', projectIds: ['fiji', 'personal'], memberIds: ['maria', 'bryan', 'natalia'] },
  { id: 'dosify-team', name: 'Dosify Team', projectIds: ['dosify', 'personal'], memberIds: ['maria', 'malika', 'bryan', 'natalia'] },
];

type Seed = Omit<Task, 'createdAt' | 'dueDate' | 'completedAt' | 'createdBy' | 'time'> & {
  due: number | null;
  time?: string;
  doneDaysAgo?: number;
  by?: string;
};

const T = (k: string) => ({ id: `tg-${k}`, key: k });

const SEED: Seed[] = [
  // FIJI
  { id: 't-fiji-1', title: 'Review Buyer Profile', projectId: 'fiji', source: 'tengu', status: 'progress', assigneeId: 'maria', due: 0, time: '09:30', priority: 'high', tengu: T('FIJI-142') },
  { id: 't-fiji-2', title: 'Send Bryan update', projectId: 'fiji', source: 'personal', status: 'todo', assigneeId: 'maria', due: 0, time: '14:00', priority: 'medium' },
  { id: 't-fiji-3', title: 'Review Broker Fit', projectId: 'fiji', source: 'tengu', status: 'done', assigneeId: 'maria', due: 0, doneDaysAgo: 0, priority: 'medium', tengu: T('FIJI-145') },
  { id: 't-fiji-4', title: 'Check staging', projectId: 'fiji', source: 'tengu', status: 'todo', assigneeId: 'maria', due: -1, priority: 'high', tengu: T('FIJI-151') },
  { id: 't-fiji-5', title: 'Fix auth redirect on staging', projectId: 'fiji', source: 'tengu', status: 'progress', assigneeId: 'bryan', due: 0, priority: 'urgent', tengu: T('FIJI-149') },
  { id: 't-fiji-6', title: 'Buyer profile QA pass', projectId: 'fiji', source: 'tengu', status: 'review', assigneeId: 'bryan', due: 0, priority: 'high', tengu: T('FIJI-150'), by: 'maria' },
  { id: 't-fiji-7', title: 'API rate limits for search', projectId: 'fiji', source: 'tengu', status: 'blocked', assigneeId: 'bryan', due: 1, priority: 'high', tengu: T('FIJI-147') },
  { id: 't-fiji-8', title: 'Broker onboarding emails', projectId: 'fiji', source: 'tengu', status: 'todo', assigneeId: 'natalia', due: 2, priority: 'medium', tengu: T('FIJI-153'), by: 'maria' },
  { id: 't-fiji-9', title: 'Buyer search filters', projectId: 'fiji', source: 'tengu', status: 'done', assigneeId: 'bryan', due: -2, doneDaysAgo: 2, priority: 'medium', tengu: T('FIJI-138') },
  { id: 't-fiji-10', title: 'Pricing tiers copy', projectId: 'fiji', source: 'tengu', status: 'done', assigneeId: 'natalia', due: -3, doneDaysAgo: 3, priority: 'low', tengu: T('FIJI-139') },
  { id: 't-fiji-11', title: 'Ask Bryan about copy', projectId: 'fiji', source: 'personal', status: 'todo', assigneeId: 'maria', due: 1, priority: 'medium' },
  // Dosify
  { id: 't-dos-1', title: 'Review landing hero', projectId: 'dosify', source: 'tengu', status: 'done', assigneeId: 'maria', due: 0, doneDaysAgo: 0, priority: 'medium', tengu: T('DOS-88') },
  { id: 't-dos-2', title: 'Finish Community page', projectId: 'dosify', source: 'tengu', status: 'progress', assigneeId: 'maria', due: 0, time: '11:00', priority: 'high', tengu: T('DOS-91') },
  { id: 't-dos-3', title: 'Mobile hero', projectId: 'dosify', source: 'tengu', status: 'review', assigneeId: 'malika', due: 0, priority: 'medium', tengu: T('DOS-92') },
  { id: 't-dos-4', title: 'Pricing section', projectId: 'dosify', source: 'tengu', status: 'done', assigneeId: 'malika', due: -1, doneDaysAgo: 1, priority: 'medium', tengu: T('DOS-95') },
  { id: 't-dos-5', title: 'FAQ', projectId: 'dosify', source: 'tengu', status: 'todo', assigneeId: 'natalia', due: 3, priority: 'low', tengu: T('DOS-97'), by: 'maria' },
  { id: 't-dos-6', title: 'Final CTA', projectId: 'dosify', source: 'tengu', status: 'todo', assigneeId: 'malika', due: 4, priority: 'medium', tengu: T('DOS-98') },
  { id: 't-dos-7', title: 'Community page illustrations', projectId: 'dosify', source: 'tengu', status: 'progress', assigneeId: 'malika', due: 1, priority: 'medium', tengu: T('DOS-93') },
  { id: 't-dos-8', title: 'Analytics events', projectId: 'dosify', source: 'tengu', status: 'blocked', assigneeId: 'bryan', due: 1, priority: 'medium', tengu: T('DOS-94'), by: 'maria' },
  { id: 't-dos-9', title: 'Record walkthrough', projectId: 'dosify', source: 'personal', status: 'todo', assigneeId: 'maria', due: 3, priority: 'low' },
  { id: 't-dos-10', title: 'Hero illustration set', projectId: 'dosify', source: 'tengu', status: 'done', assigneeId: 'malika', due: -4, doneDaysAgo: 4, priority: 'medium', tengu: T('DOS-84') },
  // Personal
  { id: 't-me-1', title: 'Book appointment', projectId: 'personal', source: 'personal', status: 'todo', assigneeId: 'maria', due: 0, time: '17:30', priority: 'medium' },
  { id: 't-me-2', title: 'Buy groceries', projectId: 'personal', source: 'personal', status: 'done', assigneeId: 'maria', due: 0, doneDaysAgo: 0, priority: 'low' },
  { id: 't-me-3', title: 'Make note for tomorrow', projectId: 'personal', source: 'personal', status: 'todo', assigneeId: 'maria', due: null, priority: 'low' },
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgoAt = (d: number, hour: number) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(hour, 15, 0, 0);
  // Never in the future
  return new Date(Math.min(x.getTime(), Date.now() - 20 * 60_000)).toISOString();
};

export function seedTasks(): Task[] {
  const t = today();
  return SEED.map(({ due, time, doneDaysAgo, by, ...s }, i) => ({
    ...s,
    dueDate: due === null ? null : addDays(t, due),
    time: time ?? null,
    createdBy: by ?? s.assigneeId,
    createdAt: hoursAgo(72 + i * 3),
    completedAt: doneDaysAgo === undefined ? null : daysAgoAt(doneDaysAgo, 10 + (i % 6)),
  }));
}

/** Recent team activity, including completions earlier this week (they drive the weekly chart). */
export function seedActivity(): Activity[] {
  const a = (id: string, actorId: string, verb: Activity['verb'], taskTitle: string, projectId: string, at: string, detail?: string, taskId?: string): Activity =>
    ({ id, actorId, verb, taskTitle, projectId, at, detail, taskId });
  return [
    a('a1', 'bryan', 'moved', 'Buyer profile QA pass', 'fiji', hoursAgo(0.2), '→ In review', 't-fiji-6'),
    a('a2', 'maria', 'completed', 'Review Broker Fit', 'fiji', hoursAgo(0.7), undefined, 't-fiji-3'),
    a('a3', 'malika', 'moved', 'Mobile hero', 'dosify', hoursAgo(1.5), '→ In review', 't-dos-3'),
    a('a4', 'maria', 'completed', 'Review landing hero', 'dosify', hoursAgo(2.2), undefined, 't-dos-1'),
    a('a5', 'bryan', 'moved', 'API rate limits for search', 'fiji', hoursAgo(3), '→ Blocked', 't-fiji-7'),
    a('a6', 'natalia', 'created', 'Broker onboarding emails', 'fiji', hoursAgo(5), undefined, 't-fiji-8'),
    a('a7', 'malika', 'completed', 'Pricing section', 'dosify', daysAgoAt(1, 16), undefined, 't-dos-4'),
    a('a8', 'maria', 'completed', 'Weekly metrics review', 'fiji', daysAgoAt(1, 11)),
    a('a9', 'maria', 'completed', 'Broker interview notes', 'fiji', daysAgoAt(1, 15)),
    a('a10', 'bryan', 'completed', 'Buyer search filters', 'fiji', daysAgoAt(2, 14), undefined, 't-fiji-9'),
    a('a11', 'maria', 'completed', 'Dosify copy pass', 'dosify', daysAgoAt(2, 10)),
    a('a12', 'maria', 'completed', 'Sprint planning', 'fiji', daysAgoAt(2, 9)),
    a('a13', 'maria', 'completed', 'Community brief', 'dosify', daysAgoAt(2, 17)),
    a('a14', 'natalia', 'completed', 'Pricing tiers copy', 'fiji', daysAgoAt(3, 12), undefined, 't-fiji-10'),
    a('a15', 'maria', 'completed', 'Investor update draft', 'fiji', daysAgoAt(3, 16)),
    a('a16', 'malika', 'completed', 'Hero illustration set', 'dosify', daysAgoAt(4, 13), undefined, 't-dos-10'),
    a('a17', 'maria', 'completed', 'Broker fit criteria', 'fiji', daysAgoAt(4, 11)),
    a('a18', 'maria', 'completed', 'Landing wireframes review', 'dosify', daysAgoAt(5, 15)),
  ];
}

export const SEED_XP: Record<string, number> = { maria: 1180, bryan: 1460, malika: 1320, natalia: 860 };
