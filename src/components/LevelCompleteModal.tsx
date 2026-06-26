import { motion } from 'framer-motion';

interface Props {
  stars: number;
  coins: number;
  bonusFound: number;
  isLastLevel: boolean;
  onNext: () => void;
  onMenu: () => void;
}

export default function LevelCompleteModal({
  stars,
  coins,
  bonusFound,
  isLastLevel,
  onNext,
  onMenu,
}: Props) {
  return (
    <div className="overlay">
      <motion.div
        className="modal"
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      >
        <div className="stars">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={`star${i < stars ? '' : ' star--off'}`}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15 + i * 0.15, type: 'spring', stiffness: 400, damping: 14 }}
            >
              ⭐
            </motion.span>
          ))}
        </div>

        <h2 className="modal__title">Well done!</h2>
        <p className="modal__sub">You found every word.</p>

        <div className="reward">
          <span className="coin-dot" />+{coins}
        </div>
        <p className="modal__line">
          {bonusFound > 0
            ? `Plus ${bonusFound} bonus word${bonusFound === 1 ? '' : 's'} discovered ✨`
            : 'Tip: extra words you find earn bonus coins!'}
        </p>

        <div className="modal__actions">
          {isLastLevel ? (
            <button className="btn btn--primary btn--lg btn--block" onClick={onMenu}>
              You finished every level! 🎉
            </button>
          ) : (
            <button className="btn btn--primary btn--lg btn--block" onClick={onNext}>
              Next Level
            </button>
          )}
          <button className="btn btn--ghost btn--block" onClick={onMenu}>
            Level Map
          </button>
        </div>
      </motion.div>
    </div>
  );
}
