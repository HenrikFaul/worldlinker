import { useGameStore } from '../state/gameStore';

interface Props {
  subtitle: string;
  title: string;
  onBack: () => void;
  onSettings: () => void;
}

export default function HudBar({ subtitle, title, onBack, onSettings }: Props) {
  const coins = useGameStore((s) => s.coins);
  return (
    <div className="hud">
      <button className="icon-btn" onClick={onBack} aria-label="Back to menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="hud__title">
        <span className="hud__sub">{subtitle}</span>
        <span className="hud__level">{title}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="chip">
          <span className="coin-dot" />
          {coins}
        </span>
        <button className="icon-btn" onClick={onSettings} aria-label="Settings">
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
    </div>
  );
}
