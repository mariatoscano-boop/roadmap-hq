import type { Initiative, RoadmapItem } from '../types/roadmap';
import type { StatusRole, TenguComment, TenguList, TenguMember, TenguPriority, TenguTicket } from '../types/tengu';

/** Mirrors the status set of the real Fiji lists in Tengu. */
const FIJI_STATUSES: TenguList['statuses'] = [
  { status: 'backlog', role: 'planning' },
  { status: 'next week', role: 'planning' },
  { status: 'current week', role: 'available' },
  { status: 'in progress', role: 'started' },
  { status: 'blocked', role: 'blocked' },
  { status: 'rework', role: 'sentback' },
  { status: 'qa review', role: 'review' },
  { status: 'qa passed', role: 'done' },
  { status: 'merged to dev', role: 'shipping' },
  { status: 'pushed to live', role: 'live' },
  { status: 'cancelled', role: 'closed' },
];

export const MOCK_LISTS: TenguList[] = [
  { id: 'list-marketplace', name: 'Next.js Marketplace', space: 'Fiji', statuses: FIJI_STATUSES },
  { id: 'list-platform', name: 'Platform', space: 'Fiji', statuses: FIJI_STATUSES },
  { id: 'list-intelligence', name: 'AI & Insights', space: 'Fiji', statuses: FIJI_STATUSES },
];

export const MOCK_MEMBERS: TenguMember[] = [
  { id: 'm-natalia', name: 'Natalia', email: 'natalia@example.com' },
  { id: 'm-dafne', name: 'Dafne', email: 'dafne@example.com' },
  { id: 'm-mateo', name: 'Mateo', email: 'mateo@example.com' },
  { id: 'm-sofia', name: 'Sofía', email: 'sofia@example.com' },
  { id: 'm-diego', name: 'Diego', email: 'diego@example.com' },
  { id: 'm-lucia', name: 'Lucía', email: 'lucia@example.com' },
  { id: 'm-ivan', name: 'Iván', email: 'ivan@example.com' },
  { id: 'm-camila', name: 'Camila', email: 'camila@example.com' },
];

const member = (name: string) => MOCK_MEMBERS.find((m) => m.name === name)!;
const roleOf = (status: string): StatusRole => FIJI_STATUSES.find((s) => s.status === status)!.role;

let commentSeq = 0;
function c(author: string, body: string, daysAgo: number): TenguComment {
  const d = new Date('2026-10-13T10:00:00');
  d.setDate(d.getDate() - daysAgo);
  return { id: `c-${++commentSeq}`, author, body, createdAt: d.toISOString() };
}

function t(
  n: number,
  listId: string,
  title: string,
  status: string,
  priority: TenguPriority | null,
  assignee: string | null,
  due: string | null,
  description: string,
  comments: TenguComment[] = [],
  updatedDaysAgo = 1,
): TenguTicket {
  const updated = new Date('2026-10-13T09:00:00');
  updated.setDate(updated.getDate() - updatedDaysAgo);
  return {
    id: `tk-${n}`,
    key: `FIJI-${n}`,
    title,
    description,
    listId,
    status,
    statusRole: roleOf(status),
    priority,
    assignees: assignee ? [member(assignee)] : [],
    dueDate: due,
    url: `https://tengu.example/t/FIJI-${n}`,
    updatedAt: updated.toISOString(),
    comments,
  };
}

const MKT = 'list-marketplace';
const PLT = 'list-platform';
const INT = 'list-intelligence';

