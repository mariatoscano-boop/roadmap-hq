/** Mochi's little room. Unlocked + placed decorations appear in fixed spots. */
import type { Character, Mood, RewardId } from '../types';
import { Mochi } from './Mochi';
import { ITEM_ART } from './RoomItems';

/** Where each decoration sits in the 400×240 scene: [x, y, scale]. */
const SLOTS: Record<RewardId, [number, number, number]> = {
  disco: [178, -2, 0.95],
  bow: [50, -2, 0.95],
  flowers: [270, 45.6, 0.8],
  candle: [324, 45.6, 0.8],
  bag: [350, 110, 0.7],
  laptop: [222, 104.7, 0.95],
  coffee: [288, 113.3, 0.75],
  plant: [4, 165.3, 1.15],
  plushie: [345, 181, 0.85],
  cat: [262, 186.7, 0.85],
};
/** Paint order: back to front. */
const ORDER: RewardId[] = ['disco', 'bow', 'flowers', 'candle', 'bag', 'laptop', 'coffee', 'plant', 'plushie', 'cat'];

interface Props {
  character: Character;
  mood: Mood;
  bounceKey: number;
  onPoke?: () => void;
  label?: string;
}

export function Room({ character, mood, bounceKey, onPoke, label }: Props) {
  const placed = new Set(character.placedItems.filter((i) => character.unlockedItems.includes(i)));
  return (
    <div className={`room wall-${character.wallpaper}`}>
      <svg className="room-scene" viewBox="0 0 400 240" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs>
          <pattern id="wall-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.3" fill="var(--wall-dot)" />
            <circle cx="15" cy="15" r="1.3" fill="var(--wall-dot)" />
          </pattern>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--sky-1)" />
            <stop offset="1" stopColor="var(--sky-2)" />
          </linearGradient>
        </defs>
        <rect width="400" height="176" fill="var(--wall)" />
        <rect width="400" height="176" fill="url(#wall-dots)" />
        <rect y="176" width="400" height="64" fill="var(--floor)" />
        <path d="M0 196 H400 M0 218 H400" stroke="var(--floor-line)" strokeWidth="1" />
        <rect y="172" width="400" height="6" fill="var(--baseboard)" />
        {/* window */}
        <path d="M38 118 V64 A42 42 0 0 1 122 64 V118 Z" fill="url(#sky)" stroke="var(--ink)" strokeWidth="1.8" />
        <path d="M80 22 V118 M38 76 H122" stroke="var(--ink)" strokeWidth="1.3" opacity=".5" />
        <path d="M52 58 q6 -8 14 -2 q8 -4 11 4 q6 1 4 6 h-31 q-4 -5 2 -8z" fill="#fff" opacity=".95" />
        <circle cx="104" cy="50" r="7" fill="var(--butter)" opacity=".9" />
        <path d="M28 18 H132" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 18 C40 18 46 20 46 30 C42 60 38 90 30 124 C26 110 26 40 30 18Z" fill="var(--curtain)" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M130 18 C120 18 114 20 114 30 C118 60 122 90 130 124 C134 110 134 40 130 18Z" fill="var(--curtain)" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="30" y="116" width="100" height="7" rx="3.5" fill="#fff" stroke="var(--ink)" strokeWidth="1.6" />
        {/* shelf */}
        <rect x="262" y="92" width="112" height="6" rx="3" fill="#fff" stroke="var(--ink)" strokeWidth="1.6" />
        <path d="M280 98 l6 10 M356 98 l-6 10" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
        {/* rug */}
        <ellipse cx="190" cy="226" rx="104" ry="11" fill="var(--rug)" />
        <ellipse cx="190" cy="226" rx="92" ry="7.5" fill="none" stroke="#fff" strokeWidth="1.4" strokeDasharray="3 4" opacity=".8" />
        {/* desk */}
        <rect x="212" y="154" width="132" height="8" rx="4" fill="#fff" stroke="var(--ink)" strokeWidth="1.8" />
        <path d="M222 162 V226 M334 162 V226" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="300" y="162" width="30" height="20" rx="3" fill="var(--desk-drawer)" stroke="var(--ink)" strokeWidth="1.6" />
        <circle cx="315" cy="172" r="1.8" fill="var(--ink)" />
        {ORDER.filter((id) => placed.has(id)).map((id) => {
          const [x, y, s] = SLOTS[id];
          const Art = ITEM_ART[id];
          return (
            <g key={id} transform={`translate(${x} ${y}) scale(${s})`}>
              <g className={`room-item item-${id}`}>
                <Art />
              </g>
            </g>
          );
        })}
      </svg>
      <button type="button" className="room-mochi" onClick={onPoke} aria-label={label ?? 'Poke Mochi'}>
        <Mochi mood={mood} size="100%" bounceKey={bounceKey} />
      </button>
    </div>
  );
}

export function SpeechBubble({ line, onPoint, pointLabel, live = true }: { line: string; onPoint?: () => void; pointLabel?: string; live?: boolean }) {
  return (
    <div className="bubble" aria-live={live ? 'polite' : undefined}>
      <span key={line} className="bubble-text">{line}</span>
      {onPoint && (
        <button type="button" className="bubble-link" onClick={onPoint}>
          {pointLabel ?? 'Show me'}
        </button>
      )}
    </div>
  );
}
