import { motion } from 'framer-motion';

interface Props {
  words: string[];
  found: Set<string>;
  revealed: Record<string, number[]>;
}

const pop = { type: 'spring' as const, stiffness: 600, damping: 22 };

export default function WordGrid({ words, found, revealed }: Props) {
  return (
    <div className="wordgrid">
      {words.map((word) => {
        const isFound = found.has(word);
        const rev = revealed[word] ?? [];
        return (
          <div className="wordrow" key={word}>
            {[...word].map((ch, i) => {
              const showRevealed = !isFound && rev.includes(i);
              const show = isFound || showRevealed;
              const cls = isFound
                ? 'cell cell--filled'
                : showRevealed
                  ? 'cell cell--revealed'
                  : 'cell';
              return (
                <motion.div
                  // remounting when `show` flips replays the pop animation
                  key={`${i}-${show ? 'on' : 'off'}`}
                  className={cls}
                  initial={show ? { scale: 0.55, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={pop}
                >
                  {show ? ch : ''}
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
