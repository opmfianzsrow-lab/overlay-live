import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db';
import { sociabuzzService } from './src/server/sociabuzz';
import { realtimeHub } from './src/server/realtime';

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
  if (entry.count >= 10) {
    return false;
  }
  entry.count++;
  return true;
}

// Admin Auth Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const pin = (req.headers['x-admin-pin'] as string) || req.query.admin_pin as string;
  if (!pin || !db.verifyPin(pin)) {
    res.status(401).json({ error: 'Akses ditolak: PIN Admin salah atau tidak ada.' });
    return;
  }
  next();
}

/* ==========================================================================
   PUBLIC API ROUTES
   ========================================================================== */

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Realtime SSE stream
app.get('/api/realtime', (req, res) => {
  const token = req.query.token as string | undefined;
  const pin = req.query.pin as string | undefined;
  const isAdmin = Boolean(pin && db.verifyPin(pin));
  const clientId = 'client-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

  realtimeHub.addClient(clientId, res, token, isAdmin);
});

// 3. Get public overlay configuration and active queue
app.get('/api/public/overlay/:token', (req, res) => {
  const { token } = req.params;
  const settings = db.getSettings();

  if (settings.streamer_token !== token && token !== 'preview') {
    res.status(404).json({ error: 'Overlay tidak ditemukan atau token tidak valid' });
    return;
  }

  const activeQueue = db.getActiveQueue();
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
    },
    queue: activeQueue,
  });
});

// 4. Viewer Join Queue
app.post('/api/public/join', (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit.' });
    return;
  }

  const { name, game_id, donation_id } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Nama player wajib diisi.' });
    return;
  }
  if (!game_id || typeof game_id !== 'string' || game_id.trim().length === 0) {
    res.status(400).json({ error: 'ID Game wajib diisi.' });
    return;
  }

  // Sanitize
  const cleanName = name.replace(/[<>&"']/g, '').trim().slice(0, 30);
  const cleanGameId = game_id.replace(/[<>&"']/g, '').trim().slice(0, 30);
  const cleanDonationId = donation_id ? String(donation_id).replace(/[<>&"']/g, '').trim().slice(0, 40) : undefined;

  const result = db.addPlayerToQueue({
    name: cleanName,
    game_id: cleanGameId,
    donation_id: cleanDonationId,
  });

  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  // Notify OBS and admin clients in real time!
  realtimeHub.broadcastQueueChange('viewer_join');

  res.json({
    success: true,
    message: result.message,
    queueItem: result.queueItem,
  });
});

// 5. Check queue status by player ID or game ID
app.get('/api/public/status/:id', (req, res) => {
  const { id } = req.params;
  const activeQueue = db.getActiveQueue();

  const found = activeQueue.find(
    (q) => q.player_id === id || q.player.game_id.toLowerCase() === id.toLowerCase()
  );

  if (!found) {
    res.status(404).json({ error: 'Player tidak ditemukan dalam antrian aktif' });
    return;
  }

  res.json({ item: found });
});

// 6. Sociabuzz Webhook Endpoint
app.post('/api/webhooks/sociabuzz', (req, res) => {
  const signature = req.headers['x-sociabuzz-signature'] as string | undefined;
  const rawBody = JSON.stringify(req.body);

  if (!sociabuzzService.verifySignature(rawBody, signature)) {
    res.status(403).json({ error: 'Invalid signature' });
    return;
  }

  const result = sociabuzzService.processWebhook(req.body, rawBody);
  if (!result.success && result.duplicate) {
    // Acknowledge Sociabuzz so they don't keep retrying
    res.status(200).json({ status: 'ignored_duplicate', message: result.error });
    return;
  }

  // Broadcast realtime update
  realtimeHub.broadcastQueueChange('sociabuzz_donation');

  res.status(200).json({
    status: 'success',
    donation: result.donation,
  });
});

/* ==========================================================================
   ADMIN API ROUTES
   ========================================================================== */

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || !db.verifyPin(pin)) {
    res.status(401).json({ error: 'PIN Admin tidak valid' });
    return;
  }
  res.json({ success: true, message: 'Autentikasi berhasil' });
});

// Full Dashboard data
app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  res.json({
    settings: db.getSettings(),
    queue: db.getActiveQueue(),
    donations: db.getDonations(),
    stats: db.getStats(),
    logs: db.getActivityLogs(20),
  });
});

// Next Match (Current -> DONE, Next -> PLAYING)
app.post('/api/admin/queue/next', requireAdmin, (_req, res) => {
  const result = db.nextMatch();
  realtimeHub.broadcastQueueChange('next_match');
  res.json({ success: true, ...result });
});

