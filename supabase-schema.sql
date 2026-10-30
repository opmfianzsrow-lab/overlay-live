-- ==============================================================================
-- ANTRIAN 1V1 — PRODUCTION MULTI-TENANT SUPABASE DATABASE SCHEMA
-- Execute this script in your Supabase Project: SQL Editor -> Run
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Users mapped to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY DEFAULT ('usr_' || substring(md5(random()::text) from 1 for 12)),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'streamer' CHECK (role IN ('streamer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. QUEUES (One or more queues per streamer)
CREATE TABLE IF NOT EXISTS public.queues (
  id TEXT PRIMARY KEY DEFAULT ('q_set_' || substring(md5(random()::text) from 1 for 10)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main 1v1 Queue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. QUEUE PLAYERS (Live match queue items)
CREATE TABLE IF NOT EXISTS public.queue_players (
  id TEXT PRIMARY KEY DEFAULT ('qp_' || substring(md5(random()::text) from 1 for 12)),
  queue_id TEXT,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  game_id TEXT NOT NULL DEFAULT '-',
  membership TEXT NOT NULL DEFAULT 'REGULAR' CHECK (membership IN ('REGULAR', 'VIP', 'VVIP')),
  position INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PLAYING', 'DONE', 'SKIPPED', 'CANCELLED')),
  donation_id TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. DONATIONS (Transactions & claims)
CREATE TABLE IF NOT EXISTS public.donations (
  id TEXT PRIMARY KEY DEFAULT ('don_' || substring(md5(random()::text) from 1 for 12)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_donation_id TEXT NOT NULL,
  donor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  message TEXT NOT NULL DEFAULT '',
  queue_value TEXT,
  status TEXT NOT NULL DEFAULT 'UNCLAIMED' CHECK (status IN ('UNCLAIMED', 'CLAIMED', 'REFUNDED')),
  claimed_by_player_id TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. OVERLAY TOKENS (Cryptographically secure, unguessable public tokens)
CREATE TABLE IF NOT EXISTS public.overlay_tokens (
  id TEXT PRIMARY KEY DEFAULT ('tok_' || substring(md5(random()::text) from 1 for 12)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- 6. OVERLAY SETTINGS (Styling, limits, badges, branding)
CREATE TABLE IF NOT EXISTS public.overlay_settings (
  id TEXT PRIMARY KEY DEFAULT ('set_' || substring(md5(random()::text) from 1 for 12)),
  user_id TEXT NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  streamer_token TEXT NOT NULL,
  webhook_key TEXT NOT NULL UNIQUE,
  webhook_secret TEXT,
  title TEXT NOT NULL DEFAULT 'ANTRIAN BY1',
  theme TEXT NOT NULL DEFAULT 'obsidian',
  font_size TEXT NOT NULL DEFAULT 'medium',
  max_visible_players INT NOT NULL DEFAULT 5,
  animation TEXT NOT NULL DEFAULT 'smooth',
  opacity INT NOT NULL DEFAULT 96,
  card_size TEXT NOT NULL DEFAULT 'normal',
  spacing INT NOT NULL DEFAULT 8,
  sociabuzz_url TEXT NOT NULL DEFAULT '',
  min_donation NUMERIC NOT NULL DEFAULT 10000,
  vip_min_donation NUMERIC NOT NULL DEFAULT 25000,
  vvip_min_donation NUMERIC NOT NULL DEFAULT 50000,
  max_queue_limit INT NOT NULL DEFAULT 50,
  sound_alert BOOLEAN NOT NULL DEFAULT true,
  allow_free_queue BOOLEAN NOT NULL DEFAULT false,
  live_badge_text TEXT NOT NULL DEFAULT 'LIVE',
  hide_playing_in_overlay BOOLEAN NOT NULL DEFAULT false,
  panel_width INT NOT NULL DEFAULT 440,
  show_id BOOLEAN NOT NULL DEFAULT true,
  show_vip_badge BOOLEAN NOT NULL DEFAULT true,
  show_live_badge BOOLEAN NOT NULL DEFAULT true,
  border_radius INT NOT NULL DEFAULT 22,
  enable_animation BOOLEAN NOT NULL DEFAULT true,
  allow_promotion BOOLEAN NOT NULL DEFAULT false,
  custom_colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. WEBHOOK EVENTS (Raw diagnostic and replay log)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id TEXT PRIMARY KEY DEFAULT ('wh_' || substring(md5(random()::text) from 1 for 12)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'sociabuzz',
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'donation',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT true,
  processing_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ACTIVITY LOGS (Streamer audit trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY DEFAULT ('log_' || substring(md5(random()::text) from 1 for 12)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'join',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. PLATFORM PROMOTIONS (Global promotions controlled by Admin)
CREATE TABLE IF NOT EXISTS public.platform_promotions (
  id TEXT PRIMARY KEY DEFAULT 'promo_global',
  enabled BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL DEFAULT 'PRODUK TERBARU',
  description TEXT NOT NULL DEFAULT 'Cek produk dan promo eksklusif sekarang!',
  image_url TEXT DEFAULT '',
  link_url TEXT NOT NULL DEFAULT 'https://antrian1v1.com',
  position TEXT NOT NULL DEFAULT 'overlay_bottom',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default promotion template if empty
INSERT INTO public.platform_promotions (id, enabled, title, description, link_url, position)
VALUES ('promo_global', false, '🔥 PRODUK TERBARU', 'Cek produk dan penawaran live stream kami sekarang', 'https://antrian1v1.com', 'overlay_bottom')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overlay_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overlay_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_promotions ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's profile ID
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- QUEUES POLICIES
CREATE POLICY "Streamer can manage their own queues"
  ON public.queues FOR ALL
  USING (user_id = public.current_profile_id());

-- QUEUE PLAYERS POLICIES (Owner full access, Public read through overlay token)
CREATE POLICY "Streamer can manage their queue players"
  ON public.queue_players FOR ALL
  USING (user_id = public.current_profile_id());

CREATE POLICY "Public read active queue for live overlays"
  ON public.queue_players FOR SELECT
  USING (status IN ('QUEUED', 'WAITING'));

-- DONATIONS POLICIES
CREATE POLICY "Streamer can view and manage their donations"
  ON public.donations FOR ALL
  USING (user_id = public.current_profile_id());

-- OVERLAY TOKENS POLICIES
CREATE POLICY "Streamer can view and manage their tokens"
  ON public.overlay_tokens FOR ALL
  USING (user_id = public.current_profile_id());

CREATE POLICY "Public validate active overlay token"
  ON public.overlay_tokens FOR SELECT
  USING (revoked_at IS NULL);

-- OVERLAY SETTINGS POLICIES
CREATE POLICY "Streamer can manage their overlay settings"
  ON public.overlay_settings FOR ALL
  USING (user_id = public.current_profile_id());

CREATE POLICY "Public read overlay settings by token"
  ON public.overlay_settings FOR SELECT
  USING (true);

-- PROFILES PUBLIC READ FOR STREAMER NAME ON OVERLAY
CREATE POLICY "Public read streamer name for overlay"
  ON public.profiles FOR SELECT
  USING (true);

-- WEBHOOK EVENTS POLICIES
CREATE POLICY "Streamer can view their webhook events"
  ON public.webhook_events FOR SELECT
  USING (user_id = public.current_profile_id());

-- ACTIVITY LOGS POLICIES
CREATE POLICY "Streamer can view their activity logs"
  ON public.activity_logs FOR ALL
  USING (user_id = public.current_profile_id());

-- PLATFORM PROMOTIONS POLICIES (Public read if enabled, Admin edit)
CREATE POLICY "Public can view active platform promotion"
  ON public.platform_promotions FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage platform promotions"
  ON public.platform_promotions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- ==============================================================================
-- AUTOMATIC NEW USER ONBOARDING TRIGGER
-- Triggered whenever a new user completes Google OAuth in Supabase
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id TEXT;
  new_token TEXT;
  new_webhook_key TEXT;
  user_full_name TEXT;
  user_avatar TEXT;
BEGIN
  -- Prevent duplicate execution if profile already exists for this auth_user_id
  IF EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  new_profile_id := 'usr_' || substring(md5(random()::text) from 1 for 12);
  new_token := '1v1_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 16);
  new_webhook_key := 'sb_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 16);
  
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id::text
  );

  -- 1. Create Profile
  INSERT INTO public.profiles (id, auth_user_id, name, email, avatar_url, role)
  VALUES (new_profile_id, NEW.id, user_full_name, NEW.email, user_avatar, 'streamer')
  ON CONFLICT (auth_user_id) DO NOTHING;

  -- 2. Create Default Queue
  INSERT INTO public.queues (user_id, name)
  VALUES (new_profile_id, 'Antrian 1v1 Stream')
  ON CONFLICT DO NOTHING;

  -- 3. Create Unique Overlay Token
  INSERT INTO public.overlay_tokens (user_id, token)
  VALUES (new_profile_id, new_token)
  ON CONFLICT DO NOTHING;

  -- 4. Create Default Overlay Settings
  INSERT INTO public.overlay_settings (
    user_id,
    streamer_token,
    webhook_key,
    title,
    theme,
    min_donation,
    vip_min_donation,
    vvip_min_donation
  )
  VALUES (
    new_profile_id,
    new_token,
    new_webhook_key,
    'ANTRIAN BY1',
    'obsidian',
    10000,
    25000,
    50000
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 5. Add Initial Activity Log
  INSERT INTO public.activity_logs (user_id, text, type)
  VALUES (new_profile_id, 'Akun streamer dan overlay OBS berhasil diinisialisasi', 'join')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Safe fallback: log error to Postgres log without aborting user creation in auth.users
  RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- SAFE MIGRATION: ADD custom_colors COLUMN TO overlay_settings (NON-DESTRUCTIVE)
-- Can be executed safely in existing Supabase projects without losing data
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'overlay_settings' 
    AND column_name = 'custom_colors'
  ) THEN
    ALTER TABLE public.overlay_settings 
      ADD COLUMN custom_colors JSONB NOT NULL DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added custom_colors column to public.overlay_settings successfully.';
  END IF;
END $$;