export const MOCK_TICKETS: TenguTicket[] = [
  // Marketplace 2.0
  t(142, MKT, 'Marketplace filters redesign', 'in progress', 2, 'Natalia', '2026-10-24',
    'Rebuild the filter rail with multi-select facets, price range slider and instant result counts.\n\n- Facets driven by the search index\n- URL state for shareable filters\n- Mobile bottom-sheet variant',
    [c('Natalia', 'Facet counts are wired to the new index. Working on the mobile sheet now.', 1), c('Mateo', 'Price slider needs debouncing — it hammers the API.', 2)]),
  t(156, MKT, 'Buyer profile updates on listing page', 'pushed to live', 3, 'Dafne', '2026-10-03',
    'Show verified-buyer badge and purchase history summary on listing pages.', [c('Dafne', 'Live ✅', 6)], 6),
  t(161, MKT, 'Marketplace performance optimization', 'qa review', 2, 'Mateo', '2026-10-20',
    'Cut LCP on category pages below 2.0s. Image CDN, route-level code splitting, cached facets.',
    [c('Mateo', 'LCP is at 1.7s on staging. Ready for QA.', 0)], 0),
  t(173, MKT, 'Seller onboarding flow v2', 'qa passed', 2, 'Camila', '2026-10-10',
    'Three-step onboarding with Stripe Connect and catalog import.', [c('Camila', 'QA passed, waiting for the release train.', 2)], 2),
  t(175, MKT, 'Listing cards: new visual system', 'merged to dev', 3, 'Natalia', '2026-10-09', 'Port listing cards to the new design tokens.', [], 3),
  t(178, MKT, 'Search ranking: boost verified sellers', 'pushed to live', 3, 'Mateo', '2026-10-01', 'Ranking tweak for verified sellers.', [], 9),
  t(179, MKT, 'Checkout address autocomplete', 'current week', 3, null, '2026-10-28', 'Use places API for address autocomplete in checkout.', [], 1),

  // AI Assistant
  t(201, INT, 'Assistant chat panel shell', 'pushed to live', 2, 'Sofía', '2026-09-20', 'Docked chat panel, streaming responses, keyboard toggle.', [], 20),
  t(204, INT, 'Retrieval over catalog + orders', 'pushed to live', 1, 'Diego', '2026-09-30', 'RAG pipeline over product catalog and order history.', [], 12),
  t(207, INT, 'Prompt guardrails & PII redaction', 'qa passed', 1, 'Sofía', '2026-10-08', 'Redact emails, phones and card numbers before they reach the model.', [c('Sofía', 'Redaction coverage at 99.2% on the eval set.', 4)], 4),
  t(209, INT, 'Assistant actions: reorder & track', 'merged to dev', 2, 'Mateo', '2026-10-12', 'Tool calls for reorder and shipment tracking.', [], 1),
  t(212, INT, 'Feedback thumbs + eval logging', 'pushed to live', 3, 'Camila', '2026-10-02', 'Collect thumbs up/down and log transcripts to the eval store.', [], 10),
  t(214, INT, 'Assistant onboarding tooltip', 'qa passed', 4, 'Dafne', '2026-10-15', 'First-run tooltip that introduces the assistant.', [], 2),
  t(216, INT, 'Streaming latency under 800ms p95', 'in progress', 2, 'Diego', '2026-10-30', 'Move to edge streaming and warm pools.', [c('Diego', 'p95 at 1.1s. Edge rollout next.', 1)], 1),
  t(218, INT, 'Vendor contract for model hosting', 'blocked', 1, 'Sofía', '2026-10-18',
    'Procurement needs a signed DPA before we can move to the dedicated hosting tier.',
    [c('Sofía', 'Blocked on legal review of the DPA. Escalated.', 2), c('Iván', 'Legal says ETA end of next week.', 1)], 1),

  // Insights
  t(231, INT, 'Insights event pipeline', 'pushed to live', 2, 'Diego', '2026-09-25', 'Kafka → warehouse pipeline for marketplace events.', [], 15),
  t(233, INT, 'Cohort retention view', 'blocked', 2, 'Lucía', '2026-10-17', 'Weekly cohorts with retention curves. Blocked on warehouse schema migration.',
    [c('Lucía', 'Waiting on the warehouse schema migration from Platform.', 3)], 3),
  t(236, INT, 'Seller performance insights', 'blocked', 2, 'Diego', '2026-10-22', 'GMV, conversion and response time per seller. Needs access to payments data.',
    [c('Diego', 'Payments team hasn\'t granted read access yet.', 2)], 2),
  t(238, INT, 'Anomaly alerts for GMV drops', 'in progress', 3, 'Camila', '2026-11-05', 'Daily anomaly detection with Slack alerts.', [], 1),
  t(239, INT, 'Insights home layout', 'qa passed', 3, 'Dafne', '2026-10-06', 'Landing layout for the insights area.', [], 5),

  // Dashboard 2.0
  t(251, MKT, 'Dashboard widget framework', 'qa passed', 2, 'Lucía', '2026-10-01', 'Composable widgets with a shared data contract.', [], 8),
  t(253, MKT, 'Drag-to-arrange dashboard layout', 'in progress', 3, 'Lucía', '2026-10-08', 'Grid layout with drag-to-arrange and saved layouts.', [c('Lucía', 'Slipped a week — layout persistence was trickier than expected.', 2)], 2),
  t(255, MKT, 'Dashboard sharing permissions', 'backlog', 3, null, '2026-11-20', 'Share dashboards with view/edit roles.', [], 7),
  t(257, MKT, 'Saved views & default dashboards', 'next week', 3, 'Mateo', '2026-12-04', 'Per-team default dashboards.', [], 4),
  t(259, MKT, 'Dashboard empty states', 'backlog', 4, 'Dafne', null, 'Friendly empty states with sample data.', [], 9),

  // Buyer Profile 2.0
  t(271, MKT, 'Buyer profile research synthesis', 'pushed to live', 3, 'Dafne', '2026-10-05', 'Synthesize 14 buyer interviews into profile requirements.', [], 7),
  t(273, MKT, 'Profile preferences model', 'next week', 2, 'Natalia', '2026-11-12', 'Data model for buyer preferences & saved sizes.', [], 3),
  t(275, MKT, 'Profile page redesign', 'backlog', 3, null, '2026-12-01', 'New profile page with order history and preferences.', [], 5),
  t(277, MKT, 'Privacy controls for buyer profile', 'backlog', 2, 'Camila', '2026-12-10', 'Let buyers control what sellers can see.', [], 6),

  // Platform Migration
  t(301, PLT, 'Migration plan: Postgres 16', 'current week', 2, 'Iván', '2027-01-15', 'Plan the Postgres 16 upgrade with zero-downtime cutover.', [], 2),
  t(303, PLT, 'Move workers to the new queue', 'backlog', 3, 'Iván', '2027-02-01', 'Replace the legacy job runner with the new queue service.', [], 10),
  t(305, PLT, 'Warehouse schema migration', 'next week', 1, 'Mateo', '2026-11-01', 'Schema v3 in the warehouse. Unblocks Insights cohort work.', [], 1),
  t(307, PLT, 'Observability: tracing everywhere', 'backlog', 3, null, '2027-02-20', 'OpenTelemetry tracing across all services.', [], 12),

  // Unlinked — available to link
  t(180, MKT, 'Marketplace analytics events', 'current week', 3, 'Mateo', '2026-10-30', 'Instrument filter, search and listing events.', [], 1),
  t(184, MKT, 'Saved searches with alerts', 'backlog', 3, null, '2026-12-15', 'Let buyers save a search and get notified on new listings.', [], 6),
  t(187, INT, 'Assistant: multilingual responses', 'backlog', 3, 'Sofía', '2026-12-01', 'Spanish and Portuguese support in the assistant.', [], 4),
  t(190, MKT, 'Dashboard export to CSV', 'backlog', 4, null, null, 'Export any widget to CSV.', [], 11),
  t(192, PLT, 'Design tokens: dark mode', 'in progress', 3, 'Dafne', '2026-10-25', 'Dark mode tokens across the design system.', [], 1),
  t(195, PLT, 'Auth session refresh bug', 'rework', 1, 'Iván', '2026-10-14', 'Sessions expire mid-checkout on Safari.', [c('Natalia', 'Still reproducible on iOS 18.', 0)], 0),
  t(198, MKT, 'Seller payouts dashboard', 'backlog', 2, 'Camila', '2027-01-10', 'Payout history and upcoming transfers for sellers.', [], 8),
];

