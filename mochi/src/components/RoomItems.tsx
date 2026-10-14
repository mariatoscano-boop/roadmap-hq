/**
 * Room decorations, each drawn in a 60×60 box (floor line at y≈58) so the same drawing works
 * placed in the room and as a sticker in the Rewards collection.
 */
import type { ReactElement } from 'react';
import type { RewardId } from '../types';

const S = { stroke: 'var(--ink)', strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export const ITEM_ART: Record<RewardId, () => ReactElement> = {
  laptop: () => (
    <g>
      <rect x="11" y="18" width="38" height="28" rx="3.5" fill="var(--lav-tint)" {...S} />
      <path d="M30 37 C24 32 24 27 27.5 26.5 C29 26.3 30 27.5 30 28.5 C30 27.5 31 26.3 32.5 26.5 C36 27 36 32 30 37Z" fill="var(--pink)" />
      <path d="M5 50 L11 46 H49 L55 50 Q55 54 51 54 H9 Q5 54 5 50Z" fill="#fff" {...S} />
    </g>
  ),
  coffee: () => (
    <g>
      <path d="M33 4 L29 24" stroke="var(--pink-deep)" strokeWidth="3" strokeLinecap="round" />
      <path d="M19 22 H41 L38 55 Q37.5 57 35.5 57 H24.5 Q22.5 57 22 55Z" fill="#fff" {...S} />
      <path d="M20.6 34 H39.4 L38 55 Q37.5 57 35.5 57 H24.5 Q22.5 57 22 55Z" fill="var(--latte)" />
      <rect x="24" y="36" width="6" height="6" rx="1.5" fill="#fff" opacity=".8" />
      <rect x="31" y="40" width="5" height="5" rx="1.5" fill="#fff" opacity=".8" />
      <path d="M17.5 22 H42.5" {...S} fill="none" />
      <path d="M19 22 H41 L38 55 Q37.5 57 35.5 57 H24.5 Q22.5 57 22 55Z" fill="none" {...S} />
    </g>
  ),
  plant: () => (
    <g>
      <path d="M30 40 C28 30 22 22 13 20 C14 30 20 38 30 40Z" fill="var(--sage)" {...S} />
      <path d="M30 40 C32 28 40 18 49 17 C48 29 40 37 30 40Z" fill="var(--sage)" {...S} />
      <path d="M30 40 C29 30 30 18 31 10 C35 18 35 30 30 40Z" fill="var(--sage-2)" {...S} />
      <path d="M17 39 H43 L40 56 Q39.6 58 37.5 58 H22.5 Q20.4 58 20 56Z" fill="var(--peach)" {...S} />
      <path d="M16 39 H44" {...S} fill="none" />
    </g>
  ),
  flowers: () => (
    <g>
      <path d="M30 40 L24 18 M30 40 L31 12 M30 40 L38 20" {...S} fill="none" stroke="var(--sage-ink)" />
      {[
        [24, 18, 'var(--pink)'],
        [31, 12, '#fff'],
        [38, 20, 'var(--lilac)'],
      ].map(([x, y, c]) => (
        <g key={`${x}`} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-4.2" rx="3" ry="4.2" transform={`rotate(${r})`} fill={c as string} stroke="var(--ink)" strokeWidth="1.2" />
          ))}
          <circle r="2" fill="var(--butter)" stroke="var(--ink)" strokeWidth="1" />
        </g>
      ))}
      <path d="M22 38 H38 Q40 48 37 56 Q36 58 34 58 H26 Q24 58 23 56 Q20 48 22 38Z" fill="var(--lav-glass)" {...S} />
    </g>
  ),
  bow: () => (
    <g transform="translate(30 26)">
      <path d="M-3 3 L-12 26 L-6 23 L-4 29 L0 6Z M3 3 L12 26 L6 23 L4 29 L0 6Z" fill="var(--pink-deep)" {...S} />
      <path d="M0 0 C-8 -16 -28 -14 -26 0 C-28 14 -8 16 0 0Z" fill="var(--pink)" {...S} />
      <path d="M0 0 C8 -16 28 -14 26 0 C28 14 8 16 0 0Z" fill="var(--pink)" {...S} />
      <path d="M-18 -4 Q-12 -2 -8 1 M18 -4 Q12 -2 8 1" fill="none" stroke="var(--ink)" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
      <ellipse rx="5" ry="6" fill="var(--pink-deep)" {...S} />
    </g>
  ),
  candle: () => (
    <g>
      <path className="flame" d="M30 8 C25 16 25 22 30 23 C35 22 35 16 30 8Z" fill="var(--flame)" stroke="var(--ink)" strokeWidth="1.3" />
      <path d="M30 23 V29" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="18" y="28" width="24" height="30" rx="5" fill="#fff" {...S} />
      <rect x="21.5" y="38" width="17" height="11" rx="2.5" fill="var(--blush)" />
      <path d="M27 43.5 H33" stroke="var(--ink)" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  ),
  plushie: () => (
    <g>
      <circle cx="18" cy="16" r="6" fill="var(--teddy)" {...S} />
      <circle cx="42" cy="16" r="6" fill="var(--teddy)" {...S} />
      <ellipse cx="30" cy="46" rx="15" ry="12" fill="var(--teddy)" {...S} />
      <circle cx="30" cy="24" r="13" fill="var(--teddy)" {...S} />
      <ellipse cx="30" cy="29" rx="6" ry="4.5" fill="var(--teddy-light)" />
      <circle cx="25" cy="22" r="1.6" fill="var(--ink)" />
      <circle cx="35" cy="22" r="1.6" fill="var(--ink)" />
      <path d="M28.5 27.5 Q30 29 31.5 27.5" fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="20" cy="56" rx="6" ry="3.5" fill="var(--teddy)" {...S} />
      <ellipse cx="40" cy="56" rx="6" ry="3.5" fill="var(--teddy)" {...S} />
      <path d="M30 37 L24 34 L24 40Z M30 37 L36 34 L36 40Z" fill="var(--pink)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
    </g>
  ),
  bag: () => (
    <g>
      <path d="M21 26 C21 12 39 12 39 26" fill="none" {...S} strokeWidth="2.4" />
      <path d="M12 28 Q12 25 15 25 H45 Q48 25 48 28 L50 52 Q50 57 45 57 H15 Q10 57 10 52Z" fill="var(--lilac)" {...S} />
      <path d="M11 33 Q30 42 49 33" fill="none" {...S} />
      <rect x="26.5" y="34" width="7" height="6" rx="2" fill="var(--butter)" {...S} strokeWidth="1.3" />
    </g>
  ),
  cat: () => (
    <g>
      <path className="cat-tail" d="M42 52 C54 50 56 38 50 34" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      <path className="cat-tail" d="M42 52 C54 50 56 38 50 34" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16 57 C14 44 18 34 30 34 C42 34 46 44 44 57Z" fill="#fff" {...S} />
      <path d="M17 22 L19 9 L27 16Z M43 22 L41 9 L33 16Z" fill="#fff" {...S} />
      <path d="M20 18 L20.5 13 L24 16Z M40 18 L39.5 13 L36 16Z" fill="var(--pink)" />
      <ellipse cx="30" cy="25" rx="14" ry="11.5" fill="#fff" {...S} />
      <path d="M23 25 Q25 23 27 25 M33 25 Q35 23 37 25" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M29 28.5 L31 28.5 L30 29.8Z" fill="var(--pink-deep)" />
      <ellipse cx="22" cy="29" rx="2.6" ry="1.6" fill="var(--blush)" />
      <ellipse cx="38" cy="29" rx="2.6" ry="1.6" fill="var(--blush)" />
    </g>
  ),
  disco: () => (
    <g>
      <path d="M30 0 V14" stroke="var(--ink)" strokeWidth="1.4" />
      <g className="disco-ball">
        <circle cx="30" cy="34" r="20" fill="var(--disco)" {...S} />
        <g fill="none" stroke="var(--ink)" strokeWidth=".8" opacity=".35">
          <ellipse cx="30" cy="34" rx="8" ry="20" />
          <ellipse cx="30" cy="34" rx="15" ry="20" />
          <path d="M10 34 H50 M13 24 H47 M13 44 H47 M18 17 H42 M18 51 H42" />
        </g>
        <rect x="18" y="22" width="6" height="6" fill="#fff" opacity=".9" />
        <rect x="35" y="38" width="5" height="5" fill="var(--pink)" opacity=".8" />
        <rect x="26" y="44" width="5" height="5" fill="var(--lilac)" opacity=".9" />
      </g>
    </g>
  ),
};

export function ItemSticker({ id, size = 56 }: { id: RewardId; size?: number }) {
  const Art = ITEM_ART[id];
  return (
    <svg viewBox="-2 -2 64 64" width={size} height={size} aria-hidden="true">
      <Art />
    </svg>
  );
}
