import type { ItemStatus, Mission, RoadmapItem } from '../types/roadmap';
import type { StatusRole, TenguTicket } from '../types/tengu';

export const ITEM_STATUS: Record<ItemStatus, { label: string; role: StatusRole }> = {
  todo: { label: 'To do', role: 'planning' },
  doing: { label: 'In progress', role: 'started' },
  blocked: { label: 'Blocked', role: 'blocked' },
  done: { label: 'Done', role: 'done' },
};

export const ITEM_STATUSES: ItemStatus[] = ['todo', 'doing', 'blocked', 'done'];

export function ticketUrl(url: string, base: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (!base) return null;
  return base.replace(/\/+$/, '') + (url.startsWith('/') ? url : `/${url}`);
}

export function toMission(item: RoadmapItem, ticket: TenguTicket | undefined, base: string): Mission {
  if (item.tengu && ticket) {
    return {
      id: item.id,
      item,
      ticket,
      title: ticket.title || item.title,
      role: ticket.statusRole,
      statusLabel: ticket.status,
      assignee: ticket.assignees[0]?.name ?? null,
      priority: ticket.priority,
      dueDate: ticket.dueDate,
      key: ticket.key || item.tengu.key,
      url: ticketUrl(ticket.url || item.tengu.url, base),
      linked: true,
    };
  }
  const s = ITEM_STATUS[item.status] ?? ITEM_STATUS.todo;
  return {
    id: item.id,
    item,
    ticket: null,
    title: item.title,
    role: s.role,
    statusLabel: item.tengu ? `${s.label}` : s.label,
    assignee: item.owner,
    priority: null,
    dueDate: null,
    key: item.tengu?.key ?? null,
    url: item.tengu ? ticketUrl(item.tengu.url, base) : null,
    linked: !!item.tengu,
  };
}
