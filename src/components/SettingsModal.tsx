import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { sfx } from '../engine/audio';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const soundOn = useGameStore((s) => s.soundOn);
  const setSound = useGameStore((s) => s.setSound);
  const hardReset = useGameStore((s) => s.hardReset);
  const [confirmReset, setConfirmReset] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    setSound(next);
    sfx.setMuted(!next);
    if (next) sfx.tap();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      >
        <h2 className="modal__title">Settings</h2>
        <div className="settings">
          <div className="settings__row">
            <span>Sound</span>
            <button
              className={`toggle${soundOn ? ' toggle--on' : ''}`}
              onClick={toggleSound}
              aria-label="Toggle sound"
              aria-pressed={soundOn}
            >
              <span className="toggle__knob" />
            </button>
          </div>
          <div className="settings__row">
            <span>Reset progress</span>
            {confirmReset ? (
              <button
                className="btn"
                style={{ padding: '8px 16px', fontSize: 14, color: 'var(--danger)' }}
                onClick={() => {
                  hardReset();
                  setConfirmReset(false);
                  onClose();
                }}
              >
                Confirm?
              </button>
            ) : (
              <button
                className="btn btn--ghost"
                style={{ padding: '8px 16px', fontSize: 14 }}
                onClick={() => setConfirmReset(true)}
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <p className="modal__line">Word Linker · Connect Letters. Find Words.</p>
        <button className="btn btn--primary btn--block" onClick={onClose}>
          Done
        </button>
      </motion.div>
    </div>
  );
}
