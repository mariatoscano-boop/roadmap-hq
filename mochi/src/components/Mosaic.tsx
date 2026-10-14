/**
 * A project's cover: one tile per task, filled as work gets done. Done = solid accent,
 * in progress / review = half filled, blocked = orange outline, to do = faint.
 */
import { useId } from 'react';
import { STATUS_ORDER } from '../lib/selectors';
import type { Task } from '../types';

export function Mosaic({ tasks, cols = 8, size = 14, gap = 4 }: { tasks: Task[]; cols?: number; size?: number; gap?: number }) {
  const gid = useId().replace(/:/g, '');
  const order = [...STATUS_ORDER].reverse(); // done first, so the cover fills from the top-left
  const sorted = [...tasks].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const rows = Math.max(1, Math.ceil(sorted.length / cols));
  const w = cols * size + (cols - 1) * gap;
  const h = rows * size + (rows - 1) * gap;
  return (
    <svg className="mosaic" viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`${sorted.filter((t) => t.status === 'done').length} of ${sorted.length} tasks done`}>
      <defs>
        <linearGradient id={`half-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".5" style={{ stopColor: 'var(--tile-empty)' }} />
          <stop offset=".5" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      {sorted.map((t, i) => (
        <rect
          key={t.id}
          className={`tile tile-${t.status}`}
          style={{ animationDelay: `${i * 18}ms`, ...(t.status === 'progress' || t.status === 'review' ? { fill: `url(#half-${gid})` } : {}) }}
          x={(i % cols) * (size + gap)}
          y={Math.floor(i / cols) * (size + gap)}
          width={size}
          height={size}
          rx={size * 0.28}
        />
      ))}
    </svg>
  );
}
