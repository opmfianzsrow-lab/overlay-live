export type MembershipType = 'REGULAR' | 'VIP' | 'VVIP';
export type PlayerStatus = 'QUEUED' | 'PLAYING' | 'DONE' | 'SKIPPED' | 'CANCELLED';
export type DonationStatus = 'UNCLAIMED' | 'CLAIMED' | 'REFUNDED';

export interface Player {
  id: string;
  name: string;
  game_id: string;
  membership: MembershipType;
  status: PlayerStatus;
  created_at: string;
  updated_at: string;
}

export interface QueueItem {
  id: string;
  player_id: string;
  position: number;
  status: PlayerStatus;
  joined_at: string;
  player: Player;
  donation?: Donation;
}

export interface Donation {
  id: string;
  external_donation_id: string;
  donor_name: string;
  amount: number;
  message: string;
  status: DonationStatus;
  claimed_by_player_id?: string;
  claimed_at?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface OverlayToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  revoked_at?: string;
}

export interface OverlaySettings {
  id: string;
  user_id?: string;
  streamer_token: string;
  webhook_key?: string;
  webhook_secret?: string;
  title: string;
  theme: 'obsidian' | 'cyber' | 'crimson' | 'imperial' | 'purple' | 'minimal';
  font_size: 'small' | 'medium' | 'large';
  max_visible_players: number;
  animation: 'smooth' | 'bounce' | 'glow' | 'minimal';
  opacity: number; // 0 to 100
  card_size: 'compact' | 'normal' | 'spacious';
  spacing: number;
  sociabuzz_url: string;
  min_donation: number;
  vip_min_donation: number;
  vvip_min_donation: number;
  max_queue_limit: number;
  sound_alert: boolean;
  allow_free_queue: boolean;
  live_badge_text: string;
  hide_playing_in_overlay?: boolean;
  dashboard_ui_theme?: 'neobrutalism' | 'dark';
  
  // Custom appearance options
  panel_width?: number; // default 440
  show_id?: boolean;
  show_vip_badge?: boolean;
  show_live_badge?: boolean;
  border_radius?: number;
  enable_animation?: boolean;
  animation_speed?: 'slow' | 'normal' | 'fast';
  custom_bg_color?: string;
  custom_text_color?: string;
  custom_accent_color?: string;

  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  user_id?: string;
  provider: 'sociabuzz';
  external_event_id: string;
  payload: Record<string, unknown>;
  processed: boolean;
  error?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  text: string;
  type: 'join' | 'play' | 'done' | 'skip' | 'donation' | 'reorder' | 'edit';
  timestamp: string;
}

export interface QueueStats {
  total_queued: number;
  currently_playing: QueueItem | null;
  done_today: number;
  total_donations_today: number;
  next_player: QueueItem | null;
}

