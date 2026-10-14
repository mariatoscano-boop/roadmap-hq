import type { ProjectTheme } from '../types';

/** A small motif in the corner of a project's card: strawberries, bubbles or bows. */
export function WorldDecor({ theme }: { theme: ProjectTheme }) {
  return (
    <svg className="world-decor" viewBox="0 0 140 100" aria-hidden="true">
      {theme === 'strawberry' && (
        <g stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round">
          {[[96, 30, 1], [122, 64, 0.7], [70, 70, 0.55]].map(([x, y, s]) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
              <path d="M0 -12 C12 -12 16 -4 12 6 C9 14 3 18 0 18 C-3 18 -9 14 -12 6 C-16 -4 -12 -12 0 -12Z" fill="var(--theme)" />
              <path d="M-8 -12 L-3 -15 L0 -20 L3 -15 L8 -12 L2 -10 L0 -13 L-2 -10Z" fill="var(--sage)" />
              <g fill="#fff" stroke="none"><circle cx="-5" cy="-2" r="1.2" /><circle cx="4" cy="0" r="1.2" /><circle cx="-1" cy="7" r="1.2" /><circle cx="6" cy="8" r="1" /></g>
            </g>
          ))}
        </g>
      )}
      {theme === 'lavender' && (
        <g fill="none" stroke="var(--theme-deep)" strokeWidth="1.4" opacity=".75">
          {[[100, 34, 16], [126, 66, 9], [74, 70, 7], [118, 14, 5], [84, 12, 3.5]].map(([x, y, r]) => (
            <g key={x}>
              <circle cx={x} cy={y} r={r} fill="#fff" fillOpacity=".55" />
              <path d={`M${x - r * 0.5} ${y - r * 0.35} q${r * 0.2} ${-r * 0.3} ${r * 0.5} ${-r * 0.3}`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          ))}
        </g>
      )}
      {theme === 'peach' && (
        <g stroke="var(--ink)" strokeWidth="1.3" strokeLinejoin="round">
          {[[100, 34, 1], [128, 70, 0.6], [72, 72, 0.5]].map(([x, y, s]) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${s}) rotate(-10)`}>
              <path d="M0 0 C-6 -12 -22 -11 -20 0 C-22 11 -6 12 0 0Z M0 0 C6 -12 22 -11 20 0 C22 11 6 12 0 0Z" fill="var(--theme)" />
              <path d="M-2 3 L-8 16 M2 3 L8 16" strokeLinecap="round" />
              <ellipse rx="4" ry="5" fill="var(--theme-deep)" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
