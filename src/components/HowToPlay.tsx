import { motion } from 'framer-motion';

// a small looping demo of connecting three letters into a word
const DEMO = [
  { ch: 'C', x: 45 },
  { ch: 'A', x: 120, },
  { ch: 'T', x: 195 },
];
const CY = 50;

export default function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay">
      <motion.div
        className="modal"
        initial={{ scale: 0.88, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      >
        <h2 className="modal__title">How to Play</h2>

        <div style={{ width: 240, height: 100, margin: '6px auto 14px', position: 'relative' }}>
          <svg viewBox="0 0 240 100" style={{ position: 'absolute', inset: 0 }}>
            <polyline
              points={DEMO.map((d) => `${d.x},${CY}`).join(' ')}
              fill="none"
              stroke="var(--primary-soft)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <motion.polyline
              points={DEMO.map((d) => `${d.x},${CY}`).join(' ')}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 1, 0] }}
              transition={{ duration: 2.6, times: [0, 0.55, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
          {DEMO.map((d, i) => (
            <motion.div
              key={d.ch}
              style={{
                position: 'absolute',
                left: d.x - 22,
                top: CY - 22,
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 20,
                color: 'var(--primary-deep)',
                background: 'linear-gradient(180deg,#fff,#f3eeff)',
                boxShadow: 'var(--shadow-sm)',
              }}
              animate={{ scale: [1, 1.16, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2.1, delay: 0.2 + i * 0.55 }}
            >
              {d.ch}
            </motion.div>
          ))}
        </div>

        <div className="settings" style={{ gap: 10 }}>
          <div className="settings__row">✏️ Swipe across letters to spell a word</div>
          <div className="settings__row">🧩 Fill every slot to finish the level</div>
          <div className="settings__row">✨ Find extra words for bonus coins</div>
        </div>

        <button className="btn btn--primary btn--lg btn--block" onClick={onClose}>
          Let’s play!
        </button>
      </motion.div>
    </div>
  );
}
