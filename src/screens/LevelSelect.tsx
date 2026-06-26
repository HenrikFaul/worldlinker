import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import { LEVEL_COUNT } from '../engine/levels';
import { sfx } from '../engine/audio';

interface Props {
  onPick: (level: number) => void;
  onBack: () => void;
}

const MAP_W = 300;
const ROW = 92;
const TOP_PAD = 64;
const AMP = 82;

const nodeX = (n: number) => MAP_W / 2 + Math.sin(n * 0.9) * AMP;
const nodeY = (n: number) => TOP_PAD + (n - 1) * ROW;

export default function LevelSelect({ onPick, onBack }: Props) {
  const coins = useGameStore((s) => s.coins);
  const maxLevel = useGameStore((s) => s.maxLevel);
  const levelStars = useGameStore((s) => s.levelStars);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mapHeight = TOP_PAD * 2 + (LEVEL_COUNT - 1) * ROW;

  const pathD = useMemo(() => {
    let d = '';
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      d += `${n === 1 ? 'M' : 'L'} ${nodeX(n).toFixed(1)} ${nodeY(n).toFixed(1)} `;
    }
    return d.trim();
  }, []);

  // open centred on the current level
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = nodeY(Math.min(maxLevel, LEVEL_COUNT)) - el.clientHeight / 2;
  }, [maxLevel]);

  return (
    <div className="select">
      <div className="hud">
        <button className="icon-btn" onClick={onBack} aria-label="Back to menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="select__title">Levels</span>
        <span className="chip">
          <span className="coin-dot" />
          {coins}
        </span>
      </div>

      <div className="select__scroll" ref={scrollRef}>
        <div className="lvlmap" style={{ width: MAP_W, height: mapHeight }}>
          <svg className="lvlmap__path" viewBox={`0 0 ${MAP_W} ${mapHeight}`} preserveAspectRatio="none">
            <path
              d={pathD}
              fill="none"
              stroke="var(--primary-soft)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray="2 16"
            />
          </svg>

          {Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).map((n) => {
            const stars = levelStars[n] ?? 0;
            const isLocked = n > maxLevel;
            const isCurrent = n === maxLevel;
            const showStars = stars > 0 || n < maxLevel;
            const cls = isLocked
              ? 'lvlnode lvlnode--locked'
              : isCurrent
                ? 'lvlnode lvlnode--current'
                : 'lvlnode lvlnode--done';
            return (
              <button
                key={n}
                className={cls}
                style={{ left: nodeX(n), top: nodeY(n) }}
                disabled={isLocked}
                aria-label={isLocked ? `Level ${n}, locked` : `Play level ${n}`}
                onClick={() => {
                  if (isLocked) return;
                  sfx.tap();
                  onPick(n);
                }}
              >
                {isLocked ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="10" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 10V8a4 4 0 018 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  n
                )}
                {showStars && (
                  <span className="lvlnode__stars">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={i < stars ? 'on' : 'off'}>
                        ★
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
