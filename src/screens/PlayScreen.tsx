import { useEffect, useRef, useState } from 'react';
import {
  hasNextLevel,
  levelCompleteReward,
  starsForHints,
  type RawLevel,
} from '../engine/levels';
import { dailyReward } from '../engine/daily';
import { useGameStore } from '../state/gameStore';
import { usePlayLevel } from '../state/usePlayLevel';
import { sfx } from '../engine/audio';
import { buildDailyShare, shareText } from '../lib/share';
import LetterCircle, { type Tile } from '../components/LetterCircle';
import WordGrid from '../components/WordGrid';
import HudBar from '../components/HudBar';
import HintBar from '../components/HintBar';
import BonusJar from '../components/BonusJar';
import Toast, { type ToastData } from '../components/Toast';
import LevelCompleteModal from '../components/LevelCompleteModal';
import HowToPlay from '../components/HowToPlay';

interface Props {
  level: RawLevel;
  mode: 'campaign' | 'daily';
  subtitle: string;
  title: string;
  daily?: { dateKey: string; yesterdayKey: string };
  onNext?: () => void;
  onExit: () => void;
  onOpenSettings: () => void;
}

interface CompleteState {
  stars: number;
  coins: number;
  bonus: number;
  mode: 'campaign' | 'daily';
  streak?: number;
  total?: number;
}

const IDLE_MS = 40_000;

const makeTiles = (letters: string): Tile[] => [...letters].map((char, id) => ({ id, char }));

function shuffleTiles(tiles: Tile[]): Tile[] {
  const r = tiles.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function PlayScreen({
  level,
  mode,
  subtitle,
  title,
  daily,
  onNext,
  onExit,
  onOpenSettings,
}: Props) {
  const play = usePlayLevel(level);
  const recordLevelResult = useGameStore((s) => s.recordLevelResult);
  const recordDailyResult = useGameStore((s) => s.recordDailyResult);
  const markHowToSeen = useGameStore((s) => s.markHowToSeen);
  const [showHowTo, setShowHowTo] = useState(
    mode === 'campaign' && !useGameStore.getState().seenHowTo,
  );

  const [tiles, setTiles] = useState<Tile[]>(() => makeTiles(level.letters));
  const [preview, setPreview] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [complete, setComplete] = useState<CompleteState | null>(null);
  const [pulseHint, setPulseHint] = useState(false);

  const toastTimer = useRef<number>(0);
  const handledComplete = useRef(false);
  const lastActive = useRef(Date.now());

  const showToast = (text: string, kind: ToastData['kind']) => {
    setToast({ id: Date.now() + Math.floor(Math.random() * 1000), text, kind });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1200);
  };

  const bump = () => {
    lastActive.current = Date.now();
    setPulseHint(false);
  };

  // idle nudge: pulse the hint button after a while with no progress
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!play.isComplete && Date.now() - lastActive.current > IDLE_MS) setPulseHint(true);
    }, 1000);
    return () => window.clearInterval(t);
  }, [play.isComplete]);

  // completion
  useEffect(() => {
    if (!play.isComplete || handledComplete.current) return;
    handledComplete.current = true;
    const stars = starsForHints(play.hintsUsed);
    sfx.levelComplete();

    let payload: CompleteState;
    if (mode === 'daily' && daily) {
      const reward = dailyReward(stars);
      const total = play.mainCount;
      const bonus = play.foundBonus.size;
      recordDailyResult(daily.dateKey, daily.yesterdayKey, { stars, found: total, total, bonus }, reward);
      payload = {
        stars,
        coins: play.earned + reward,
        bonus,
        mode: 'daily',
        streak: useGameStore.getState().dailyStreak,
        total,
      };
    } else {
      const reward = levelCompleteReward(stars);
      recordLevelResult(level.id, stars, reward);
      payload = { stars, coins: play.earned + reward, bonus: play.foundBonus.size, mode: 'campaign' };
    }

    const t = window.setTimeout(() => setComplete(payload), 650);
    return () => window.clearTimeout(t);
  }, [
    play.isComplete,
    play.hintsUsed,
    play.earned,
    play.foundBonus,
    play.mainCount,
    mode,
    daily,
    level.id,
    recordLevelResult,
    recordDailyResult,
  ]);

  const handleSubmit = (word: string) => {
    setPreview('');
    const res = play.submitWord(word);
    switch (res.type) {
      case 'main':
        sfx.found();
        showToast(`+${res.coins}`, 'main');
        bump();
        break;
      case 'bonus':
        sfx.bonus();
        showToast(res.jarFilled ? `Jar full! +${res.coins}` : `Bonus +${res.coins}`, 'bonus');
        bump();
        break;
      case 'dupe':
        sfx.tap();
        showToast('Already found', 'info');
        break;
      case 'invalid':
        sfx.reject();
        showToast('Not a word', 'bad');
        break;
      case 'short':
        break;
    }
  };

  const handleRevealLetter = () => {
    const r = play.revealLetter();
    if (!r.ok) {
      if (r.reason === 'coins') {
        sfx.reject();
        showToast('Not enough coins', 'bad');
      }
      return;
    }
    sfx.coin();
    bump();
  };

  const handleRevealWord = () => {
    const r = play.revealWord();
    if (!r.ok) {
      if (r.reason === 'coins') {
        sfx.reject();
        showToast('Not enough coins', 'bad');
      }
      return;
    }
    sfx.coin();
    bump();
  };

  const handleShuffle = () => {
    setTiles((t) => shuffleTiles(t));
    sfx.tap();
    bump();
  };

  const handleShare = async () => {
    if (!complete || !daily) return;
    const text = buildDailyShare(
      daily.dateKey,
      complete.stars,
      (complete.total ?? 0) + complete.bonus,
      complete.total ?? 0,
    );
    const outcome = await shareText(text);
    if (outcome === 'copied') showToast('Copied to clipboard!', 'bonus');
    else if (outcome === 'failed') showToast('Could not share', 'bad');
  };

  return (
    <div className="play">
      <HudBar subtitle={subtitle} title={title} onBack={onExit} onSettings={onOpenSettings} />

      <div className="play__theme">
        {play.foundCount} / {play.mainCount} words
      </div>

      <div className="play__grid">
        <WordGrid words={level.mainWords} found={play.foundMain} revealed={play.revealed} />
      </div>

      <div className="play__bottom">
        <div className="play__preview">
          {preview.length > 0 && <div className="preview-pill">{preview}</div>}
        </div>

        <LetterCircle
          tiles={tiles}
          onSubmit={handleSubmit}
          onSelectionChange={setPreview}
          disabled={play.isComplete}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
          <BonusJar count={play.jar} />
        </div>

        <HintBar
          revealLetterCost={play.nextRevealCost}
          onRevealLetter={handleRevealLetter}
          onShuffle={handleShuffle}
          onRevealWord={handleRevealWord}
          disabled={play.isComplete}
          pulseHint={pulseHint}
        />
      </div>

      <Toast toast={toast} />

      {showHowTo && (
        <HowToPlay
          onClose={() => {
            setShowHowTo(false);
            markHowToSeen();
          }}
        />
      )}

      {complete && (
        <LevelCompleteModal
          stars={complete.stars}
          coins={complete.coins}
          bonusFound={complete.bonus}
          mode={complete.mode}
          streak={complete.streak}
          isLastLevel={mode === 'campaign' && !hasNextLevel(level.id)}
          onShare={handleShare}
          onNext={() => {
            setComplete(null);
            sfx.tap();
            onNext?.();
          }}
          onMenu={() => {
            setComplete(null);
            onExit();
          }}
        />
      )}
    </div>
  );
}