export const MOCK_INITIATIVES: Initiative[] = [
  { id: 'ini-ai', name: 'AI Assistant', icon: '🚀', place: 'AI Lab', zone: 'now', order: 0, priority: 'P0', status: 'In Progress', owner: 'Sofía', target: '2026-11', hue: 265,
    summary: 'A shopping assistant that answers, reorders and tracks — grounded in our catalog and orders.' },
  { id: 'ini-mkt', name: 'Marketplace 2.0', icon: '🏪', place: 'Marketplace District', zone: 'now', order: 1, priority: 'P0', status: 'In Progress', owner: 'Natalia', target: '2026-10', hue: 28,
    summary: 'Faster discovery, better filters and a seller onboarding that converts.' },
  { id: 'ini-ins', name: 'Insights', icon: '🧠', place: 'Insights Lab', zone: 'now', order: 2, priority: 'P1', status: 'In Progress', owner: 'Diego', target: '2026-12', hue: 188,
    summary: 'Self-serve marketplace analytics: cohorts, seller performance and anomaly alerts.' },
  { id: 'ini-dash', name: 'Dashboard 2.0', icon: '📊', place: 'Dashboard Center', zone: 'next', order: 0, priority: 'P1', status: 'Planning', owner: 'Lucía', target: '2027-01', hue: 212,
    summary: 'Composable dashboards teams can arrange, save and share.' },
  { id: 'ini-buyer', name: 'Buyer Profile 2.0', icon: '👤', place: 'Buyer Profile Studio', zone: 'next', order: 1, priority: 'P2', status: 'Discovery', owner: 'Dafne', target: '2026-12', hue: 330,
    summary: 'A profile buyers actually manage — preferences, sizes, privacy.' },
  { id: 'ini-plat', name: 'Platform Migration', icon: '🏗', place: 'Platform Garage', zone: 'later', order: 0, priority: 'P2', status: 'Planning', owner: 'Iván', target: '2027-02', hue: 150,
    summary: 'Postgres 16, a new queue and tracing everywhere — the foundation for 2027.' },
];

