/** Small line icons, 24×24, drawn to match Mochi's outline weight. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

export const IconHeart = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" /></svg>
);
export const IconBow = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 11.5C9.5 6.5 3.5 6.8 3.8 11.5 3.5 16.2 9.5 16.5 12 11.5ZM12 11.5c2.5-5 8.5-4.7 8.2 0 .3 4.7-5.7 5-8.2 0Z" />
    <path d="M11 13l-2.5 6M13 13l2.5 6" />
  </svg>
);
export const IconSparkle = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5c.7 4.3 1.9 5.6 6.5 6.5-4.6.9-5.8 2.2-6.5 6.5-.7-4.3-1.9-5.6-6.5-6.5 4.6-.9 5.8-2.2 6.5-6.5Z" />
    <path d="M18.5 15.5c.3 1.6.8 2.1 2.3 2.4-1.5.3-2 .8-2.3 2.4-.3-1.6-.8-2.1-2.3-2.4 1.5-.3 2-.8 2.3-2.4Z" />
  </svg>
);
export const IconTeddy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="6.8" cy="6.8" r="2.3" /><circle cx="17.2" cy="6.8" r="2.3" />
    <circle cx="12" cy="12.5" r="7" />
    <ellipse cx="12" cy="14.8" rx="2.6" ry="2" />
    <path d="M9.6 11h.01M14.4 11h.01" strokeWidth="2.4" />
  </svg>
);
export const IconFlower = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="10" r="2" />
    <path d="M12 8c-1.5-3.5 1.5-5 1.5-5s3 1.5 1.5 5M14 10c3.5-1.5 5 1.5 5 1.5s-1.5 3-5 1.5M12 12c1.5 3.5-1.5 5-1.5 5s-3-1.5-1.5-5M10 10C6.5 11.5 5 8.5 5 8.5s1.5-3 5-1.5" transform="rotate(-8 12 10)" />
    <path d="M12 12.5V21M12 18c-2-2.5-4.5-2.4-5.5-2 1 2 3 3 5.5 2Z" />
  </svg>
);
export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2.2} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconClose = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconChevron = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m9 6 6 6-6 6" /></svg>
);
export const IconBack = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m15 6-6 6 6 6" /></svg>
);
export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2.6} {...p}><path className="check-path" d="M5.5 12.5l4 4 9-9.5" /></svg>
);
export const IconSync = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M19 8a7.5 7.5 0 0 0-13.3-1.4M5 16a7.5 7.5 0 0 0 13.3 1.4" /><path d="M19 3.5V8h-4.5M5 20.5V16h4.5" /></svg>
);
export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7" /></svg>
);
export const IconCloud = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M7.5 18.5a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.6 1.3 3.4 3.4 0 0 1-.5 6.7Z" /></svg>
);
export const IconPlate = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12.5" r="8" /><circle cx="12" cy="12.5" r="4.6" /><path d="M12 2.5v1.6" /></svg>
);
export const IconFlag = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 21V4.5M6 5h10.5l-2 3.5 2 3.5H6" /></svg>
);
