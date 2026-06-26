import { motion } from 'framer-motion';
import { radialPositions } from '../engine/letterPalette';

const WORD = ['W', 'O', 'R', 'D', 'S'];
const R = 72;
const CENTER = 100;

export default function Orbit() {
  const pts = radialPositions(WORD.length, R).map((p) => ({ x: CENTER + p.x, y: CENTER + p.y }));
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="orbit">
      <svg className="orbit__line" viewBox="0 0 200 200">
        <motion.polyline
          points={line}
          fill="none"
          stroke="var(--primary)"
          strokeOpacity={0.35}
          strokeWidth={8}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />
      </svg>
      {WORD.map((ch, i) => (
        <motion.div
          key={ch + i}
          className="orbit__node"
          style={{ left: pts[i].x, top: pts[i].y }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            y: [0, -5, 0],
          }}
          transition={{
            scale: { delay: i * 0.09, type: 'spring', stiffness: 380, damping: 16 },
            opacity: { delay: i * 0.09 },
            y: { delay: 0.6 + i * 0.12, duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          {ch}
        </motion.div>
      ))}
    </div>
  );
}
