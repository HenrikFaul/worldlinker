import { useEffect, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { dateKeyOf, friendlyDate, getDailyInfo, type DailyInfo } from '../engine/daily';
import { buildDailyShare, shareText } from '../lib/share';
import { sfx } from '../engine/audio';
import Toast, { type ToastData } from '../components/Toast';

interface Props {
  onPlay: (info: DailyInfo) => void;
  onBack: () => void;
}

export default function DailyScreen({ onPlay, onBack }: Props) {
  const coins = useGameStore((s) => s.coins);
  const dailyStreak = useGameStore((s) => s.dailyStreak);
  const dailyResults = useGameStore((s) => s.dailyResults);

  const today = new Date();
  const todayKey = dateKeyOf(today);
  const result = dailyResults[todayKey];

  const [info, setInfo] = useState<DailyInfo | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    let alive = true;
    getDailyInfo(new Date())
      .then((i) => alive && setInfo(i))
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const flash = (text: string, kind: ToastData['kind']) => {
    setToast({ id: Date.now(), text, kind });
    window.setTimeout(() => setToast(null), 1600);
  };

  const shareStored = async () => {
    if (!result) return;
    const text = buildDailyShare(todayKey, result.stars, result.total + result.bonus, result.total);
    const outcome = await shareText(text);
    if (outcome === 'copied') flash('Copied to clipboard!', 'bonus');
    else if (outcome === 'failed') flash('Could not share', 'bad');
  };

  return (
    <div className="select">
      <div className="hud">
        <button className="icon-btn" onClick={onBack} aria-label="Back to menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="select__title">Daily Word</span>
        <span className="chip">
          <span className="coin-dot" />
          {coins}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '24px 26px 40px',
          textAlign: 'center',
        }}
      >
        <p className="play__theme" style={{ fontSize: 14 }}>
          {friendlyDate(today)}
        </p>
        {dailyStreak > 0 && <span className="chip">🔥 {dailyStreak}-day streak</span>}

        {result ? (
          <>
            <div className="stars" style={{ margin: '6px 0' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`star${i < result.stars ? '' : ' star--off'}`}>
                  ⭐
                </span>
              ))}
            </div>
            <div className="reward">
              {result.total}/{result.total} words
            </div>
            <p className="modal__line">
              {result.bonus > 0
                ? `Plus ${result.bonus} bonus word${result.bonus === 1 ? '' : 's'} ✨`
                : 'Nicely done!'}
              <br />
              Come back tomorrow for a new puzzle ☕
            </p>
            <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 11 }}>
              <button className="btn btn--primary btn--lg btn--block" onClick={shareStored}>
                Share result
              </button>
              <button className="btn btn--ghost btn--block" onClick={onBack}>
                Menu
              </button>
            </div>
          </>
        ) : loadFailed ? (
          <p className="muted">Couldn’t load today’s puzzle. Please try again.</p>
        ) : (
          <>
            <h2 className="modal__title" style={{ marginTop: 6 }}>
              Today’s Puzzle
            </h2>
            <p className="muted" style={{ maxWidth: 280 }}>
              Everyone gets the same letters today. Find every word to keep your streak!
            </p>
            <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 11, marginTop: 8 }}>
              <button
                className="btn btn--primary btn--lg btn--block"
                disabled={!info}
                onClick={() => {
                  if (!info) return;
                  sfx.unlock();
                  sfx.tap();
                  onPlay(info);
                }}
              >
                {info ? 'Play' : 'Loading…'}
              </button>
              <button className="btn btn--ghost btn--block" onClick={onBack}>
                Menu
              </button>
            </div>
          </>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}
