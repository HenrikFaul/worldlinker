import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LEVEL_COUNT } from '../engine/levels';

const STARTING_COINS = 100;

export interface GameState {
  coins: number;
  /** Highest unlocked level (the furthest the player may jump to). */
  maxLevel: number;
  /** Best star rating earned per level id. */
  levelStars: Record<number, number>;
  soundOn: boolean;

  addCoins: (n: number) => void;
  /** Spend coins if affordable. Returns true on success. */
  spendCoins: (n: number) => boolean;
  /** Record a completed level: store best stars, unlock the next, grant coins. */
  recordLevelResult: (levelId: number, stars: number, reward: number) => void;
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

      setSound: (on) => set({ soundOn: on }),

      hardReset: () =>
        set({ coins: STARTING_COINS, maxLevel: 1, levelStars: {}, soundOn: true }),
    }),
    {
      name: 'word-linker-save',
      version: 1,
      partialize: (s) => ({
        coins: s.coins,
        maxLevel: s.maxLevel,
        levelStars: s.levelStars,
        soundOn: s.soundOn,
      }),
    },
  ),
);

/** Total stars earned across all levels (for menu display). */
export const selectTotalStars = (s: GameState) =>
  Object.values(s.levelStars).reduce((a, b) => a + b, 0);
