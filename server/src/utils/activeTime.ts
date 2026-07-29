/**
 * Gaps longer than this are treated as the session sitting idle rather than
 * active work — a session left open overnight otherwise reports its full
 * wall-clock span as duration.
 */
const IDLE_GAP_MS = 5 * 60_000;

/**
 * Minutes spent actually working, summing only the gaps between consecutive
 * events that are short enough to be one continuous stretch of work.
 *
 * Shared across providers so "active time" means the same thing for every
 * coding agent — a per-provider threshold would make the comparison meaningless.
 */
export function computeActiveMinutes(timestamps: number[]): number {
  const times = timestamps
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  let activeMs = 0;
  for (let i = 1; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    if (gap > 0 && gap <= IDLE_GAP_MS) activeMs += gap;
  }
  return Math.round(activeMs / 60_000);
}
