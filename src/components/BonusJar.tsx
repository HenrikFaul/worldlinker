import { BONUS_JAR_SIZE } from '../engine/levels';

export default function BonusJar({ count }: { count: number }) {
  const pct = Math.min(100, (count / BONUS_JAR_SIZE) * 100);
  return (
    <div className="jar" title="Find bonus words to fill the jar for extra coins">
      <div className="jar__glass">
        <div className="jar__fill" style={{ height: `${pct}%` }} />
      </div>
      <span>
        {count}/{BONUS_JAR_SIZE}
      </span>
    </div>
  );
}
