import { useGameStore } from '../state/gameStore';
import { LEVEL_COUNT } from '../engine/levels';

interface Props {
  onBack: () => void;
}

function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div
      className="settings__row"
      style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '14px 16px' }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 26,
          color: accent ? 'var(--accent-deep)' : 'var(--primary-deep)',
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</span>
    </div>
  );
}

export default function StatsScreen({ onBack }: Props) {
  const coins = useGameStore((s) => s.coins);
  const maxLevel = useGameStore((s) => s.maxLevel);
  const levelStars = useGameStore((s) => s.levelStars);
  const dailyStreak = useGameStore((s) => s.dailyStreak);
  const dailyResults = useGameStore((s) => s.dailyResults);

  const completed = Object.keys(levelStars).length;
  const starsValues = Object.values(levelStars);
  const totalStars = starsValues.reduce((a, b) => a + b, 0);
  const perfect = starsValues.filter((s) => s === 3).length;
  const dailiesDone = Object.keys(dailyResults).length;
  const pct = Math.round((completed / LEVEL_COUNT) * 100);

  return (
    <div className="select">
      <div className="hud">
        <button className="icon-btn" onClick={onBack} aria-label="Back to menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="select__title">Your Stats</span>
        <span className="chip">
          <span className="coin-dot" />
          {coins}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 30px' }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 700 }}>Journey progress</span>
            <span className="muted" style={{ fontWeight: 700 }}>
              {completed}/{LEVEL_COUNT}
            </span>
          </div>
          <div
            style={{
              height: 14,
              borderRadius: 999,
              background: 'var(--surface-2)',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 3px rgba(91,63,214,.15)',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg,#8c74ff,var(--primary))',
                transition: 'width .5s ease',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatCard value={completed} label="Levels completed" />
          <StatCard value={`${totalStars} ⭐`} label="Stars earned" accent />
          <StatCard value={perfect} label="3-star levels" />
          <StatCard value={maxLevel} label="Furthest level" />
          <StatCard value={`${dailyStreak} 🔥`} label="Daily streak" accent />
          <StatCard value={dailiesDone} label="Dailies solved" />
        </div>

        {completed === 0 && (
          <p className="muted center" style={{ marginTop: 22 }}>
            Play a level to start building your stats!
          </p>
        )}
      </div>
    </div>
  );
}
