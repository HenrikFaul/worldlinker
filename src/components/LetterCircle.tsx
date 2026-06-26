import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { computeLayout, tileAtPoint } from '../engine/letterPalette';
import { sfx } from '../engine/audio';

export interface Tile {
  id: number;
  char: string;
}

interface Props {
  tiles: Tile[];
  onSubmit: (word: string) => void;
  onSelectionChange?: (word: string) => void;
  disabled?: boolean;
}

const spring = { type: 'spring' as const, stiffness: 520, damping: 34 };

export default function LetterCircle({ tiles, onSubmit, onSelectionChange, disabled }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const selecting = useRef(false);
  const selRef = useRef<number[]>([]);

  // measure the square container responsively
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w) setSize(w);
    });
    ro.observe(el);
    setSize(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => computeLayout(tiles.length, size || 300), [tiles.length, size]);

  // report the in-progress word to the parent (for the preview pill)
  useEffect(() => {
    onSelectionChange?.(selected.map((i) => tiles[i]?.char ?? '').join(''));
  }, [selected, tiles, onSelectionChange]);

  const setSel = (next: number[]) => {
    selRef.current = next;
    setSelected(next);
  };

  const localPoint = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if (disabled) return;
    sfx.unlock();
    const p = localPoint(e);
    const i = tileAtPoint(layout, p.x, p.y);
    if (i < 0) return;
    selecting.current = true;
    setSel([i]);
    setPointer(p);
    try {
      wrapRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort; selection still works without it */
    }
    sfx.select(0);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!selecting.current) return;
    const p = localPoint(e);
    setPointer(p);
    const i = tileAtPoint(layout, p.x, p.y);
    if (i < 0) return;
    const sel = selRef.current;
    const last = sel[sel.length - 1];
    if (i === last) return;
    const pos = sel.indexOf(i);
    if (pos === -1) {
      // a fresh tile → extend the chain
      const next = [...sel, i];
      setSel(next);
      sfx.select(next.length - 1);
    } else if (pos === sel.length - 2) {
      // dragged back onto the previous tile → undo the last link
      setSel(sel.slice(0, -1));
      sfx.select(Math.max(0, sel.length - 2));
    }
    // else: an already-linked tile that isn't the previous one → ignore
  };

  const finish = (submit: boolean) => {
    if (!selecting.current) return;
    selecting.current = false;
    const word = selRef.current.map((i) => tiles[i].char).join('');
    setSel([]);
    setPointer(null);
    if (submit && word.length > 0) onSubmit(word);
  };

  const centers = selected.map((i) => layout.positions[i]).filter(Boolean);
  const linePoints = centers.map((c) => `${c.x},${c.y}`).join(' ');
  const lastCenter = centers[centers.length - 1];
  const strokeW = Math.max(6, layout.tile * 0.16);

  return (
    <div
      ref={wrapRef}
      className="circle-wrap"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => finish(true)}
      onPointerCancel={() => finish(false)}
      style={{ opacity: disabled ? 0.7 : 1 }}
    >
      <div className="circle-disc" />

      <svg className="circle-svg" viewBox={`0 0 ${layout.size} ${layout.size}`}>
        {centers.length > 0 && (
          <>
            {linePoints && centers.length > 1 && (
              <polyline
                points={linePoints}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity={0.85}
                strokeWidth={strokeW}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {selecting.current && pointer && lastCenter && (
              <line
                x1={lastCenter.x}
                y1={lastCenter.y}
                x2={pointer.x}
                y2={pointer.y}
                stroke="var(--primary)"
                strokeOpacity={0.55}
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
            )}
            {centers.map((c, idx) => (
              <circle key={idx} cx={c.x} cy={c.y} r={strokeW * 0.7} fill="var(--primary)" />
            ))}
          </>
        )}
      </svg>

      {tiles.map((t, i) => {
        const pos = layout.positions[i];
        const active = selected.includes(i);
        return (
          <motion.div
            key={t.id}
            className={`tile${active ? ' tile--active' : ''}`}
            style={{ width: layout.tile, height: layout.tile, fontSize: layout.tile * 0.42 }}
            initial={false}
            animate={{
              x: (pos?.x ?? layout.center) - layout.tile / 2,
              y: (pos?.y ?? layout.center) - layout.tile / 2,
              scale: active ? 1.12 : 1,
            }}
            transition={spring}
          >
            {t.char}
          </motion.div>
        );
      })}
    </div>
  );
}
