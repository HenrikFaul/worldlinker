import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LEVEL_COUNT } from '../engine/levels';

const STARTING_COINS = 100;

export interface DailyResult {
  stars: number;
  found: number; // main words found (equals total when completed)
  total: number; // main words in the puzzle
  bonus: number; // extra words discovered
}

export interface GameState {
  coins: number;
  /** Highest unlocked level (the furthest the player may jump to). */
  maxLevel: number;
  /** Best star rating earned per level id. */
  levelStars: Record<number, number>;
  soundOn: boolean;

  /** Consecutive-day streak for the Daily Word. */
  dailyStreak: number;
  /** Date key (YYYY-MM-DD) of the last completed daily. */
  lastDailyDate: string | null;
  /** Results of completed dailies, keyed by date. */
  dailyResults: Record<string, DailyResult>;

  addCoins: (n: number) => void;
  /** Spend coins if affordable. Returns true on success. */
  spendCoins: (n: number) => boolean;
  /** Record a completed level: store best stars, unlock the next, grant coins. */
  recordLevelResult: (levelId: number, stars: number, reward: number) => void;
  /** Record a completed daily: update streak + result, grant coins once per day. */
  recordDailyResult: (
    dateKey: string,
    yesterdayKey: string,
    result: DailyResult,
    reward: number,
  ) => void;
  setSound: (on: boolean) => void;
  hardReset: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      coins: STARTING_COINS,
      maxLevel: 1,
      levelStars: {},
      soundOn: true,
      dailyStreak: 0,
      lastDailyDate: null,
      dailyResults: {},

      addCoins: (n) => set((s) => ({ coins: s.coins + n })),

      spendCoins: (n) => {
        if (get().coins < n) return false;
        set((s) => ({ coins: s.coins - n }));
        return true;
      },

      recordLevelResult: (levelId, stars, reward) =>
        set((s) => {
          const prevStars = s.levelStars[levelId] ?? 0;
          const unlockNext = levelId >= s.maxLevel && s.maxLevel < LEVEL_COUNT;
          return {
            coins: s.coins + reward,
            levelStars: { ...s.levelStars, [levelId]: Math.max(prevStars, stars) },
            maxLevel: unlockNext ? s.maxLevel + 1 : s.maxLevel,
          };
        }),

      recordDailyResult: (dateKey, yesterdayKey, result, reward) =>
        set((s) => {
          if (s.dailyResults[dateKey]) return s; // already done today — no double reward
          const streak = s.lastDailyDate === yesterdayKey ? s.dailyStreak + 1 : 1;
          return {
            coins: s.coins + reward,
            dailyStreak: streak,
            lastDailyDate: dateKey,
            dailyResults: { ...s.dailyResults, [dateKey]: result },
          };
        }),

      setSound: (on) => set({ soundOn: on }),

      hardReset: () =>
        set({
          coins: STARTING_COINS,
          maxLevel: 1,
          levelStars: {},
          soundOn: true,
          dailyStreak: 0,
          lastDailyDate: null,
          dailyResults: {},
        }),
    }),
    {
      name: 'word-linker-save',
      version: 1,
      partialize: (s) => ({
        coins: s.coins,
        maxLevel: s.maxLevel,
        levelStars: s.levelStars,
        soundOn: s.soundOn,
        dailyStreak: s.dailyStreak,
        lastDailyDate: s.lastDailyDate,
        dailyResults: s.dailyResults,
      }),
    },
  ),
);

/** Total stars earned across all levels (for menu display). */
export const selectTotalStars = (s: GameState) =>
  Object.values(s.levelStars).reduce((a, b) => a + b, 0);