// Set specific to PLAYING
app.post('/api/admin/queue/play', requireAdmin, (req, res) => {
  const { queue_id } = req.body;
  const success = db.setPlaying(queue_id);
  if (success) {
    realtimeHub.broadcastQueueChange('player_playing');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Gagal mengatur player ke status PLAYING' });
  }
});

// Set specific to DONE
app.post('/api/admin/queue/done', requireAdmin, (req, res) => {
  const { queue_id } = req.body;
  const success = db.setDone(queue_id);
  if (success) {
    realtimeHub.broadcastQueueChange('player_done');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Gagal mengatur player ke status DONE' });
  }
});

// Skip player
app.post('/api/admin/queue/skip', requireAdmin, (req, res) => {
  const { queue_id } = req.body;
  const success = db.skipPlayer(queue_id);
  if (success) {
    realtimeHub.broadcastQueueChange('player_skipped');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Gagal men-skip player' });
  }
});

// Remove player
app.post('/api/admin/queue/remove', requireAdmin, (req, res) => {
  const targetId = req.body.queue_id || req.body.id || req.body.player_id;
  if (!targetId) {
    res.status(400).json({ error: 'ID queue atau player wajib disertakan' });
    return;
  }
  const success = db.removePlayer(targetId);
  if (success) {
    realtimeHub.broadcastQueueChange('player_removed');
    res.json({ success: true, message: 'Player berhasil dihapus dari antrian' });
  } else {
    res.status(400).json({ error: 'Gagal menghapus: Player tidak ditemukan dalam antrian' });
  }
});

// Edit player
app.post('/api/admin/queue/edit', requireAdmin, (req, res) => {
  const { player_id, name, game_id, membership } = req.body;
  const success = db.editPlayer(player_id, { name, game_id, membership });
  if (success) {
    realtimeHub.broadcastQueueChange('player_edited');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Player tidak ditemukan' });
  }
});

// Move position
app.post('/api/admin/queue/move', requireAdmin, (req, res) => {
  const { queue_id, direction } = req.body;
  const success = db.movePosition(queue_id, direction);
  if (success) {
    realtimeHub.broadcastQueueChange('queue_reordered');
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Gagal memindahkan posisi' });
  }
});

// Manual add player
app.post('/api/admin/queue/manual-add', requireAdmin, (req, res) => {
  const { name, game_id, membership } = req.body;
  const result = db.addPlayerToQueue({
    name,
    game_id,
    membership: membership || 'REGULAR',
  });
  if (result.success) {
    realtimeHub.broadcastQueueChange('player_manually_added');
    res.json({ success: true, item: result.queueItem });
  } else {
    res.status(400).json({ error: result.message });
  }
});

// Update Settings
app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const updated = db.updateSettings(req.body);
  realtimeHub.broadcastQueueChange('settings_updated');
  res.json({ success: true, settings: updated });
});

// Regenerate Token
app.post('/api/admin/settings/regenerate-token', requireAdmin, (_req, res) => {
  const newToken = db.regenerateStreamerToken();
  realtimeHub.broadcastQueueChange('token_regenerated');
  res.json({ success: true, token: newToken });
});

// Update PIN
app.post('/api/admin/settings/pin', requireAdmin, (req, res) => {
  const { new_pin } = req.body;
  if (!new_pin || new_pin.length < 4) {
    res.status(400).json({ error: 'PIN minimal 4 karakter' });
    return;
  }
  const success = db.updatePin(new_pin);
  if (success) {
    res.json({ success: true, message: 'PIN Admin berhasil diubah' });
  } else {
    res.status(400).json({ error: 'Gagal mengubah PIN' });
  }
});

// Simulate Sociabuzz Donation (Admin testing feature)
app.post('/api/admin/simulate-donation', requireAdmin, (req, res) => {
  const { donor_name, amount, message } = req.body;
  const testId = 'SB-TEST-' + Math.floor(100000 + Math.random() * 900000);

  const result = sociabuzzService.processWebhook({
    id: testId,
    donor_name: donor_name || 'Budi Gaming',
    amount: amount || 25000,
    message: message || 'Gaskeun 1v1 bang!',
    created_at: new Date().toISOString(),
  });

  realtimeHub.broadcastQueueChange('simulated_donation');
  res.json({ success: true, donation: result.donation });
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
    console.log(`🚀 Streamer Queue & OBS Overlay Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
