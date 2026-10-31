import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ override: true });

import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.ts';
import { sociabuzzService } from './src/server/sociabuzz.ts';
import { realtimeHub } from './src/server/realtime.ts';
import type { UserProfile, OverlaySettings, OverlayCustomColors } from './src/types/queue.ts';
import { DEFAULT_OVERLAY_COLORS } from './src/types/queue.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ddznezhftcwmftdrnyso.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkem5lemhmdGN3bWZ0ZHJueXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDAzMTgsImV4cCI6MjEwODU3NjMxOH0.XEUvnliZN_7VJhHDHv_DPrtUO6Q81EkYpsPNZulz3rI';

const supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY);
// Server-only admin client using SUPABASE_SERVICE_ROLE_KEY if configured in server environment
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : supabaseServer;

function getSupabaseClient(sessionToken?: string, supaAuthHeader?: string) {
  // 1. If service role key is present on server, use administrative client
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return supabaseAdmin;
  }
  // 2. Never use custom session tokens (sess_...) as Supabase JWTs.
  // Only forward actual Supabase JWT access tokens (starting with eyJ)
  const candidateJwt =
    (supaAuthHeader && supaAuthHeader.startsWith('eyJ') ? supaAuthHeader : undefined) ||
    (sessionToken && sessionToken.startsWith('eyJ') ? sessionToken : undefined);

  if (candidateJwt) {
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${candidateJwt}` },
      },
    });
  }
  return supabaseServer;
}

// Editable settings whitelist for streamers (STRICTLY EXCLUDES streamer_token, webhook_key, webhook_secret)
const OVERLAY_SETTINGS_COLUMNS = new Set([
  'title',
  'theme',
  'font_size',
  'max_visible_players',
  'animation',
  'opacity',
  'card_size',
  'spacing',
  'sociabuzz_url',
  'min_donation',
  'vip_min_donation',
  'vvip_min_donation',
  'max_queue_limit',
  'sound_alert',
  'allow_free_queue',
  'live_badge_text',
  'hide_playing_in_overlay',
  'panel_width',
  'show_id',
  'show_vip_badge',
  'show_live_badge',
  'border_radius',
  'enable_animation',
  'allow_promotion',
  'custom_colors',
  'animation_speed',
  'dashboard_ui_theme',
]);

// Protected credential columns that can NEVER be overwritten via general settings update
const PROTECTED_CREDENTIAL_COLUMNS = new Set([
  'streamer_token',
  'webhook_key',
  'webhook_secret',
  'id',
  'user_id',
  'created_at',
]);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory rate-limiter for join requests
const joinRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = joinRateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    joinRateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 20) {
    return false;
  }
  entry.count++;
  return true;
}

// User Authentication Middleware (Strict Multi-Tenant Isolation)
export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  let sessionToken = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionToken = authHeader.slice(7).trim();
  } else if (req.headers['x-session-token']) {
    sessionToken = String(req.headers['x-session-token']).trim();
  } else if (req.query.session_token) {
    sessionToken = String(req.query.session_token).trim();
  }

  if (!sessionToken) {
    res.status(401).json({ error: 'Akses ditolak: Silakan login terlebih dahulu dengan Google.' });
    return;
  }

  // 1. Check custom in-memory session store (sess_...)
  let user = db.getUserBySession(sessionToken);

  // 2. If not in memory store, check if token is a Supabase JWT (eyJ...)
  if (!user && sessionToken.startsWith('eyJ')) {
    try {
      const { data, error } = await supabaseServer.auth.getUser(sessionToken);
      if (!error && data?.user) {
        user = db.getUserByAuthId(data.user.id);
        if (!user) {
          const syncResult = db.findOrCreateSupabaseUser({
            auth_user_id: data.user.id,
            email: data.user.email || '',
            name:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              data.user.email?.split('@')[0],
            avatar_url:
              data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          });
          user = syncResult.user;
        }
      }
    } catch (e) {
      console.warn('[requireAuth] Supabase JWT validation error:', e);
    }
  }

  if (!user) {
    res.status(401).json({ error: 'Sesi login telah berakhir atau tidak valid. Silakan login kembali dengan akun Google Anda.' });
    return;
  }

  req.user = user;
  next();
}

/* ==========================================================================
   AUTHENTICATION ROUTES (SUPABASE GOOGLE OAUTH & SESSIONS)
   ========================================================================== */

// 1. Supabase Session Sync (Cryptographically verifies Supabase user before creating session)
app.post('/api/auth/session', async (req, res) => {
  const authHeader = req.headers['authorization'];
  let accessToken = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.slice(7).trim();
  } else if (req.body.access_token) {
    accessToken = String(req.body.access_token).trim();
  }

  let verifiedAuthUserId: string | null = null;
  let verifiedEmail: string | null = null;
  let verifiedName: string | undefined = undefined;
  let verifiedAvatarUrl: string | undefined = undefined;

  // Cryptographically verify the session token with Supabase Auth
  if (accessToken && accessToken.startsWith('eyJ')) {
    try {
      const { data, error } = await supabaseServer.auth.getUser(accessToken);
      if (error || !data?.user) {
        console.warn('[Auth Session] Supabase token verification failed:', error?.message);
        res.status(401).json({ error: 'Token autentikasi Supabase tidak valid atau telah kadaluarsa.' });
        return;
      }
      verifiedAuthUserId = data.user.id;
      verifiedEmail = data.user.email || null;
      verifiedName =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        verifiedEmail?.split('@')[0];
      verifiedAvatarUrl =
        data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture;
    } catch (e) {
      console.error('[Auth Session] Exception validating token:', e);
      res.status(401).json({ error: 'Gagal memverifikasi sesi autentikasi dengan Supabase.' });
      return;
    }
  } else {
    // Missing or invalid bearer token format
    res.status(401).json({
      error: 'Akses ditolak: Token autentikasi Supabase (Bearer JWT) yang valid wajib disertakan.',
    });
    return;
  }

  if (!verifiedAuthUserId || !verifiedEmail) {
    res.status(400).json({ error: 'Data identitas pengguna Supabase tidak lengkap.' });
    return;
  }

  const result = db.findOrCreateSupabaseUser({
    auth_user_id: verifiedAuthUserId,
    email: verifiedEmail,
    name: req.body.name?.trim() || verifiedName,
    avatar_url: req.body.avatar_url || verifiedAvatarUrl,
  });

  res.json({
    success: true,
    user: result.user,
    sessionToken: result.token,
    isNew: result.isNew,
    settings: db.getSettings(result.user.id),
  });
});

// 3. Get current authenticated user profile & settings
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    user,
    settings: db.getSettings(user.id),
  });
});

// 4. Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    db.destroySession(authHeader.slice(7).trim());
  }
  res.json({ success: true, message: 'Berhasil keluar.' });
});

/* ==========================================================================
   PLATFORM ADMIN & PROMOTION ROUTES
   ========================================================================== */

// Get Platform Analytics (Admin only)
app.get('/api/admin/platform/analytics', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak: Hanya Administrator Platform yang diizinkan.' });
    return;
  }
  res.json({
    analytics: db.getPlatformAnalytics(),
    users: db.getAllUsers().map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      created_at: u.created_at,
    })),
  });
});

// Get Platform Promotion
app.get('/api/admin/platform/promotion', requireAuth, (_req, res) => {
  res.json({ promotion: db.getPlatformPromotion() });
});

// Update Platform Promotion (Admin only)
app.post('/api/admin/platform/promotion', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak: Hanya Administrator Platform yang dapat mengubah promosi.' });
    return;
  }
  const updated = db.updatePlatformPromotion(req.body);
  realtimeHub.broadcastQueueChange('all', 'platform_promotion_updated');
  res.json({ success: true, promotion: updated });
});

// Public Platform Promotion endpoint
app.get('/api/public/platform/promotion', (_req, res) => {
  res.json({ promotion: db.getPlatformPromotion() });
});

/* ==========================================================================
   PUBLIC OVERLAY & REALTIME ROUTES
   ========================================================================== */

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Realtime SSE stream (Supports OBS overlay token or authenticated streamer userId)
app.get('/api/realtime', (req, res) => {
  const token = req.query.token as string | undefined;
  const sessionToken = (req.query.session_token as string) || (req.headers['authorization']?.replace('Bearer ', ''));
  const user = sessionToken ? db.getUserBySession(sessionToken) : null;
  const isAdmin = Boolean(user);
  const clientId = 'client-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

  realtimeHub.addClient(clientId, res, token, user?.id, isAdmin);
});

// Helper to return ONLY public presentation properties for OBS Overlay
function sanitizePublicOverlaySettings(raw: Partial<OverlaySettings>, streamerName?: string) {
  const customColors =
    raw && typeof raw.custom_colors === 'object' && raw.custom_colors !== null
      ? raw.custom_colors
      : {};

  return {
    title: raw?.title || 'ANTRIAN SELANJUTNYA',
    theme: raw?.theme || 'obsidian',
    font_size: raw?.font_size || 'medium',
    max_visible_players: raw?.max_visible_players ?? 5,
    animation: raw?.animation || 'smooth',
    opacity: raw?.opacity ?? 96,
    card_size: raw?.card_size || 'normal',
    spacing: raw?.spacing ?? 8,
    sociabuzz_url: raw?.sociabuzz_url || 'https://sociabuzz.com',
    min_donation: raw?.min_donation ?? 10000,
    vip_min_donation: raw?.vip_min_donation ?? 25000,
    vvip_min_donation: raw?.vvip_min_donation ?? 50000,
    max_queue_limit: raw?.max_queue_limit ?? 50,
    sound_alert: raw?.sound_alert !== false,
    allow_free_queue: Boolean(raw?.allow_free_queue),
    live_badge_text: raw?.live_badge_text || 'LIVE',
    hide_playing_in_overlay: raw?.hide_playing_in_overlay ?? true,
    panel_width: raw?.panel_width ?? 440,
    show_id: raw?.show_id !== false,
    show_vip_badge: raw?.show_vip_badge !== false,
    show_live_badge: raw?.show_live_badge !== false,
    border_radius: raw?.border_radius ?? 22,
    enable_animation: raw?.enable_animation !== false,
    allow_promotion: raw?.allow_promotion ?? true,
    animation_speed: raw?.animation_speed || 'normal',
    dashboard_ui_theme: raw?.dashboard_ui_theme || 'neobrutalism',
    streamer_name: streamerName || raw?.streamer_name,
    custom_colors: {
      ...DEFAULT_OVERLAY_COLORS,
      ...customColors,
    },
  };
}

// Get public overlay configuration and active queue (User-Specific by Token)
app.get('/api/public/overlay/:token', async (req, res) => {
  const { token } = req.params;

  let targetUserId: string | null = null;
  let streamerName: string | undefined = undefined;

  // 1. Resolve target user ID from token
  if (supabaseAdmin) {
    const { data: tokData, error: tokErr } = await supabaseAdmin
      .from('overlay_tokens')
      .select('user_id')
      .eq('token', token)
      .is('revoked_at', null)
      .maybeSingle();

    if (tokErr) {
      console.warn('[Overlay Token Query Warning]', tokErr.message);
    }
    if (tokData?.user_id) {
      targetUserId = tokData.user_id;
    }
  }

  if (!targetUserId) {
    targetUserId = db.getUserIdByOverlayToken(token);
  }

  if (!targetUserId) {
    res.status(404).json({ error: 'Overlay tidak ditemukan atau link sudah dicabut/kadaluarsa.' });
    return;
  }

  // 2. Fetch settings and streamer name from Supabase or local cache
  let supaSettings: Record<string, unknown> | null = null;
  if (supabaseAdmin) {
    const { data: rawSettings } = await supabaseAdmin
      .from('overlay_settings')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (rawSettings) {
      supaSettings = rawSettings;
    }

    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .or(`id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`)
      .maybeSingle();

    if (prof?.name) {
      streamerName = prof.name;
    }
  }

  const localSettings = db.getSettings(targetUserId);
  const combinedSettings = {
    ...localSettings,
    ...(supaSettings || {}),
  };

  const safeSettings = sanitizePublicOverlaySettings(combinedSettings, streamerName || localSettings.streamer_name);

  // 3. Get queue
  let queueToReturn: unknown[] = [];
  if (supabaseAdmin) {
    const { data: activeQueue } = await supabaseAdmin
      .from('queue_players')
      .select('id, player_id, name, game_id, membership, status, position, donation_id, donation_amount, joined_at')
      .eq('user_id', targetUserId)
      .in('status', ['QUEUED', 'WAITING'])
      .order('position', { ascending: true });

    if (activeQueue && activeQueue.length > 0) {
      queueToReturn = activeQueue.map((qp: any) => ({
        id: qp.id,
        player_id: qp.player_id || qp.id,
        position: qp.position,
        status: qp.status,
        joined_at: qp.joined_at,
        player: {
          id: qp.player_id || qp.id,
          name: qp.name,
          game_id: qp.game_id || '-',
          membership: qp.membership || 'REGULAR',
          status: qp.status,
          created_at: qp.joined_at,
          updated_at: qp.joined_at,
        },
      }));
    }
  }

  if (queueToReturn.length === 0) {
    queueToReturn = db.getActiveQueue(targetUserId);
  }

  const platformPromo = db.getPlatformPromotion();

  res.json({
    settings: safeSettings,
    queue: queueToReturn,
    promotion: safeSettings.allow_promotion && platformPromo.enabled ? platformPromo : null,
  });
});

// Viewer Join Queue (Routed to specific streamer by token)
app.post('/api/public/join', (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit.' });
    return;
  }

  const { name, game_id, donation_id, streamer_token } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Nama player wajib diisi.' });
    return;
  }
  if (!game_id || typeof game_id !== 'string' || game_id.trim().length === 0) {
    res.status(400).json({ error: 'ID Game wajib diisi.' });
    return;
  }

  // Determine target streamer by token
  const targetToken = streamer_token;
  if (!targetToken) {
    res.status(400).json({ error: 'Token streamer diperlukan untuk bergabung ke antrian.' });
    return;
  }

  const targetUserId = db.getUserIdByOverlayToken(targetToken);
  if (!targetUserId) {
    res.status(404).json({ error: 'Streamer tidak ditemukan atau token overlay sudah tidak aktif.' });
    return;
  }

  // Sanitize
  const cleanName = name.replace(/[<>&"']/g, '').trim().slice(0, 30);
  const cleanGameId = game_id.replace(/[<>&"']/g, '').trim().slice(0, 30);
  const cleanDonationId = donation_id ? String(donation_id).replace(/[<>&"']/g, '').trim().slice(0, 40) : undefined;

  const result = db.addPlayerToQueue(targetUserId, {
    name: cleanName,
    game_id: cleanGameId,
    donation_id: cleanDonationId,
  });

  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  // Realtime update isolated to this streamer
  realtimeHub.broadcastQueueChange(targetUserId, 'viewer_join');

  res.json({
    success: true,
    message: result.message,
    queueItem: result.queueItem,
  });
});

// Check queue status by player ID or game ID
app.get('/api/public/status/:id', (req, res) => {
  const { id } = req.params;
  const streamerToken = req.query.token as string | undefined;
  if (!streamerToken) {
    res.status(400).json({ error: 'Token streamer diperlukan' });
    return;
  }

  const userId = db.getUserIdByOverlayToken(streamerToken);
  if (!userId) {
    res.status(404).json({ error: 'Streamer tidak ditemukan' });
    return;
  }

  const activeQueue = db.getActiveQueue(userId);
  const found = activeQueue.find(
    (q) => q.player_id === id || q.player.game_id.toLowerCase() === id.toLowerCase()
  );

  if (!found) {
    res.status(404).json({ error: 'Player tidak ditemukan dalam antrian aktif' });
    return;
  }

  res.json({ item: found });
});

/* ==========================================================================
   SOCIABUZZ WEBHOOK ENDPOINTS
   ========================================================================== */

// Dedicated streamer webhook path: /api/webhooks/sociabuzz/:streamerKey
// Or general: /api/webhooks/sociabuzz?key=...
function handleSociabuzzWebhook(req: Request, res: Response): void {
  const streamerKey =
    req.params.streamerKey ||
    (req.query.key as string) ||
    (req.query.token as string) ||
    (req.headers['x-sociabuzz-token'] as string) ||
    (req.headers['x-streamer-key'] as string);

  // Identify target streamer
  const targetUserId = streamerKey ? db.getUserIdByWebhookKey(streamerKey) : null;
  if (!targetUserId) {
    res.status(404).json({ error: 'Streamer tidak ditemukan atau Webhook key/token tidak valid.' });
    return;
  }

  const streamerSettings = db.getSettings(targetUserId);
  const signature = (req.headers['x-sociabuzz-signature'] || req.headers['x-signature']) as string | undefined;
  const rawBody = JSON.stringify(req.body);

  // Signature verification (if streamer configured secret or Sociabuzz sent header)
  if (streamerSettings.webhook_secret && signature) {
    if (!sociabuzzService.verifySignature(rawBody, streamerSettings.webhook_secret, signature)) {
      res.status(403).json({ error: 'Invalid Sociabuzz signature' });
      return;
    }
  }

  const result = sociabuzzService.processWebhook(
    targetUserId,
    req.body,
    rawBody,
    req.headers as Record<string, unknown>
  );

  if (!result.success && result.duplicate) {
    // Acknowledge Sociabuzz so duplicate HTTP retries stop
    res.status(200).json({ status: 'ignored_duplicate', message: result.error });
    return;
  }

  res.status(200).json({
    status: 'success',
    donation: result.donation,
    queueCreated: result.queueCreated,
  });
}

app.post('/api/webhooks/sociabuzz', handleSociabuzzWebhook);
app.post('/api/webhooks/sociabuzz/:streamerKey', handleSociabuzzWebhook);

/* ==========================================================================
   STREAMER PROTECTED DASHBOARD ROUTES (USER DATA ISOLATION)
   ========================================================================== */

// Full Dashboard data for logged in streamer (Supabase as primary source of truth)
app.get('/api/admin/dashboard', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const authUserId = req.user!.auth_user_id;
  const sessionToken = req.headers['authorization']?.replace('Bearer ', '').trim();
  const supaAuthHeader = (req.headers['x-supabase-auth'] as string) || undefined;
  const client = getSupabaseClient(sessionToken, supaAuthHeader);

  let supaSettings: Record<string, unknown> | null = null;
  let streamerName: string | undefined = undefined;

  try {
    const candidateIds = Array.from(new Set([userId, authUserId].filter(Boolean) as string[]));
    for (const searchId of candidateIds) {
      const { data, error } = await client
        .from('overlay_settings')
        .select('*')
        .eq('user_id', searchId)
        .maybeSingle();

      if (error) {
        console.error('[Supabase Dashboard Settings Query Error]', error);
      } else if (data) {
        supaSettings = data;
        break;
      }
    }

    // Also get streamer name from profiles table
    for (const searchId of candidateIds) {
      const { data: prof } = await client
        .from('profiles')
        .select('name')
        .or(`id.eq.${searchId},auth_user_id.eq.${searchId}`)
        .maybeSingle();
      if (prof?.name) {
        streamerName = prof.name;
        break;
      }
    }
  } catch (err) {
    console.warn('[Supabase Dashboard Fetch Notice]', err);
  }

  // Local settings as baseline / fallback
  const localSettings = db.getSettings(userId);
  const supaColors = (supaSettings && typeof supaSettings.custom_colors === 'object' && supaSettings.custom_colors !== null)
    ? (supaSettings.custom_colors as OverlayCustomColors)
    : (localSettings.custom_colors || {});

  const mergedSettings: OverlaySettings = {
    ...localSettings,
    ...(supaSettings || {}),
    streamer_name: streamerName || (supaSettings?.streamer_name as string) || localSettings.streamer_name || req.user?.name,
    animation_speed: (supaSettings?.animation_speed as 'slow' | 'normal' | 'fast') || localSettings.animation_speed || 'normal',
    dashboard_ui_theme: (supaSettings?.dashboard_ui_theme as 'neobrutalism' | 'dark') || localSettings.dashboard_ui_theme || 'neobrutalism',
    custom_colors: {
      ...DEFAULT_OVERLAY_COLORS,
      ...supaColors,
    },
  };

  // Sync Supabase settings to local cache
  if (supaSettings) {
    db.updateSettings(userId, mergedSettings);
  }

  res.json({
    user: req.user,
    settings: mergedSettings,
    queue: db.getActiveQueue(userId),
    donations: db.getDonations(userId),
    stats: db.getStats(userId),
    logs: db.getActivityLogs(userId, 20),
    webhook_events: db.getWebhookEvents(userId, 20),
  });
});

// Next Match (Current -> DONE, Next -> PLAYING)
app.post('/api/admin/queue/next', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const result = db.nextMatch(userId);
  realtimeHub.broadcastQueueChange(userId, 'next_match');
  res.json({ success: true, ...result });
});

// Set specific to PLAYING
app.post('/api/admin/queue/play', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { queue_id } = req.body;
  const success = db.setPlaying(userId, queue_id);
  if (success) {
    realtimeHub.broadcastQueueChange(userId, 'player_playing');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Gagal mengatur player ke status PLAYING' });
  }
});

// Set specific to DONE
app.post('/api/admin/queue/done', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { queue_id } = req.body;
  const success = db.setDone(userId, queue_id);
  if (success) {
    realtimeHub.broadcastQueueChange(userId, 'player_done');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Gagal mengatur player ke status DONE' });
  }
});

// Skip player
app.post('/api/admin/queue/skip', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { queue_id } = req.body;
  const success = db.skipPlayer(userId, queue_id);
  if (success) {
    realtimeHub.broadcastQueueChange(userId, 'player_skipped');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Gagal men-skip player' });
  }
});

// Remove player
app.post('/api/admin/queue/remove', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const targetId = req.body.queue_id || req.body.id || req.body.player_id;
  if (!targetId) {
    res.status(400).json({ error: 'ID queue atau player wajib disertakan' });
    return;
  }
  const success = db.removePlayer(userId, targetId);
  if (success) {
    realtimeHub.broadcastQueueChange(userId, 'player_removed');
    res.json({ success: true, message: 'Player berhasil dihapus dari antrian' });
  } else {
    res.status(400).json({ error: 'Gagal menghapus: Player tidak ditemukan dalam antrian' });
  }
});

// Edit player
app.post('/api/admin/queue/edit', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { player_id, name, game_id, membership } = req.body;
  const success = db.editPlayer(userId, player_id, { name, game_id, membership });
  if (success) {
    realtimeHub.broadcastQueueChange(userId, 'player_edited');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Player tidak ditemukan' });
  }
});

// Move position
app.post('/api/admin/queue/move', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { queue_id, direction } = req.body;
  const success = db.movePosition(userId, queue_id, direction);
  if (success) {
    realtimeHub.broadcastQueueChange(userId, 'queue_reordered');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Gagal memindahkan posisi' });
  }
});

// Manual add player
app.post('/api/admin/queue/manual-add', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { name, game_id, membership } = req.body;
  const result = db.addPlayerToQueue(userId, {
    name,
    game_id,
    membership: membership || 'REGULAR',
  });
  if (result.success) {
    realtimeHub.broadcastQueueChange(userId, 'player_manually_added');
    res.json({ success: true, item: result.queueItem });
  } else {
    res.status(400).json({ error: result.message });
  }
});

// Update Settings (Writes directly to Supabase with column whitelisting, error checking, and user isolation)
app.post('/api/admin/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const authUserId = req.user!.auth_user_id;
  const sessionToken = req.headers['authorization']?.replace('Bearer ', '').trim();
  const supaAuthHeader = (req.headers['x-supabase-auth'] as string) || undefined;
  const client = getSupabaseClient(sessionToken, supaAuthHeader);

  // 1. Whitelist fields for Supabase overlay_settings (strictly excluding protected credentials)
  const supaPayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(req.body)) {
    if (PROTECTED_CREDENTIAL_COLUMNS.has(key)) {
      // Explicit protection: Never overwrite tokens, secrets, or internal IDs
      continue;
    }
    if (OVERLAY_SETTINGS_COLUMNS.has(key)) {
      if (key === 'custom_colors') {
        if (typeof value === 'object' && value !== null) {
          supaPayload.custom_colors = value;
        }
      } else if (key === 'animation_speed') {
        supaPayload.animation_speed = String(value);
      } else if (key === 'dashboard_ui_theme') {
        supaPayload.dashboard_ui_theme = String(value);
      } else {
        supaPayload[key] = value;
      }
    }
  }

  // 2. Persist to Supabase overlay_settings
  const candidateIds = Array.from(new Set([userId, authUserId].filter(Boolean) as string[]));
  let supabasePersistError: string | null = null;
  let isPartialSave = false;
  let missingColumns: string[] = [];
  let successfulSearchId: string | null = null;

  try {
    let updated = false;
    for (const searchId of candidateIds) {
      let { data, error } = await client
        .from('overlay_settings')
        .update(supaPayload)
        .eq('user_id', searchId)
        .select('id');

      // Graceful fallback if database schema does not have new columns yet (Postgres code 42703 or PostgREST PGRST204)
      if (
        error &&
        (error.code === '42703' ||
          error.code === 'PGRST204' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('could not find'))
      ) {
        console.warn(
          '[Supabase Migration Notice] Columns custom_colors/animation_speed/dashboard_ui_theme not yet migrated in Supabase. Executing core update...'
        );
        isPartialSave = true;
        missingColumns = ['custom_colors', 'animation_speed', 'dashboard_ui_theme'];
        const { custom_colors, animation_speed, dashboard_ui_theme, ...corePayload } = supaPayload;
        const fallbackRes = await client
          .from('overlay_settings')
          .update(corePayload)
          .eq('user_id', searchId)
          .select('id');
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.error('[Supabase Settings Update Error]', error);
        supabasePersistError = error.message;
      } else if (data && data.length > 0) {
        updated = true;
        successfulSearchId = searchId;
        supabasePersistError = null;
        break;
      }
    }

    if (!updated && candidateIds.length > 0) {
      const upsertId = candidateIds[0];
      let { error: upsertErr } = await client
        .from('overlay_settings')
        .upsert({ ...supaPayload, user_id: upsertId }, { onConflict: 'user_id' });

      // Fallback for upsert if columns missing
      if (
        upsertErr &&
        (upsertErr.code === '42703' ||
          upsertErr.code === 'PGRST204' ||
          upsertErr.message?.includes('does not exist') ||
          upsertErr.message?.includes('could not find'))
      ) {
        console.warn(
          '[Supabase Migration Notice] Columns not yet in schema for upsert. Executing core upsert...'
        );
        isPartialSave = true;
        missingColumns = ['custom_colors', 'animation_speed', 'dashboard_ui_theme'];
        const { custom_colors, animation_speed, dashboard_ui_theme, ...corePayload } = supaPayload;
        const fallbackUpsertRes = await client
          .from('overlay_settings')
          .upsert({ ...corePayload, user_id: upsertId }, { onConflict: 'user_id' });
        upsertErr = fallbackUpsertRes.error;
      }

      if (upsertErr) {
        console.error('[Supabase Settings Upsert Error]', upsertErr);
        supabasePersistError = upsertErr.message;
      } else {
        successfulSearchId = upsertId;
        supabasePersistError = null;
      }
    }

    // 3. If streamer_name provided, sync to profiles.name in Supabase
    if (req.body.streamer_name && typeof req.body.streamer_name === 'string') {
      const cleanName = req.body.streamer_name.trim();
      for (const searchId of candidateIds) {
        try {
          await client
            .from('profiles')
            .update({ name: cleanName, updated_at: new Date().toISOString() })
            .or(`id.eq.${searchId},auth_user_id.eq.${searchId}`);
        } catch (e: unknown) {
          console.warn('[Supabase Profile Name Update Notice]', e);
        }
      }
    }
  } catch (err: unknown) {
    supabasePersistError = err instanceof Error ? err.message : 'Kesalahan koneksi database';
    console.error('[Supabase Settings Exception]', err);
  }

  // Hard error checking: Never claim success or silently fall back to local cache if Supabase persistence failed
  if (supabasePersistError) {
    res.status(500).json({
      error: `Gagal menyimpan ke database Supabase: ${supabasePersistError}. Pastikan migrasi SQL telah dijalankan dan izin RLS sesuai.`,
    });
    return;
  }

  // 4. Re-read the latest saved settings directly from Supabase
  let reFetchedSettings: Record<string, unknown> | null = null;
  const targetReReadId = successfulSearchId || candidateIds[0] || userId;
  try {
    const { data: refData } = await client
      .from('overlay_settings')
      .select('*')
      .eq('user_id', targetReReadId)
      .maybeSingle();
    if (refData) {
      reFetchedSettings = refData;
    }
  } catch (reErr) {
    console.warn('[Supabase Re-fetch Notice]', reErr);
  }

  // 5. Construct verified settings payload
  const localSettings = db.getSettings(userId);
  const activeCustomColors =
    reFetchedSettings &&
    typeof reFetchedSettings.custom_colors === 'object' &&
    reFetchedSettings.custom_colors !== null
      ? reFetchedSettings.custom_colors
      : (supaPayload.custom_colors || localSettings.custom_colors || DEFAULT_OVERLAY_COLORS);

  const returnedSettings: OverlaySettings = {
    ...localSettings,
    ...(reFetchedSettings || {}),
    streamer_name:
      (req.body.streamer_name as string) ||
      (reFetchedSettings?.streamer_name as string) ||
      localSettings.streamer_name ||
      req.user?.name,
    animation_speed:
      (reFetchedSettings?.animation_speed as any) ||
      (supaPayload.animation_speed as any) ||
      localSettings.animation_speed ||
      'normal',
    dashboard_ui_theme:
      (reFetchedSettings?.dashboard_ui_theme as any) ||
      (supaPayload.dashboard_ui_theme as any) ||
      localSettings.dashboard_ui_theme ||
      'neobrutalism',
    custom_colors: {
      ...DEFAULT_OVERLAY_COLORS,
      ...(activeCustomColors as any),
    },
  };

  // 6. Update local in-memory cache and broadcast realtime update
  db.updateSettings(userId, returnedSettings);
  realtimeHub.broadcastQueueChange(userId, 'settings_updated');

  if (isPartialSave) {
    res.json({
      success: true,
      partial: true,
      warning:
        'Pengaturan dasar berhasil disimpan ke Supabase, namun kolom custom (custom_colors, animation_speed, dashboard_ui_theme) belum termigrasi di database.',
      missingColumns,
      settings: returnedSettings,
    });
  } else {
    res.json({
      success: true,
      partial: false,
      settings: returnedSettings,
    });
  }
});

// Regenerate Token
app.post('/api/admin/settings/regenerate-token', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const newToken = db.regenerateStreamerToken(userId);
  realtimeHub.broadcastQueueChange(userId, 'token_regenerated');
  res.json({ success: true, token: newToken });
});

// Get Webhook logs & Diagnostic payloads
app.get('/api/admin/webhooks/logs', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  res.json({
    events: db.getWebhookEvents(userId, 50),
    settings: db.getSettings(userId),
  });
});

// Simulate Sociabuzz Donation / Webhook Notification
app.post('/api/admin/simulate-donation', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { donor_name, amount, message, game_id } = req.body;
  const testId = 'SB-TEST-' + Math.floor(100000 + Math.random() * 900000);

  const payload: Record<string, unknown> = {
    id: testId,
    donor_name: donor_name || 'Budi Gaming',
    amount: amount || 25000,
    message: message || (game_id ? `Mabar bang ID: ${game_id}` : 'Semangat streamernya!'),
    created_at: new Date().toISOString(),
  };

  if (game_id) {
    payload.game_id = game_id;
    payload.queue_input = game_id;
  }

  const result = sociabuzzService.processWebhook(
    userId,
    payload,
    JSON.stringify(payload),
    { 'x-simulated': 'true', 'user-agent': 'AI-Studio-SociabuzzSimulator/1.0' }
  );

  realtimeHub.broadcastQueueChange(userId, 'simulated_donation');
  res.json(result);
});

/* ==========================================================================
   VITE DEV SERVER / STATIC ASSETS
   ========================================================================== */
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Only start standalone HTTP server if not running inside a Vercel serverless environment
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Multi-User Streamer Queue & OBS Overlay Server running at http://localhost:${PORT}`);
    });
  }
}

if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export { app };
export default app;
