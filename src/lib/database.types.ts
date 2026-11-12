import type { CartoonConfig } from './cartoon';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type LookingFor = 'dating' | 'friendship' | 'both';

/** Shape of profiles.avatar — the cartoon avatar (Bitmoji-style character). */
export type ProfileAvatar = {
  v: 3;
  config: CartoonConfig;
  updated: string;
};

/** One answered icebreaker prompt: pick a question, write a short answer. */
export type PromptAnswer = {
  question: string;
  answer: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  age: number | null;
  department: string;
  year: number | null;
  bio: string;
  interests: string[];
  looking_for: LookingFor | null;
  photos: string[];
  avatar: ProfileAvatar | null;
  prompts: PromptAnswer[];
  last_seen: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
  /** Spark Season gamification — server-side only, clients can't write these. */
  xp: number;
  streak_count: number;
  last_qotd_date: string | null;
  energy: number;
  energy_ts: string;
};

/** One saved Question of the Day answer (one per user per day). */
export type QotdAnswer = {
  user_id: string;
  day: string;
  answer: string;
  created_at: string;
};

/** The private end-of-chat pick: 'match' | 'pass'. */
export type MatchChoice = {
  match_id: string;
  user_id: string;
  choice: 'match' | 'pass';
  created_at: string;
};

export type FriendRequest = {
  match_id: string;
  user_id: string;
  created_at: string;
};

export type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export type Report = {
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string;
  created_at: string;
};

export type Block = {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type UnreadCount = {
  match_id: string;
  unread: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Relationships: [];
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          age?: number | null;
          department?: string;
          year?: number | null;
          bio?: string;
          interests?: string[];
          looking_for?: LookingFor | null;
          photos?: string[];
          avatar?: ProfileAvatar | null;
          prompts?: PromptAnswer[];
          last_seen?: string | null;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          age?: number | null;
          department?: string;
          year?: number | null;
          bio?: string;
          interests?: string[];
          looking_for?: LookingFor | null;
          photos?: string[];
          avatar?: ProfileAvatar | null;
          prompts?: PromptAnswer[];
          last_seen?: string | null;
          onboarding_complete?: boolean;
          updated_at?: string;
        };
      };
      friend_requests: {
        Relationships: [];
        Row: FriendRequest;
        Insert: { match_id: string; user_id: string; created_at?: string };
        Update: { created_at?: string };
      };
      qotd_answers: {
        Relationships: [];
        Row: QotdAnswer;
        Insert: { user_id: string; day?: string; answer: string; created_at?: string };
        Update: { answer?: string; created_at?: string };
      };
      match_choices: {
        Relationships: [];
        Row: MatchChoice;
        Insert: { match_id: string; user_id: string; choice: 'match' | 'pass'; created_at?: string };
        Update: { created_at?: string };
      };
      matches: {
        Relationships: [];
        Row: Match;
        Insert: { id?: string; user1_id: string; user2_id: string; created_at?: string };
        Update: { created_at?: string };
      };
      messages: {
        Relationships: [];
        Row: Message;
        Insert: {
          id?: string;
          match_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: { content?: string; created_at?: string; read_at?: string | null };
      };
      reports: {
        Relationships: [];
        Row: Report;
        Insert: {
          reporter_id: string;
          reported_id: string;
          reason: string;
          details?: string;
          created_at?: string;
        };
        Update: { details?: string };
      };
      blocks: {
        Relationships: [];
        Row: Block;
        Insert: { blocker_id: string; blocked_id: string; created_at?: string };
        Update: { created_at?: string };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      pair_me_randomly: { Args: { allow_any?: boolean }; Returns: string | null };
      my_blocks: {
        Args: Record<string, never>;
        Returns: { blocker_id: string; blocked_id: string }[];
      };
      leave_pairing_queue: { Args: Record<string, never>; Returns: undefined };
      toggle_friend_interest: { Args: { p_match_id: string }; Returns: string };
      refresh_sparks: { Args: Record<string, never>; Returns: number };
      submit_match_choice: {
        Args: { p_match_id: string; p_choice: 'match' | 'pass' };
        Returns: string;
      };
      mark_messages_read: { Args: { p_match_id: string }; Returns: undefined };
      unread_counts: { Args: Record<string, never>; Returns: UnreadCount[] };
      unmatch: { Args: { p_match_id: string }; Returns: boolean };
    };
    Enums: {
      looking_for: LookingFor;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
