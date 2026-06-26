import { AnimatePresence, motion } from 'framer-motion';

export interface ToastData {
  id: number;
  text: string;
  kind: 'main' | 'bonus' | 'info' | 'bad';
}

export default function Toast({ toast }: { toast: ToastData | null }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className={`toast toast--${toast.kind}`}
          initial={{ opacity: 0, y: 14, scale: 0.8 }}
          animate={{ opacity: 1, y: -14, scale: 1 }}
          exit={{ opacity: 0, y: -34, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 460, damping: 26 }}
        >
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
