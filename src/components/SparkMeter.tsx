import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { SPARK_MAX_STAGE, STAGE_THRESHOLDS, sparkStageFromCount } from '../lib/gamification';

/**
 * The chat's spark meter: a flat track that fills as the conversation grows, with a
 * tick at each of the five reveal thresholds. Rose belongs to the spark itself.
 */
export function SparkMeter({ count, className = '' }: { count: number; className?: string }) {
  const { stage, messagesToNext } = sparkStageFromCount(count);
  const goal = STAGE_THRESHOLDS[SPARK_MAX_STAGE - 1];
  const pct = Math.min(100, (count / goal) * 100);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Flame
        size={13}
        className={stage > 0 ? 'shrink-0 text-rose-brand' : 'shrink-0 text-ink-faint'}
        strokeWidth={2}
      />

      <div className="relative h-[3px] flex-1 bg-white/[0.12]">
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-y-0 left-0 bg-teal-brand"
        />
        {STAGE_THRESHOLDS.map((t) => (
          <span
            key={t}
            className="absolute top-1/2 h-[7px] w-px -translate-y-1/2"
            style={{
              left: `${(t / goal) * 100}%`,
              background: count >= t ? 'rgba(234,244,246,0.85)' : 'rgba(234,244,246,0.24)',
            }}
          />
        ))}
      </div>

      <span className="label w-14 shrink-0 text-right">
        {stage >= SPARK_MAX_STAGE ? (
          <span className="text-teal-deep">unlocked</span>
        ) : stage === 0 ? (
          `${messagesToNext} msgs`
        ) : (
          `stage ${stage}/5`
        )}
      </span>
    </div>
  );
}
