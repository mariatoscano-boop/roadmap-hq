/** Line icons on a 16×16 grid. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 16): SVGProps<SVGSVGElement> => ({ width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true });
const I = (d: string | string[]) => ({ size, ...p }: P) => <svg {...base(size)} {...p}>{(Array.isArray(d) ? d : [d]).map((x, i) => <path key={i} d={x} />)}</svg>;

/** ✦ Today */
export const IconToday = I('M8 1.5c.6 3.6 1.9 4.9 5.5 5.5-3.6.6-4.9 1.9-5.5 5.5C7.4 8.9 6.1 7.6 2.5 7c3.6-.6 4.9-1.9 5.5-5.5Z');
/** ◎ Worlds */
export const IconWorlds = ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="2.4" /></svg>;
/** ◌ Quests */
export const IconQuests = ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="8" cy="8" r="6" strokeDasharray="2.2 2" /><path d="m5.6 8.2 1.7 1.7 3.2-3.4" /></svg>;
/** ◇ Collection */
export const IconCollection = I(['M8 1.8 14.2 8 8 14.2 1.8 8Z', 'M8 5.2 10.8 8 8 10.8 5.2 8Z']);
export const IconPlus = I('M8 3v10M3 8h10');
export const IconX = I('M4 4l8 8M12 4l-8 8');
export const IconCheck = I('m3.5 8.5 3 3 6-7');
export const IconArrow = I(['M3 8h10', 'm9 4 4 4-4 4']);
export const IconBack = I(['M13 8H3', 'm7 4-4 4 4 4']);
export const IconSync = I(['M13 6A5.2 5.2 0 0 0 3.6 4.4M3 10a5.2 5.2 0 0 0 9.4 1.6', 'M13 2.5V6H9.5M3 13.5V10h3.5']);
export const IconPlug = I(['M6 2v3M10 2v3', 'M4 5h8v2.5a4 4 0 0 1-8 0Z', 'M8 11.5V14']);
export const IconPlay = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 3.5v9l7-4.5z" fill="currentColor" /></svg>;
export const IconPause = I(['M5.5 3.5v9', 'M10.5 3.5v9']);
export const IconCalendar = I(['M2.5 4h11v9.5h-11z', 'M2.5 7h11', 'M5.5 2.5v3M10.5 2.5v3']);
export const IconClock = ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="8" cy="8" r="6" /><path d="M8 4.8V8l2.2 1.4" /></svg>;
export const IconTrash = I(['M2.5 4.5h11', 'M6 4.5V3h4v1.5', 'M4 4.5l.6 8.5a1 1 0 0 0 1 1h4.8a1 1 0 0 0 1-1l.6-8.5']);
export const IconExternal = I(['M9.5 2.5h4v4', 'M13.5 2.5 7.5 8.5', 'M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3']);
export const IconFlag = I('M4 14V2.5m0 .5h8l-2 3 2 3H4');
export const IconNote = I(['M3 2.5h7l3 3v8H3z', 'M10 2.5v3h3', 'M5.5 8.5h5M5.5 11h3']);
