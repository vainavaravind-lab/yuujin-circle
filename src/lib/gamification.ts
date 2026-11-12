// Spark Season — client-side gamification helpers.
// Mirrors supabase/patch-2026-10-06-spark-season.sql (keep the two in sync:
// STAGE_THRESHOLDS[4] must equal the 38-message check in submit_match_choice).

/** Messages (from both people) needed to light each spark stage. */
export const STAGE_THRESHOLDS = [3, 8, 16, 26, 38] as const;
export const SPARK_MAX_STAGE = 5;

/** What each newly-lit stage reveals about the mystery classmate. */
export const STAGE_REWARDS = [
  'Interest tags revealed',
  'One written answer revealed',
  'Name revealed',
  'Course and year revealed',
  'Match or Pass unlocked',
] as const;

export type SparkStageInfo = {
  /** 0 (fresh pair) … 5 (fully lit). */
  stage: number;
  /** Message count that lights the next stage, or null when maxed. */
  nextAt: number | null;
  /** Messages left until the next stage (0 when maxed). */
  messagesToNext: number;
};

export function sparkStageFromCount(count: number): SparkStageInfo {
  let stage = 0;
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (count >= STAGE_THRESHOLDS[i]) stage = i + 1;
  }
  const nextAt = stage < SPARK_MAX_STAGE ? STAGE_THRESHOLDS[stage] : null;
  return { stage, nextAt, messagesToNext: nextAt ? Math.max(0, nextAt - count) : 0 };
}

/* ---------------- leagues ---------------- */

export type League = { name: string; min: number; icon: string };

export const LEAGUES: League[] = [
  { name: 'Bronze', min: 0, icon: '🥉' },
  { name: 'Silver', min: 150, icon: '🥈' },
  { name: 'Gold', min: 400, icon: '🥇' },
  { name: 'Platinum', min: 800, icon: '💎' },
  { name: 'Diamond', min: 1500, icon: '👑' },
];

export function leagueFromXp(xp: number): League {
  let l = LEAGUES[0];
  for (const cand of LEAGUES) if (xp >= cand.min) l = cand;
  return l;
}

export function nextLeagueFromXp(xp: number): League | null {
  return LEAGUES.find((l) => l.min > xp) ?? null;
}

/** 0..1 progress from the current league's floor toward the next one. */
export function leagueProgress(xp: number): number {
  const cur = leagueFromXp(xp);
  const next = nextLeagueFromXp(xp);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (xp - cur.min) / (next.min - cur.min)));
}

/* ---------------- sparks (energy) ---------------- */

export const SPARK_MAX = 5;
/** One spark recharges every 20 minutes (server: interval '20 minutes'). */
export const SPARK_REGEN_MINUTES = 20;

/** Current sparks after server-side-style regen (display only). */
export function regenSparks(energy: number, energyTs: string, now = Date.now()): number {
  const elapsedMin = Math.max(0, (now - new Date(energyTs).getTime()) / 60000);
  return Math.min(SPARK_MAX, Math.max(0, energy) + Math.floor(elapsedMin / SPARK_REGEN_MINUTES));
}

/** ms until the next spark recharges, or null when full. */
export function msToNextSpark(energy: number, energyTs: string, now = Date.now()): number | null {
  if (energy >= SPARK_MAX) return null;
  const period = SPARK_REGEN_MINUTES * 60_000;
  const elapsed = Math.max(0, now - new Date(energyTs).getTime());
  return Math.max(0, period - (elapsed % period));
}

export function fmtCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ---------------- Question of the Day ---------------- */

/** Rotates once per day — everyone at SNUC gets the same question. */
export const QOTD_QUESTIONS = [
  'What is your go-to late-night snack?',
  'Coffee, chai, or chaos?',
  'What song is stuck in your head right now?',
  'One thing you would tell your first-year self?',
  'Beach day or mountain trek?',
  'What is the last thing that made you laugh out loud?',
  'Your most irrational campus fear?',
  'Best spot on campus to pretend to study?',
  'What superpower would be wasted on you?',
  'Describe your week in three emojis.',
  'What is a small thing that instantly makes your day?',
  'Dogs, cats, or the campus monkeys?',
  'What show are you currently binging?',
  'The food you could eat every single day?',
  'What did you want to be when you were seven?',
  'Your worst haircut era — describe it.',
  'Morning person or nocturnal gremlin?',
  'What hobby would you pick up if time were free?',
  'The most underrated app on your phone?',
  'Rainy day soundtrack — one song.',
  'What is your weirdest talent?',
  'If you could teleport anywhere after class, where?',
  'A movie everyone loves but you do not get?',
  'What is your comfort dish from home?',
  'One rule you would add to SNUC?',
  'What mini goal are you chasing this month?',
  'Texting style: paragraphs or one-word replies?',
  'The meme format that always gets you?',
  'What would your walk-out song be?',
  'Sweet, spicy, or savory winner-takes-all?',
  'What is something you learned this week?',
  'Your favorite quote that lives rent-free?',
  'If today had a weather forecast for your mood?',
  'The best compliment you have ever received?',
  'What are you weirdly competitive about?',
  'A place in Chennai everyone should visit once?',
  'What do you do when wifi dies at 2 AM?',
  'Your guiltiest pleasure food combo?',
  'One app feature you wish existed here?',
  'What made you smile today?',
] as const;

function dayIndex(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

/** The whole campus answers this one today. */
export function qotdForDate(d = new Date()): string {
  const list = QOTD_QUESTIONS;
  return list[((dayIndex(d) % list.length) + list.length) % list.length];
}

/** ISO date (YYYY-MM-DD) in local time — matches the SQL `day` column. */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local-midnight ISO timestamp used to scope "today" queries. */
export function startOfTodayISO(d = new Date()): string {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t.toISOString();
}

/* ---------------- icebreakers ---------------- */

/** Rotating openers offered when a fresh pairing chat is empty. */
export const ICEBREAKERS = [
  'Okay — triangles, circles, or squares? 👾',
  'Settle a debate: is a hot dog a sandwich?',
  'What is the most useless talent you have? 😄',
  'Quick — one song that describes today 🎵',
  'If our chat had a group name, what would it be?',
  'Pineapple on pizza: yes or absolutely yes? 🍍',
] as const;

export function icebreakersForDate(d = new Date()): string[] {
  const list = ICEBREAKERS;
  const start = dayIndex(d) % list.length;
  return [list[start], list[(start + 2) % list.length], list[(start + 4) % list.length]] as string[];
}

/* ---------------- daily quests ---------------- */

export type Quest = {
  id: 'qotd' | 'chatter' | 'golive';
  emoji: string;
  title: string;
  hint: string;
  goal: number;
  /** Reward the server grants automatically when it fires. */
  reward: string;
};

export const QUESTS: Quest[] = [
  { id: 'qotd', emoji: '❓', title: 'Answer the Question of the Day', hint: 'Keep that streak alive', goal: 1, reward: '+15 XP · +1 spark' },
  { id: 'chatter', emoji: '💬', title: 'Send 10 messages', hint: 'Any chat counts', goal: 10, reward: '+1 XP each' },
  { id: 'golive', emoji: '⚡', title: 'Go live once', hint: 'Get paired with someone new', goal: 1, reward: '+10 XP' },
];
