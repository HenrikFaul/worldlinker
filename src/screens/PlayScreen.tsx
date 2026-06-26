import { useEffect, useRef, useState } from 'react';
import {
  getLevel,
  hasNextLevel,
  levelCompleteReward,
  starsForHints,
} from '../engine/levels';
import { useGameStore } from '../state/gameStore';
import { usePlayLevel } from '../state/usePlayLevel';
import { sfx } from '../engine/audio';
import LetterCircle, { type Tile } from '../components/LetterCircle';
import WordGrid from '../components/WordGrid';
import HudBar from '../components/HudBar';
import HintBar from '../components/HintBar';
import BonusJar from '../components/BonusJar';
import Toast, { type ToastData } from '../components/Toast';
import LevelCompleteModal from '../components/LevelCompleteModal';

interface Props {
  levelNumber: number;
  onNext: () => void;
  onExit: () => void;
  onOpenSettings: () => void;
}

const IDLE_MS = 40_000;

const makeTiles = (letters: string): Tile[] =>
  [...letters].map((char, id) => ({ id, char }));

function shuffleTiles(tiles: Tile[]): Tile[] {
  const r = tiles.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function PlayScreen({ levelNumber, onNext, onExit, onOpenSettings }: Props) {
  const level = getLevel(levelNumber);
  const play = usePlayLevel(level);
  const recordLevelResult = useGameStore((s) => s.recordLevelResult);

  const [tiles, setTiles] = useState<Tile[]>(() => makeTiles(level.letters));
  const [preview, setPreview] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [complete, setComplete] = useState<{ stars: number; coins: number; bonus: number } | null>(
    null,
  );
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

  // reset everything when the level changes
  useEffect(() => {
    setTiles(makeTiles(level.letters));
    setPreview('');
    setComplete(null);
    setPulseHint(false);
    handledComplete.current = false;
    lastActive.current = Date.now();
  }, [level.id, level.letters]);

  // idle nudge: pulse the hint button after a while with no progress
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!play.isComplete && Date.now() - lastActive.current > IDLE_MS) setPulseHint(true);
    }, 1000);
    return () => window.clearInterval(t);
  }, [play.isComplete]);

  // level completion
  useEffect(() => {
    if (!play.isComplete || handledComplete.current) return;
    handledComplete.current = true;
    const stars = starsForHints(play.hintsUsed);
    const reward = levelCompleteReward(stars);
    recordLevelResult(level.id, stars, reward);
    sfx.levelComplete();
    const t = window.setTimeout(
      () => setComplete({ stars, coins: play.earned + reward, bonus: play.foundBonus.size }),
      650,
    );
    return () => window.clearTimeout(t);
  }, [play.isComplete, play.hintsUsed, play.earned, play.foundBonus, level.id, recordLevelResult]);

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
        // ignore very short drags silently
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

  return (
    <div className="play">
      <HudBar level={levelNumber} onBack={onExit} onSettings={onOpenSettings} />

      <div className="play__theme">
        {play.foundCount} / {play.mainCount} words
      </div>

      <div className="play__grid">
        <WordGrid words={level.mainWords} found={play.foundMain} revealed={play.revealed} />
      </div>

      <div className="play__bottom">
        <div className="play__preview">
          {preview.length > 0 && (
            <div className="preview-pill">{preview}</div>
          )}
        </div>

        <LetterCircle
          tiles={tiles}
          onSubmit={handleSubmit}
          onSelectionChange={setPreview}
          disabled={play.isComplete}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 14,
          }}
        >
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

      {complete && (
        <LevelCompleteModal
          stars={complete.stars}
          coins={complete.coins}
          bonusFound={complete.bonus}
          isLastLevel={!hasNextLevel(level.id)}
          onNext={() => {
            setComplete(null);
            sfx.tap();
            onNext();
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
