import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BONUS_JAR_REWARD,
  BONUS_JAR_SIZE,
  BONUS_WORD_REWARD,
  mainWordReward,
  REVEAL_WORD_COST,
  revealLetterCost,
  type RawLevel,
} from '../engine/levels';
import { useGameStore } from './gameStore';

export type SubmitType = 'main' | 'bonus' | 'dupe' | 'short' | 'invalid';

export interface SubmitResult {
  type: SubmitType;
  word: string;
  coins: number;
  jarFilled?: boolean;
}

export interface HintResult {
  ok: boolean;
  reason?: 'coins' | 'complete';
  cost: number;
  word?: string;
}

/**
 * Ephemeral state for a single playthrough of a level: which words are found,
 * which hint letters are revealed, hints used, the bonus jar, and coins earned.
 * Resets automatically when the level id changes. Coin rewards are pushed to the
 * persistent store as words are found.
 */
export function usePlayLevel(level: RawLevel) {
  const addCoins = useGameStore((s) => s.addCoins);
  const spendCoins = useGameStore((s) => s.spendCoins);

  const [foundMain, setFoundMain] = useState<Set<string>>(() => new Set());
  const [foundBonus, setFoundBonus] = useState<Set<string>>(() => new Set());
  const [revealed, setRevealed] = useState<Record<string, number[]>>({});
  const [hintsUsed, setHintsUsed] = useState(0);
  const [jar, setJar] = useState(0);
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    setFoundMain(new Set());
    setFoundBonus(new Set());
    setRevealed({});
    setHintsUsed(0);
    setJar(0);
    setEarned(0);
  }, [level.id]);

  const mainSet = useMemo(() => new Set(level.mainWords), [level]);
  const bonusSet = useMemo(() => new Set(level.bonusWords), [level]);

  const isComplete = foundMain.size === level.mainWords.length;

  const submitWord = useCallback(
    (raw: string): SubmitResult => {
      const word = raw.toUpperCase();
      if (word.length < 3) return { type: 'short', word, coins: 0 };

      if (mainSet.has(word)) {
        if (foundMain.has(word)) return { type: 'dupe', word, coins: 0 };
        const coins = mainWordReward(word);
        setFoundMain((s) => new Set(s).add(word));
        addCoins(coins);
        setEarned((e) => e + coins);
        return { type: 'main', word, coins };
      }

      if (bonusSet.has(word)) {
        if (foundBonus.has(word)) return { type: 'dupe', word, coins: 0 };
        const nextJar = jar + 1;
        const jarFilled = nextJar >= BONUS_JAR_SIZE;
        const coins = BONUS_WORD_REWARD + (jarFilled ? BONUS_JAR_REWARD : 0);
        setFoundBonus((s) => new Set(s).add(word));
        setJar(jarFilled ? 0 : nextJar);
        addCoins(coins);
        setEarned((e) => e + coins);
        return { type: 'bonus', word, coins, jarFilled };
      }

      return { type: 'invalid', word, coins: 0 };
    },
    [mainSet, bonusSet, foundMain, foundBonus, jar, addCoins],
  );

  const unfoundShortestFirst = useCallback(
    () => level.mainWords.filter((w) => !foundMain.has(w)).sort((a, b) => a.length - b.length),
    [level, foundMain],
  );

  const revealLetter = useCallback((): HintResult => {
    if (isComplete) return { ok: false, reason: 'complete', cost: 0 };
    const cost = revealLetterCost(hintsUsed);
    if (!spendCoins(cost)) return { ok: false, reason: 'coins', cost };

    const word = unfoundShortestFirst()[0];
    const rev = revealed[word] ?? [];
    let nextIdx = -1;
    for (let i = 0; i < word.length; i++) {
      if (!rev.includes(i)) {
        nextIdx = i;
        break;
      }
    }
    const newRev = [...rev, nextIdx];
    setRevealed((r) => ({ ...r, [word]: newRev }));
    setHintsUsed((h) => h + 1);
    if (newRev.length === word.length) setFoundMain((s) => new Set(s).add(word));
    return { ok: true, cost, word };
  }, [isComplete, hintsUsed, revealed, spendCoins, unfoundShortestFirst]);

  const revealWord = useCallback((): HintResult => {
    if (isComplete) return { ok: false, reason: 'complete', cost: 0 };
    const cost = REVEAL_WORD_COST;
    if (!spendCoins(cost)) return { ok: false, reason: 'coins', cost };

    const word = unfoundShortestFirst()[0];
    setFoundMain((s) => new Set(s).add(word));
    setRevealed((r) => ({ ...r, [word]: Array.from({ length: word.length }, (_, i) => i) }));
    setHintsUsed((h) => h + 1);
    return { ok: true, cost, word };
  }, [isComplete, spendCoins, unfoundShortestFirst]);

  return {
    foundMain,
    foundBonus,
    revealed,
    hintsUsed,
    jar,
    earned,
    isComplete,
    foundCount: foundMain.size,
    mainCount: level.mainWords.length,
    submitWord,
    revealLetter,
    revealWord,
    nextRevealCost: revealLetterCost(hintsUsed),
  };
}
