export const COLLEGE_DOMAIN = 'snuchennai.edu.in';
export const COLLEGE_NAME = 'SNU Chennai';
export const APP_NAME = 'Yuujin Circle';

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Civil Engineering',
  'Biotechnology',
  'BBA',
  'B.Com',
  'Economics',
  'Psychology',
  'Law (B.A. LL.B.)',
  'Law (B.Com. LL.B.)',
  'Law (B.C.A. LL.B.)',
  'Commerce',
  'Management',
  'Media & Communication',
  'Design',
  'Liberal Arts',
  'Other',
] as const;

export const YEARS = [1, 2, 3, 4, 5] as const;

export const LOOKING_FOR_OPTIONS = [
  { value: 'dating', label: 'Dating', icon: 'HeartCrack', blurb: 'Open to romance' },
  { value: 'friendship', label: 'Friendship', icon: 'Handshake', blurb: 'Just campus friends' },
  { value: 'both', label: 'Both', icon: 'Sparkles', blurb: 'See where it goes' },
] as const;

export const INTEREST_TAGS = [
  'Cricket', 'Football', 'Basketball', 'Badminton', 'Gym & Fitness', 'Yoga',
  'Music', 'Singing', 'Dance', 'Guitar', 'Photography', 'Art & Design',
  'Movies', 'Anime', 'Gaming', 'Reading', 'Writing', 'Poetry',
  'Travel', 'Foodie', 'Cooking', 'Coffee', 'Startups', 'Coding',
  'Debate', 'MUN', 'Dramatics', 'Festivals', 'Road trips', 'Pets',
] as const;

/** Icebreaker prompts — pick up to 3, write a short answer to each. */
export const PROMPT_QUESTIONS = [
  'My 8am self vs my 8pm self…',
  'The way to win me over is…',
  'Best spot on campus is…',
  'I will judge you if you…',
  'My most controversial food opinion…',
  'The one song stuck in my head lately…',
  'Ideal Sunday looks like…',
  'Ask me about…',
  'Green flags I look for…',
  'After exams you will find me…',
] as const;

export const MAX_PROMPTS = 3;
export const PROMPT_MAX_LEN = 120;

export const ONLINE_WINDOW_MS = 2 * 60 * 1000; // "online" = heartbeat within 2 minutes
export const HEARTBEAT_MS = 45 * 1000;

export const REPORT_REASONS = [
  'Inappropriate photos',
  'Harassment or bullying',
  'Spam or scam',
  'Fake profile',
  'Not a SNUC student',
  'Something else',
] as const;
