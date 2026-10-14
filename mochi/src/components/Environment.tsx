/**
 * A world's terrain (a pattern in the world's colour on a dark viewport) and the objects that
 * appear as the world levels up.
 */
import { useId } from 'react';
import type { Terrain } from '../types';

export function TerrainPattern({ terrain, opacity = 0.32, scale = 1 }: { terrain: Terrain; opacity?: number; scale?: number }) {
  const id = useId().replace(/:/g, '');
  const s = 40 * scale;
  const tile = (() => {
    switch (terrain) {
      case 'waves': return <path d="M0 14q10-8 20 0t20 0M0 32q10-8 20 0t20 0" fill="none" stroke="var(--c)" strokeWidth="1.2" />;
      case 'bubbles': return <g fill="none" stroke="var(--c)" strokeWidth="1.1"><circle cx="10" cy="12" r="5" /><circle cx="29" cy="28" r="3" /><circle cx="30" cy="8" r="1.6" /></g>;
      case 'circuit': return <g fill="none" stroke="var(--c)" strokeWidth="1.1"><path d="M0 10h14v14h12M26 24h14M20 0v6M8 40V30h10" /><circle cx="14" cy="10" r="1.8" fill="var(--c)" /><circle cx="26" cy="24" r="1.8" fill="var(--c)" /></g>;
      case 'blocks': return <g fill="var(--c)"><rect x="4" y="4" width="8" height="8" opacity=".9" /><rect x="22" y="4" width="8" height="8" fill="none" stroke="var(--c)" /><rect x="22" y="22" width="8" height="8" opacity=".5" /><rect x="4" y="22" width="8" height="8" fill="none" stroke="var(--c)" /></g>;
      case 'garden': return <g fill="none" stroke="var(--c)" strokeWidth="1.1" strokeLinecap="round"><path d="M10 30v-8m0 2c-3 0-5-2-5-5 3 0 5 2 5 5Zm0-1c0-3 2-5 5-5 0 3-2 5-5 5Z" /><circle cx="30" cy="10" r="1.4" fill="var(--c)" /></g>;
      case 'stars': return <g fill="var(--c)"><path d="M10 6l1.2 3.3 3.3 1.2-3.3 1.2L10 15l-1.2-3.3L5.5 10.5l3.3-1.2Z" /><circle cx="30" cy="26" r="1.2" /><circle cx="24" cy="8" r=".8" /><circle cx="8" cy="32" r=".8" /></g>;
    }
  })();
  return (
    <svg className="terrain" width="100%" height="100%" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id={`t-${id}`} width={s} height={s} patternUnits="userSpaceOnUse">
          <g transform={`scale(${scale})`}>{tile}</g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#t-${id})`} opacity={opacity} />
    </svg>
  );
}

/** World objects, in the order they appear (one per world level after the first). */
const OBJECTS = [
  // beacon
  <g key="beacon"><path d="M0 0l-6 26h12Z" fill="none" stroke="var(--ink-on-dark)" strokeWidth="1.6" strokeLinejoin="round" /><path d="M-4 14h8M-5 20h10" stroke="var(--ink-on-dark)" strokeWidth="1.2" /><circle className="obj-blink" cx="0" cy="-2" r="2.6" fill="var(--c)" /></g>,
  // crystal
  <g key="crystal"><path d="M0 0l7 8-3 18h-8l-3-18Z" fill="var(--c)" opacity=".9" stroke="var(--ink-on-dark)" strokeWidth="1.4" strokeLinejoin="round" /><path d="M0 0v26M-7 8h14" stroke="var(--ink-on-dark)" strokeWidth=".9" opacity=".6" /></g>,
  // tree
  <g key="tree"><rect x="-1.5" y="14" width="3" height="12" fill="var(--ink-on-dark)" /><rect x="-9" y="2" width="18" height="14" rx="3" fill="var(--c)" stroke="var(--ink-on-dark)" strokeWidth="1.4" /><rect x="-5" y="-6" width="10" height="10" rx="2" fill="var(--c)" stroke="var(--ink-on-dark)" strokeWidth="1.4" /></g>,
  // monolith
  <g key="monolith"><rect x="-6" y="-2" width="12" height="28" rx="1.5" fill="#100d13" stroke="var(--c)" strokeWidth="1.4" /><path d="M-3 4h6M-3 8h4" stroke="var(--c)" strokeWidth="1.2" /></g>,
  // flag
  <g key="flag"><path d="M-6 26V-2" stroke="var(--ink-on-dark)" strokeWidth="1.6" strokeLinecap="round" /><path className="obj-wave" d="M-6-2h14l-4 5 4 5h-14Z" fill="var(--c)" stroke="var(--ink-on-dark)" strokeWidth="1.2" strokeLinejoin="round" /></g>,
  // dome
  <g key="dome"><path d="M-14 26a14 14 0 0 1 28 0Z" fill="rgba(255,255,255,.06)" stroke="var(--c)" strokeWidth="1.4" /><path d="M-7 26a7 14 0 0 1 14 0M-13 19h26" stroke="var(--c)" strokeWidth=".9" opacity=".7" /></g>,
];

/** Slots on a 400×120 ground strip, so objects never overlap the creature in the middle. */
const SLOTS = [[60, 70], [340, 66], [110, 82], [290, 84], [24, 84], [376, 86]];

export function WorldObjects({ count }: { count: number }) {
  return (
    <svg className="world-objects" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {OBJECTS.slice(0, count).map((o, i) => (
        <g key={i} transform={`translate(${SLOTS[i][0]} ${SLOTS[i][1]})`}>
          <g className="obj" style={{ animationDelay: `${i * 80}ms` }}>{o}</g>
        </g>
      ))}
    </svg>
  );
}
