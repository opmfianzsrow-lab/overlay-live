export type MembershipType = 'REGULAR' | 'VIP' | 'VVIP';
export type PlayerStatus = 'QUEUED' | 'PLAYING' | 'DONE' | 'SKIPPED' | 'CANCELLED';
export type DonationStatus = 'UNCLAIMED' | 'CLAIMED' | 'REFUNDED';
export type UserRole = 'admin' | 'streamer';

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
  auth_user_id?: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  streamer_token?: string;
  created_at: string;
  updated_at?: string;
}

export interface OverlayToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  revoked_at?: string;
}

export interface OverlayCustomColors {
  bg_primary?: string;         // Background utama overlay
  header_bg?: string;          // Background header
  card_bg?: string;            // Background kartu pemain
  card_border?: string;        // Warna border kartu
  text_primary?: string;       // Warna teks utama
  text_secondary?: string;     // Warna teks sekunder
  accent_color?: string;       // Warna aksen / highlight
  queue_number_color?: string; // Warna nomor antrian
  vip_badge_color?: string;    // Warna badge VIP
  vvip_badge_color?: string;   // Warna badge VVIP
  live_indicator_color?: string; // Warna indikator LIVE
}

export const DEFAULT_OVERLAY_COLORS: Required<OverlayCustomColors> = {
  bg_primary: '#0c0c0e',
  header_bg: '#141418',
  card_bg: '#18181d',
  card_border: '#27272a',
  text_primary: '#f4f4f5',
  text_secondary: '#a1a1aa',
  accent_color: '#3b82f6',
  queue_number_color: '#ffffff',
  vip_badge_color: '#a855f7',
  vvip_badge_color: '#eab308',
  live_indicator_color: '#ef4444',
};

export interface ColorPreset {
  id: string;
  name: string;
  colors: Required<OverlayCustomColors>;
}

export const OVERLAY_COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'obsidian_dark',
    name: 'Default Obsidian',
    colors: {
      bg_primary: '#0c0c0e',
      header_bg: '#141418',
      card_bg: '#18181d',
      card_border: '#27272a',
      text_primary: '#f4f4f5',
      text_secondary: '#a1a1aa',
      accent_color: '#3b82f6',
      queue_number_color: '#ffffff',
      vip_badge_color: '#a855f7',
      vvip_badge_color: '#eab308',
      live_indicator_color: '#ef4444',
    },
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    colors: {
      bg_primary: '#0a0d14',
      header_bg: '#0f172a',
      card_bg: '#0f1a2e',
      card_border: '#06b6d4',
      text_primary: '#22d3ee',
      text_secondary: '#67e8f9',
      accent_color: '#06b6d4',
      queue_number_color: '#facc15',
      vip_badge_color: '#ec4899',
      vvip_badge_color: '#f59e0b',
      live_indicator_color: '#f43f5e',
    },
  },
  {
    id: 'midnight_sapphire',
    name: 'Midnight Sapphire',
    colors: {
      bg_primary: '#0b1120',
      header_bg: '#0f172a',
      card_bg: '#1e293b',
      card_border: '#3b82f6',
      text_primary: '#f8fafc',
      text_secondary: '#94a3b8',
      accent_color: '#60a5fa',
      queue_number_color: '#38bdf8',
      vip_badge_color: '#818cf8',
      vvip_badge_color: '#fbbf24',
      live_indicator_color: '#ef4444',
    },
  },
  {
    id: 'emerald_royale',
    name: 'Emerald Royale',
    colors: {
      bg_primary: '#061c14',
      header_bg: '#06281c',
      card_bg: '#0b3526',
      card_border: '#10b981',
      text_primary: '#ecfdf5',
      text_secondary: '#6ee7b7',
      accent_color: '#10b981',
      queue_number_color: '#34d399',
      vip_badge_color: '#059669',
      vvip_badge_color: '#f59e0b',
      live_indicator_color: '#22c55e',
    },
  },
  {
    id: 'crimson_duel',
    name: 'Crimson Duel',
    colors: {
      bg_primary: '#180708',
      header_bg: '#250c0e',
      card_bg: '#2e0f12',
      card_border: '#dc2626',
      text_primary: '#fff1f2',
      text_secondary: '#fca5a5',
      accent_color: '#ef4444',
      queue_number_color: '#fbbf24',
      vip_badge_color: '#f43f5e',
      vvip_badge_color: '#eab308',
      live_indicator_color: '#ff2222',
    },
  },
  {
    id: 'royal_purple',
    name: 'Royal Purple',
    colors: {
      bg_primary: '#140c1f',
      header_bg: '#1e1130',
      card_bg: '#27173e',
      card_border: '#9333ea',
      text_primary: '#faf5ff',
      text_secondary: '#d8b4fe',
      accent_color: '#a855f7',
      queue_number_color: '#f472b6',
      vip_badge_color: '#c084fc',
      vvip_badge_color: '#fbbf24',
      live_indicator_color: '#e11d48',
    },
  },
  {
    id: 'clean_light',
    name: 'Clean Light',
    colors: {
      bg_primary: '#f4f4f5',
      header_bg: '#ffffff',
      card_bg: '#ffffff',
      card_border: '#e4e4e7',
      text_primary: '#18181b',
      text_secondary: '#71717a',
      accent_color: '#2563eb',
      queue_number_color: '#18181b',
      vip_badge_color: '#7c3aed',
      vvip_badge_color: '#d97706',
      live_indicator_color: '#dc2626',
    },
  },
];

export interface OverlaySettings {
  id: string;
  user_id?: string;
  streamer_token: string;
  streamer_name?: string;
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

  // Custom 11 Color Configuration
  custom_colors?: OverlayCustomColors;

  // Platform promotion on overlay
  allow_promotion?: boolean;

  created_at: string;
  updated_at: string;
}

export interface PlatformPromotion {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
  image_url?: string;
  link_url: string;
  position: 'overlay_bottom' | 'overlay_top';
  start_at?: string;
  end_at?: string;
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

export interface PlatformAnalytics {
  total_streamers: number;
  active_streamers: number;
  total_queue_players: number;
  total_donations_count: number;
  total_donations_amount: number;
  total_webhook_events: number;
}
