/**
 * Mochi: the companion. A soft little rice-cake blob with a bow.
 * Expressions are drawn per mood; idle breathing, blinking and the reaction bounce are CSS
 * (all switched off under prefers-reduced-motion).
 */
import type { Mood } from '../types';

interface Props {
  mood: Mood;
  size?: number | string;
  bounceKey?: number;
  className?: string;
}

const INK = 'var(--ink)';

function Eyes({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'excited':
    case 'celebrate':
    case 'proud':
      return (
        <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
          <path d="M40.5 67 Q46 60 51.5 67" />
          <path d="M68.5 67 Q74 60 79.5 67" />
        </g>
      );
    case 'sleepy':
    case 'peaceful':
      return (
        <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round">
          <path d="M41 64.5 Q46 69 51 64.5" />
          <path d="M69 64.5 Q74 69 79 64.5" />
        </g>
      );
    case 'concerned':
      return (
        <g>
          <g fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round">
            <path d="M39 57.5 L50 54.5" />
            <path d="M81 57.5 L70 54.5" />
          </g>
          <g className="mochi-eyes">
            <ellipse cx="47.5" cy="66" rx="3.6" ry="4.4" fill={INK} />
            <ellipse cx="75.5" cy="66" rx="3.6" ry="4.4" fill={INK} />
            <circle cx="48.6" cy="64.4" r="1.2" fill="#fff" />
            <circle cx="76.6" cy="64.4" r="1.2" fill="#fff" />
          </g>
        </g>
      );
    default:
      return (
        <g className="mochi-eyes">
          <ellipse cx="46" cy="66" rx="3.6" ry="4.4" fill={INK} />
          <ellipse cx="74" cy="66" rx="3.6" ry="4.4" fill={INK} />
          <circle cx="47.2" cy="64.3" r="1.3" fill="#fff" />
          <circle cx="75.2" cy="64.3" r="1.3" fill="#fff" />
        </g>
      );
  }
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'excited':
    case 'celebrate':
      return (
        <g>
          <path d="M53.5 74.5 Q60 85 66.5 74.5 Z" fill={INK} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M56.5 79.5 Q60 82.6 63.5 79.5 Q60 77.6 56.5 79.5Z" fill="var(--mochi-tongue)" />
        </g>
      );
    case 'concerned':
      return <path d="M53.5 79 Q56.75 76 60 79 Q63.25 82 66.5 79" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />;
    case 'sleepy':
      return <ellipse cx="60" cy="78" rx="2.2" ry="2.6" fill="none" stroke={INK} strokeWidth="1.8" />;
    case 'proud':
      return <path d="M54 76 Q61 81.5 67 74.5" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />;
    default:
      return <path d="M55 75.5 Q60 80.5 65 75.5" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />;
  }
}

function Sparkle({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <path
      className="mochi-sparkle"
      style={{ animationDelay: `${delay}s` }}
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -6 C0.8 -1.6 1.6 -0.8 6 0 C1.6 0.8 0.8 1.6 0 6 C-0.8 1.6 -1.6 0.8 -6 0 C-1.6 -0.8 -0.8 -1.6 0 -6Z"
      fill="var(--mochi-sparkle)"
    />
  );
}

export function Mochi({ mood, size = 120, bounceKey = 0, className = '' }: Props) {
  return (
    <span className={`mochi mood-${mood} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <span key={bounceKey} className={bounceKey ? 'mochi-bounce' : undefined}>
        <svg viewBox="0 0 120 120" width="100%" height="100%" overflow="visible">
          <defs>
            <radialGradient id="mochi-fill" cx="42%" cy="34%" r="75%">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset=".62" stopColor="#FFF6F4" />
              <stop offset="1" stopColor="#FCE1E7" />
            </radialGradient>
          </defs>
          <ellipse className="mochi-shadow" cx="60" cy="110" rx="34" ry="5" fill="var(--mochi-shadow)" />
          <g className="mochi-body">
            {/* little arms */}
            <path className="mochi-arm mochi-arm-l" d="M17 78 Q8 76 9 85 Q12 90 19 86" fill="url(#mochi-fill)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            <path className="mochi-arm mochi-arm-r" d="M103 78 Q112 76 111 85 Q108 90 101 86" fill="url(#mochi-fill)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            <path
              d="M60 21 C86 21 102 42 104.5 68 C107 94 90 106 60 106 C30 106 13 94 15.5 68 C18 42 34 21 60 21 Z"
              fill="url(#mochi-fill)"
              stroke={INK}
              strokeWidth="2.2"
            />
            {/* shine */}
            <path d="M36 40 Q40 33 47 30" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" opacity=".9" />
            <ellipse cx="35.5" cy="76" rx="6.5" ry="4" fill="var(--mochi-cheek)" />
            <ellipse cx="84.5" cy="76" rx="6.5" ry="4" fill="var(--mochi-cheek)" />
            <Eyes mood={mood} />
            <Mouth mood={mood} />
            {/* bow */}
            <g transform="translate(80 27) rotate(18)">
              <path d="M0 0 C-6 -10 -18 -9 -16 0 C-18 9 -6 10 0 0Z" fill="var(--mochi-bow)" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M0 0 C6 -10 18 -9 16 0 C18 9 6 10 0 0Z" fill="var(--mochi-bow)" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M-2 2 L-7 13 M2 2 L7 13" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
              <ellipse cx="0" cy="0" rx="3.6" ry="4.2" fill="var(--mochi-bow-knot)" stroke={INK} strokeWidth="1.8" />
            </g>
          </g>
          {mood === 'concerned' && <path className="mochi-drop" d="M100 46 C96 52 96 56 100 57 C104 56 104 52 100 46Z" fill="var(--mochi-drop)" stroke={INK} strokeWidth="1.4" />}
          {mood === 'sleepy' && (
            <g className="mochi-zzz" fill={INK} fontFamily="var(--font-display)" fontWeight="600">
              <text x="98" y="34" fontSize="12">z</text>
              <text x="106" y="22" fontSize="9">z</text>
            </g>
          )}
          {(mood === 'excited' || mood === 'celebrate' || mood === 'proud') && (
            <g>
              <Sparkle x={14} y={30} s={1} />
              <Sparkle x={106} y={46} s={0.8} delay={0.3} />
              {mood === 'celebrate' && <Sparkle x={24} y={12} s={0.6} delay={0.6} />}
              {mood === 'celebrate' && <Sparkle x={100} y={10} s={1.1} delay={0.15} />}
            </g>
          )}
        </svg>
      </span>
    </span>
  );
}
