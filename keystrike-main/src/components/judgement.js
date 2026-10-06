// Points awarded for each judgement
export const POINTS = { great: 300, ok: 100, meh: 50, miss: 0 };

// Hit windows in SECONDS, measured either side of the exact beat.
// Harder difficulty = tighter windows. Anything outside "meh" isn't a hit.
export const JUDGE_WINDOWS = {
  easy:   { great: 0.12, ok: 0.22, meh: 0.32 },
  normal: { great: 0.09, ok: 0.17, meh: 0.26 },
  hard:   { great: 0.06, ok: 0.12, meh: 0.20 },
};

// diffSec = how far (in seconds) the press was from the exact beat
// returns 'great' | 'ok' | 'meh' | null (null = too far off to count)
export function judge(diffSec, level) {
  const w = JUDGE_WINDOWS[level];
  const d = Math.abs(diffSec);
  if (d <= w.great) return 'great';
  if (d <= w.ok) return 'ok';
  if (d <= w.meh) return 'meh';
  return null;
}

// osu!-style accuracy: points earned / points if every note was a great
export function calcAccuracy({ great, ok, meh, miss }) {
  const total = great + ok + meh + miss;
  if (!total) return 0;
  const earned = great * POINTS.great + ok * POINTS.ok + meh * POINTS.meh;
  return (earned / (total * POINTS.great)) * 100;
}

export function calcGrade(accuracy) {
  if (accuracy >= 100) return 'SS';
  if (accuracy >= 95) return 'S';
  if (accuracy >= 90) return 'A';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 70) return 'C';
  return 'D';
}
