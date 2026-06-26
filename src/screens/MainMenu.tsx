import { useState } from 'react';
import { useGameStore, selectTotalStars } from '../state/gameStore';
import { LEVEL_COUNT } from '../engine/levels';
import { sfx } from '../engine/audio';
import Orbit from '../components/Orbit';
import Toast, { type ToastData } from '../components/Toast';

interface Props {
  onPlay: () => void;
  onDaily: () => void;
  onOpenSettings: () => void;
}

export default function MainMenu({ onPlay, onDaily, onOpenSettings }: Props) {
  const coins = useGameStore((s) => s.coins);
  const maxLevel = useGameStore((s) => s.maxLevel);
  const totalStars = useGameStore(selectTotalStars);
  const [toast, setToast] = useState<ToastData | null>(null);

  const comingSoon = (what: string) => {
    sfx.tap();
    setToast({ id: Date.now(), text: `${what} — coming soon ✨`, kind: 'info' });
    window.setTimeout(() => setToast(null), 1600);
  };

  const started = maxLevel > 1;

  return (
    <div className="menu">
      <div className="menu__top">
        <button className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18 6l-1.6 1.6M7.6 16.4L6 18M18 18l-1.6-1.6M7.6 7.6L6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <h1 className="menu__logo">
        WORD
        <span>
          LIN<span className="accent">K</span>ER
        </span>
      </h1>
      <p className="menu__tag">Connect Letters. Find Words.</p>

      <div className="menu__orbit">
        <Orbit />
      </div>

      <div className="menu__actions">
        <button
          className="btn btn--primary btn--lg btn--block"
          onClick={() => {
            sfx.unlock();
            sfx.tap();
            onPlay();
          }}
        >
          {started ? `Continue · Level ${maxLevel}` : 'Play'}
        </button>
        <div className="menu__row">
          <button
            className="btn btn--accent"
            onClick={() => {
              sfx.unlock();
              sfx.tap();
              onDaily();
            }}
          >
            Daily
          </button>
          <button className="btn btn--ghost" onClick={() => comingSoon('Themes')}>
            Themes
          </button>
        </div>
      </div>

      <div className="menu__stats">
        <span className="chip">
          <span className="coin-dot" />
          {coins}
        </span>
        <span className="chip">⭐ {totalStars}</span>
        <span className="chip">
          {maxLevel}/{LEVEL_COUNT}
        </span>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