const LINKS: Record<string, number[]> = {
  'ini-mkt': [142, 156, 161, 173, 175, 178, 179],
  'ini-ai': [201, 204, 207, 209, 212, 214, 216, 218],
  'ini-ins': [231, 233, 236, 238, 239],
  'ini-dash': [251, 253, 255, 257, 259],
  'ini-buyer': [271, 273, 275, 277],
  'ini-plat': [301, 303, 305, 307],
};

/** Sample roadmap items for local mode: mostly linked to mock Tengu tickets, plus a few plain ones. */
export const MOCK_ITEMS: RoadmapItem[] = [
  ...Object.entries(LINKS).flatMap(([initiativeId, nums]) =>
    nums.map((n, i): RoadmapItem => {
      const t = MOCK_TICKETS.find((x) => x.id === `tk-${n}`)!;
      return {
        id: `item-${n}`,
        initiativeId,
        title: t.title,
        status: 'todo',
        owner: null,
        tengu: { id: t.id, key: t.key, url: t.url },
        createdAt: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
      };
    }),
  ),
  { id: 'item-p1', initiativeId: 'ini-mkt', title: 'Pricing page copy review with marketing', status: 'doing', owner: 'Natalia', tengu: null, createdAt: '2026-10-01T10:00:00Z' },
  { id: 'item-p2', initiativeId: 'ini-plat', title: 'Decide on queue vendor', status: 'todo', owner: 'Iván', tengu: null, createdAt: '2026-10-02T10:00:00Z' },
];
