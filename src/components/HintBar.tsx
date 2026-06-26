import { REVEAL_WORD_COST } from '../engine/levels';

interface Props {
  revealLetterCost: number;
  onRevealLetter: () => void;
  onShuffle: () => void;
  onRevealWord: () => void;
  disabled?: boolean;
  pulseHint?: boolean;
}

interface BtnProps {
  label: string;
  cost?: number;
  free?: boolean;
  onClick: () => void;
  disabled?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

function HintButton({ label, cost, free, onClick, disabled, pulse, children }: BtnProps) {
  return (
    <div className="hint">
      <button
        className={`hint__btn${pulse ? ' hint__pulse' : ''}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {children}
      </button>
      {free ? (
        <span className="hint__cost hint__cost--free">FREE</span>
      ) : (
        <span className="hint__cost">
          <span className="coin-dot" />
          {cost}
        </span>
      )}
    </div>
  );
}

export default function HintBar({
  revealLetterCost,
  onRevealLetter,
  onShuffle,
  onRevealWord,
  disabled,
  pulseHint,
}: Props) {
  return (
    <div className="hintbar">
      <HintButton
        label="Reveal a letter"
        cost={revealLetterCost}
        onClick={onRevealLetter}
        disabled={disabled}
        pulse={pulseHint}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 18h6m-5 3h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0012 2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </HintButton>

      <HintButton label="Shuffle letters" free onClick={onShuffle} disabled={disabled}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M16 4l3 3-3 3M3 7h4.5c1.5 0 2.8.8 3.6 2M16 20l3-3-3-3M3 17h4.5c1.5 0 2.8-.8 3.6-2M19 7h-2.5M19 17h-2.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </HintButton>

      <HintButton
        label="Reveal a whole word"
        cost={REVEAL_WORD_COST}
        onClick={onRevealWord}
        disabled={disabled}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3l2.1 4.5L19 8.2l-3.5 3.4.9 4.9L12 14.3 7.6 16.5l.9-4.9L5 8.2l4.9-.7L12 3z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </HintButton>
    </div>
  );
}
