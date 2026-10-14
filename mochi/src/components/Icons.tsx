/** Line icons on a 16×16 grid, 1.5px strokes to sit with Geist. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const svg = (size = 16): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
});
const I = (d: string | string[]) => ({ size, ...p }: P) => (
  <svg {...svg(size)} {...p}>{(Array.isArray(d) ? d : [d]).map((x, i) => <path key={i} d={x} />)}</svg>
);

export const IconToday = ({ size, ...p }: P) => (
  <svg {...svg(size)} {...p}><circle cx="8" cy="8" r="2.75" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" /></svg>
);
export const IconWork = I(['M2 9.5h3.2l1 1.75h3.6l1-1.75H14', 'M2 9.5 3.6 3.6A1.5 1.5 0 0 1 5 2.5h6a1.5 1.5 0 0 1 1.4 1.1L14 9.5v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z']);
export const IconProjects = I(['M2.5 2.5h4.5v4.5H2.5z', 'M9 2.5h4.5v4.5H9z', 'M2.5 9h4.5v4.5H2.5z', 'M9 9h4.5v4.5H9z']);
export const IconTeam = ({ size, ...p }: P) => (
  <svg {...svg(size)} {...p}><circle cx="6" cy="5.5" r="2.25" /><path d="M2 13.5c.4-2.3 2-3.5 4-3.5s3.6 1.2 4 3.5" /><path d="M10.5 3.4a2.2 2.2 0 0 1 0 4.2M12 10.3c1 .5 1.7 1.6 2 3.2" /></svg>
);
export const IconActivity = I('M1.5 8.5h2.7l1.8-5 3.5 9 1.9-4h3.1');
export const IconPlus = I('M8 3v10M3 8h10');
export const IconChevronDown = I('m4 6 4 4 4-4');
export const IconChevronRight = I('m6 4 4 4-4 4');
export const IconArrowRight = I(['M3 8h10', 'm9 4 4 4-4 4']);
export const IconBack = I(['M13 8H3', 'm7 4-4 4 4 4']);
export const IconX = I('M4 4l8 8M12 4l-8 8');
export const IconCheck = I('m3.5 8.5 3 3 6-7');
export const IconSync = I(['M13 6A5.2 5.2 0 0 0 3.6 4.4M3 10a5.2 5.2 0 0 0 9.4 1.6', 'M13 2.5V6H9.5M3 13.5V10h3.5']);
export const IconSettings = ({ size, ...p }: P) => (
  <svg {...svg(size)} {...p}><circle cx="8" cy="8" r="2" /><path d="M8 1.75v1.5M8 12.75v1.5M14.25 8h-1.5M3.25 8h-1.5M12.4 3.6l-1.06 1.06M4.66 11.34 3.6 12.4M12.4 12.4l-1.06-1.06M4.66 4.66 3.6 3.6" /></svg>
);
export const IconPlay = ({ size, ...p }: P) => (
  <svg {...svg(size)} {...p}><path d="M5 3.5v9l7-4.5z" fill="currentColor" /></svg>
);
export const IconPause = I(['M5.5 3.5v9', 'M10.5 3.5v9']);
export const IconCalendar = I(['M2.5 4h11v9.5h-11z', 'M2.5 7h11', 'M5.5 2.5v3M10.5 2.5v3']);
export const IconLock = ({ size, ...p }: P) => (
  <svg {...svg(size)} {...p}><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
);
export const IconCloud = I('M4.5 12.5a3 3 0 0 1-.4-6 4 4 0 0 1 7.7 1 2.5 2.5 0 0 1-.3 5z');
export const IconTrash = I(['M2.5 4.5h11', 'M6 4.5V3h4v1.5', 'M4 4.5l.6 8.5a1 1 0 0 0 1 1h4.8a1 1 0 0 0 1-1l.6-8.5']);
export const IconGrip = ({ size, ...p }: P) => (
  <svg {...svg(size)} {...p} fill="currentColor" stroke="none">{[4, 8, 12].flatMap((y) => [6, 10].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1" />))}</svg>
);
export const IconBoard = I(['M2.5 2.5h3v11h-3z', 'M6.5 2.5h3v7h-3z', 'M10.5 2.5h3v9h-3z']);
export const IconList = I(['M5.5 4h8M5.5 8h8M5.5 12h8', 'M2.5 4h.01M2.5 8h.01M2.5 12h.01']);
export const IconBolt = I('M9 1.5 3.5 9h4L7 14.5 12.5 7h-4z');
export const IconTarget = ({ size, ...p }: P) => (
  <svg {...svg(size)} {...p}><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="3" /><circle cx="8" cy="8" r=".5" fill="currentColor" /></svg>
);
export const IconReturn = I(['M13 3.5V8a1.5 1.5 0 0 1-1.5 1.5H3', 'm6 6.5-3 3 3 3']);
