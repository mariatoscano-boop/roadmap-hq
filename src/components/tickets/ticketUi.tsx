import type { StatusRole, TenguPriority, TenguTicket } from '../../types/tengu';

export const ROLE_COLOR: Record<StatusRole, string> = {
  planning: '#7b84a3',
  available: '#a3b1d6',
  started: '#4cc9f0',
  blocked: '#ff5c6c',
  review: '#b58cff',
  sentback: '#ff9f43',
  done: '#3ddc97',
  shipping: '#3ddc97',
  live: '#3ddc97',
  closed: '#5a6078',
};

export const PRIORITY_LABEL: Record<TenguPriority, string> = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };

export function StatusPill({ ticket }: { ticket: TenguTicket }) {
  return (
    <span className={`status-pill role-${ticket.statusRole}`} style={{ ['--c' as string]: ROLE_COLOR[ticket.statusRole] }}>
      <i />
      {ticket.status}
    </span>
  );
}

export function PriorityChip({ priority }: { priority: TenguPriority | null }) {
  if (!priority) return <span className="tprio tprio-none">No priority</span>;
  return <span className={`tprio tprio-${priority}`}>{PRIORITY_LABEL[priority]}</span>;
}

function hueOf(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ name, size = 22 }: { name: string | null; size?: number }) {
  if (!name) return <span className="avatar avatar-empty" style={{ width: size, height: size }}>?</span>;
  return (
    <span className="avatar" style={{ width: size, height: size, background: `hsl(${hueOf(name)} 55% 45%)`, fontSize: size * 0.48 }}>
      {name[0]}
    </span>
  );
}

export function formatDue(date: string | null) {
  if (!date) return null;
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Tiny, safe markdown: **bold**, `code`, and "- " bullets. */
export function Markdownish({ text }: { text: string }) {
  const lines = text.split('\n');
  const inline = (s: string, k: number) =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
      part.startsWith('**') ? <strong key={`${k}-${i}`}>{part.slice(2, -2)}</strong>
        : part.startsWith('`') ? <code key={`${k}-${i}`}>{part.slice(1, -1)}</code>
        : part,
    );
  return (
    <div className="md">
      {lines.map((l, i) =>
        l.startsWith('- ') ? <div key={i} className="md-li">{inline(l.slice(2), i)}</div>
          : l.trim() === '' ? <div key={i} className="md-gap" />
          : <p key={i}>{inline(l, i)}</p>,
      )}
    </div>
  );
}
