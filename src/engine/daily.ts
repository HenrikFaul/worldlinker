import type { RawLevel } from './levels';

export interface DailyInfo {
  puzzle: RawLevel;
  dateKey: string; // YYYY-MM-DD (local)
  yesterdayKey: string;
  index: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-date key, e.g. "2026-06-26". */
export const dateKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Whole days since the epoch for the local date (ignores time of day). */
const dayNumber = (d: Date) =>
  Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);

/** Friendly label, e.g. "Friday, June 26". */
export const friendlyDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

/** Coins for finishing the daily, scaled by stars (a touch above campaign). */
export const dailyReward = (stars: number) => 50 + stars * 20;

// The daily pool is large-ish (~150 KB) and only needed when the player opens
// Daily, so it is code-split into its own chunk and cached after first load.
let cache: RawLevel[] | null = null;
async function loadPool(): Promise<RawLevel[]> {
  if (!cache) {
    const mod = await import('../data/daily.json');
    cache = mod.default as unknown as RawLevel[];
  }
  return cache;
}

/** The puzzle everyone gets for the given local date (deterministic by date). */
export async function getDailyInfo(date: Date): Promise<DailyInfo> {
  const pool = await loadPool();
  const index = ((dayNumber(date) % pool.length) + pool.length) % pool.length;
  // synthetic, collision-free id so the play hook treats each day as a new level
  const puzzle: RawLevel = { ...pool[index], id: 1_000_000 + index };
  const y = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  return { puzzle, dateKey: dateKeyOf(date), yesterdayKey: dateKeyOf(y), index };
}
