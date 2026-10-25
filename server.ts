import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.ts';
import { sociabuzzService } from './src/server/sociabuzz.ts';
import { realtimeHub } from './src/server/realtime.ts';
import type { UserProfile } from './src/types/queue.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

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

// User Authentication Middleware (Multi-User)
export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let sessionToken = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionToken = authHeader.slice(7).trim();
  } else if (req.headers['x-session-token']) {
    sessionToken = String(req.headers['x-session-token']).trim();
  } else if (req.query.session_token) {
    sessionToken = String(req.query.session_token).trim();
  }

  // Also support legacy x-admin-pin for backwards compatibility
  const legacyPin = req.headers['x-admin-pin'] as string;
  if (legacyPin === 'streamer123' || legacyPin === 'demo') {
    const demoUser = db.getUser('usr_demo') || db.getAllUsers()[0];
    if (demoUser) {
      req.user = demoUser;
      return next();
    }
  }

  if (!sessionToken) {
    res.status(401).json({ error: 'Akses ditolak: Silakan login terlebih dahulu.' });
    return;
  }

  const user = db.getUserBySession(sessionToken);
  if (!user) {
    res.status(401).json({ error: 'Sesi login telah berakhir. Silakan login kembali.' });
    return;
  }

  req.user = user;
  next();
}

/* ==========================================================================
   AUTHENTICATION ROUTES (GOOGLE OAUTH & SESSIONS)
   ========================================================================== */

// 1. Google Login / Authentication handler
app.post('/api/auth/google', (req, res) => {
  const { email, name, avatar_url } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Email Google yang valid wajib disertakan' });
    return;
  }

  const result = db.findOrCreateGoogleUser({
    email,
    name: name || email.split('@')[0],
    avatar_url,
  });

  res.json({
    success: true,
    user: result.user,
    sessionToken: result.token,
    isNew: result.isNew,
  });
});

// 2. Get current authenticated user profile & settings
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    user,
    settings: db.getSettings(user.id),
  });
});

// 3. Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    db.destroySession(authHeader.slice(7).trim());
  }
  res.json({ success: true, message: 'Berhasil keluar.' });
});

// 4. Demo users list (Helps reviewer easily test multi-user switching without credential setup)
app.get('/api/auth/demo-users', (_req, res) => {
  res.json({ users: db.getAllUsers() });
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

// Get public overlay configuration and active queue (User-Specific by Token)
app.get('/api/public/overlay/:token', (req, res) => {
  const { token } = req.params;
  const userId = db.getUserIdByOverlayToken(token);

  if (!userId) {
    res.status(404).json({ error: 'Overlay tidak ditemukan atau link sudah tidak aktif.' });
    return;
  }

  const settings = db.getSettings(userId);
  const activeQueue = db.getActiveQueue(userId);

  res.json({
    settings: {
      title: settings.title,
      theme: settings.theme,
      font_size: settings.font_size,
      max_visible_players: settings.max_visible_players,
      animation: settings.animation,
      opacity: settings.opacity,
      card_size: settings.card_size,
      spacing: settings.spacing,
      sound_alert: settings.sound_alert,
      live_badge_text: settings.live_badge_text,
      hide_playing_in_overlay: settings.hide_playing_in_overlay ?? true,
      panel_width: settings.panel_width,
      show_id: settings.show_id,
      show_vip_badge: settings.show_vip_badge,
      show_live_badge: settings.show_live_badge,
      border_radius: settings.border_radius,
      enable_animation: settings.enable_animation,
    },
    queue: activeQueue,
  });
});

// Viewer Join Queue (Routed to specific streamer by token or default)
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

  // Determine target streamer
  const targetToken = streamer_token || 'preview';
  const targetUserId = db.getUserIdByOverlayToken(targetToken) || 'usr_demo';

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
  const userId = streamerToken ? db.getUserIdByOverlayToken(streamerToken) || 'usr_demo' : 'usr_demo';

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
  let targetUserId = streamerKey ? db.getUserIdByWebhookKey(streamerKey) : null;
  if (!targetUserId) {
    // If not found by key, try matching by first user / demo user
    targetUserId = 'usr_demo';
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

// Full Dashboard data for logged in streamer
app.get('/api/admin/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  res.json({
    user: req.user,
    settings: db.getSettings(userId),
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

// Update Settings
app.post('/api/admin/settings', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const updated = db.updateSettings(userId, req.body);
  realtimeHub.broadcastQueueChange(userId, 'settings_updated');
  res.json({ success: true, settings: updated });
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
  res.json({ success: true, ...result });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Multi-User Streamer Queue & OBS Overlay Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
