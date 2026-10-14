import type { Reward, RewardId } from '../types';

export const STARS_PER_TASK = 10;

/** Unlock order. Star thresholds are cumulative; the disco ball comes from finishing a project. */
export const REWARDS: Reward[] = [
  { id: 'laptop', type: 'decor', name: 'Laptop', stars: 0, blurb: 'Where the magic happens.' },
  { id: 'coffee', type: 'decor', name: 'Iced latte', stars: 20, blurb: 'Oat milk, obviously.' },
  { id: 'plant', type: 'decor', name: 'Little plant', stars: 30, blurb: 'Grows when you do.' },
  { id: 'flowers', type: 'decor', name: 'Flowers', stars: 40, blurb: 'A tiny bouquet for you.' },
  { id: 'bow', type: 'decor', name: 'Window bow', stars: 60, blurb: 'Everything is better with a bow.' },
  { id: 'candle', type: 'decor', name: 'Candle', stars: 80, blurb: 'Smells like finished tasks.' },
  { id: 'plushie', type: 'decor', name: 'Teddy', stars: 110, blurb: 'Moral support, full time.' },
  { id: 'bag', type: 'decor', name: 'Mini bag', stars: 140, blurb: 'For your lip gloss and ambitions.' },
  { id: 'cat', type: 'pet', name: 'Kitty', stars: 170, blurb: 'Sits on the keyboard. Helps.' },
  { id: 'disco', type: 'special', name: 'Disco ball', stars: null, blurb: 'Finish a whole project to unlock.' },
];

export const rewardById = (id: RewardId) => REWARDS.find((r) => r.id === id)!;

/** Items the star balance unlocks that aren't unlocked yet. */
export function newlyUnlocked(stars: number, unlocked: RewardId[]): RewardId[] {
  return REWARDS.filter((r) => r.stars !== null && stars >= r.stars && !unlocked.includes(r.id)).map((r) => r.id);
}

export const nextReward = (unlocked: RewardId[]) => REWARDS.find((r) => r.stars !== null && !unlocked.includes(r.id));

export const LEVEL_SIZE = 50;
export const levelOf = (stars: number) => Math.floor(Math.max(0, stars) / LEVEL_SIZE) + 1;
export const levelProgress = (stars: number) => (Math.max(0, stars) % LEVEL_SIZE) / LEVEL_SIZE;
