import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  Player,
  QueueItem,
  Donation,
  OverlaySettings,
  WebhookEvent,
  ActivityLog,
  QueueStats,
  MembershipType,
  UserProfile,
  OverlayToken,
} from '../types/queue.ts';

export interface DatabaseSchema {
  users: UserProfile[];
  overlay_tokens: OverlayToken[];
  settings: Record<string, OverlaySettings>; // key: user_id
  players: (Player & { user_id: string })[];
  queue: (Omit<QueueItem, 'player' | 'donation'> & { user_id: string })[];
  donations: (Donation & { user_id: string })[];
  webhook_events: (WebhookEvent & { user_id: string })[];
  activity_logs: (ActivityLog & { user_id: string })[];
  sessions: Record<string, { user_id: string; expires_at: number }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

function generateToken(length = 12): string {
  return crypto.randomBytes(length).toString('base64url').replace(/[-_]/g, 'x').slice(0, length);
}

function getDefaultInitialData(): DatabaseSchema {
  const now = new Date().toISOString();
  const demoUserId = 'usr_demo';
  const demoToken = '1v1_' + generateToken(8);
  const demoWebhookKey = 'sb_wh_' + generateToken(10);
  const demoWebhookSecret = 'sb_sec_' + generateToken(16);

  const demoUser: UserProfile = {
    id: demoUserId,
    email: 'hfiz22379@gmail.com',
    name: 'Streamer Pro Demo',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=streamer',
    created_at: now,
  };

  const initialPlayers: (Player & { user_id: string })[] = [
    {
      id: 'p-1',
      user_id: demoUserId,
      name: 'GALANG',
      game_id: '12933886421',
      membership: 'VVIP',
      status: 'PLAYING',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-2',
      user_id: demoUserId,
      name: 'PENGUSAHA',
      game_id: '17456782197',
      membership: 'VVIP',
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-3',
      user_id: demoUserId,
      name: 'JOKO W',
      game_id: '1849448577',
      membership: 'VIP',
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-4',
      user_id: demoUserId,
      name: 'LIONEL',
      game_id: '8766413615',
      membership: 'VIP',
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-5',
      user_id: demoUserId,
      name: 'RIZKY PRO',
      game_id: '9928374112',
      membership: 'REGULAR',
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    },
  ];

  const initialQueue = [
    { id: 'q-1', user_id: demoUserId, player_id: 'p-1', position: 1, status: 'PLAYING' as const, joined_at: now },
    { id: 'q-2', user_id: demoUserId, player_id: 'p-2', position: 2, status: 'QUEUED' as const, joined_at: now },
    { id: 'q-3', user_id: demoUserId, player_id: 'p-3', position: 3, status: 'QUEUED' as const, joined_at: now },
    { id: 'q-4', user_id: demoUserId, player_id: 'p-4', position: 4, status: 'QUEUED' as const, joined_at: now },
    { id: 'q-5', user_id: demoUserId, player_id: 'p-5', position: 5, status: 'QUEUED' as const, joined_at: now },
  ];

  const initialDonations: (Donation & { user_id: string })[] = [
    {
      id: 'don-1',
      user_id: demoUserId,
      external_donation_id: 'SB-882910',
      donor_name: 'GALANG',
      amount: 50000,
      message: '1v1 bang, pake hero andalan!',
      status: 'CLAIMED',
      claimed_by_player_id: 'p-1',
      claimed_at: now,
      created_at: now,
    },
    {
      id: 'don-2',
      user_id: demoUserId,
      external_donation_id: 'SB-882911',
      donor_name: 'PENGUSAHA',
      amount: 50000,
      message: 'Spesial VVIP slot',
      status: 'CLAIMED',
      claimed_by_player_id: 'p-2',
      claimed_at: now,
      created_at: now,
    },
    {
      id: 'don-3',
      user_id: demoUserId,
      external_donation_id: 'SB-882912',
      donor_name: 'JOKO W',
      amount: 25000,
      message: 'Salam 1v1 gaskeun',
      status: 'CLAIMED',
      claimed_by_player_id: 'p-3',
      claimed_at: now,
      created_at: now,
    },
    {
      id: 'don-4',
      user_id: demoUserId,
      external_donation_id: 'SB-882913',
      donor_name: 'LIONEL',
      amount: 25000,
      message: 'Gas main sama streamer',
      status: 'CLAIMED',
      claimed_by_player_id: 'p-4',
      claimed_at: now,
      created_at: now,
    },
  ];

  const initialLogs: (ActivityLog & { user_id: string })[] = [
    { id: 'log-1', user_id: demoUserId, text: 'GALANG sedang bermain (LIVE)', type: 'play', timestamp: now },
    { id: 'log-2', user_id: demoUserId, text: 'PENGUSAHA bergabung ke antrian #2 (VVIP)', type: 'join', timestamp: now },
    { id: 'log-3', user_id: demoUserId, text: 'JOKO W bergabung ke antrian #3 (VIP)', type: 'join', timestamp: now },
    { id: 'log-4', user_id: demoUserId, text: 'Donasi masuk dari GALANG sebesar Rp 50.000', type: 'donation', timestamp: now },
  ];

  const demoSettings: OverlaySettings = {
    id: 'settings_' + demoUserId,
    user_id: demoUserId,
    streamer_token: demoToken,
    webhook_key: demoWebhookKey,
    webhook_secret: demoWebhookSecret,
    title: 'ANTRIAN BY1',
    theme: 'obsidian',
    font_size: 'medium',
    max_visible_players: 5,
    animation: 'smooth',
    opacity: 96,
    card_size: 'normal',
    spacing: 8,
    sociabuzz_url: 'https://sociabuzz.com/streamerkeren',
    min_donation: 10000,
    vip_min_donation: 25000,
    vvip_min_donation: 50000,
    max_queue_limit: 50,
    sound_alert: true,
    allow_free_queue: false,
    live_badge_text: 'LIVE',
    hide_playing_in_overlay: false,
    dashboard_ui_theme: 'neobrutalism',
    panel_width: 440,
    show_id: true,
    show_vip_badge: true,
    show_live_badge: true,
    border_radius: 22,
    enable_animation: true,
    animation_speed: 'normal',
    created_at: now,
    updated_at: now,
  };

  return {
    users: [demoUser],
    overlay_tokens: [
      {
        id: 'tok_demo',
        user_id: demoUserId,
        token: demoToken,
        created_at: now,
      },
    ],
    settings: {
      [demoUserId]: demoSettings,
    },
    players: initialPlayers,
    queue: initialQueue,
    donations: initialDonations,
    webhook_events: [],
    activity_logs: initialLogs,
    sessions: {},
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        
        // Multi-user migration check: if old single-user schema exists
        if (!raw.users || !Array.isArray(raw.users)) {
          console.log('[Database] Migrating legacy single-user data to multi-user schema...');
          const migrated = getDefaultInitialData();
          if (raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings)) {
            const demoUserId = 'usr_demo';
            migrated.settings[demoUserId] = {
              ...migrated.settings[demoUserId],
              ...raw.settings,
              user_id: demoUserId,
            };
            const token = raw.settings.streamer_token || migrated.settings[demoUserId].streamer_token;
            migrated.overlay_tokens[0].token = token;
          }
          this.saveData(migrated);
          return migrated;
        }

        // Ensure sessions and default users exist
        if (!raw.sessions) raw.sessions = {};
        if (!raw.overlay_tokens) raw.overlay_tokens = [];
        return raw;
      }
    } catch (e) {
      console.error('Failed to load db.json, initializing fresh default', e);
    }

    const defaultData = getDefaultInitialData();
    this.saveData(defaultData);
    return defaultData;
  }

  private saveData(dataToSave: DatabaseSchema = this.data): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json', err);
    }
  }

  /* ==========================================================================
     USER & AUTH MANAGEMENT
     ========================================================================== */
  
  public getAllUsers(): UserProfile[] {
    return this.data.users;
  }

  public getUser(userId: string): UserProfile | null {
    return this.data.users.find((u) => u.id === userId) || null;
  }

  public getUserByEmail(email: string): UserProfile | null {
    const cleanEmail = email.toLowerCase().trim();
    return this.data.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  }

  public findOrCreateGoogleUser(params: {
    email: string;
    name: string;
    avatar_url?: string;
  }): { user: UserProfile; token: string; isNew: boolean } {
    const cleanEmail = params.email.toLowerCase().trim();
    let existing = this.getUserByEmail(cleanEmail);
    const now = new Date().toISOString();

    if (existing) {
      // Update name/avatar if provided
      existing.name = params.name || existing.name;
      if (params.avatar_url) existing.avatar_url = params.avatar_url;
      this.saveData();

      // Ensure user has settings and overlay token
      this.ensureUserSettings(existing.id);
      const sessionToken = this.createSession(existing.id);
      return { user: existing, token: sessionToken, isNew: false };
    }

    // Create new user profile
    const newUserId = 'usr_' + crypto.randomUUID().slice(0, 8);
    const newUser: UserProfile = {
      id: newUserId,
      email: cleanEmail,
      name: params.name || cleanEmail.split('@')[0],
      avatar_url: params.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${newUserId}`,
      created_at: now,
    };

    this.data.users.push(newUser);

    // Initialize user overlay token & settings
    const streamerToken = '1v1_' + generateToken(8);
    const webhookKey = 'sb_wh_' + generateToken(10);
    const webhookSecret = 'sb_sec_' + generateToken(16);

    this.data.overlay_tokens.push({
      id: 'tok_' + crypto.randomUUID().slice(0, 8),
      user_id: newUserId,
      token: streamerToken,
      created_at: now,
    });

    this.data.settings[newUserId] = {
      id: 'settings_' + newUserId,
      user_id: newUserId,
      streamer_token: streamerToken,
      webhook_key: webhookKey,
      webhook_secret: webhookSecret,
      title: 'ANTRIAN BY1',
      theme: 'obsidian',
      font_size: 'medium',
      max_visible_players: 5,
      animation: 'smooth',
      opacity: 96,
      card_size: 'normal',
      spacing: 8,
      sociabuzz_url: `https://sociabuzz.com/${cleanEmail.split('@')[0]}`,
      min_donation: 10000,
      vip_min_donation: 25000,
      vvip_min_donation: 50000,
      max_queue_limit: 50,
      sound_alert: true,
      allow_free_queue: false,
      live_badge_text: 'LIVE',
      hide_playing_in_overlay: false,
      dashboard_ui_theme: 'neobrutalism',
      panel_width: 440,
      show_id: true,
      show_vip_badge: true,
      show_live_badge: true,
      border_radius: 22,
      enable_animation: true,
      animation_speed: 'normal',
      created_at: now,
      updated_at: now,
    };

    this.logActivity(newUserId, `Akun streamer baru berhasil didaftarkan via Google (${cleanEmail})`, 'edit');
    this.saveData();

    const sessionToken = this.createSession(newUserId);
    return { user: newUser, token: sessionToken, isNew: true };
  }

  public createSession(userId: string): string {
    const sessionToken = 'sess_' + crypto.randomBytes(24).toString('base64url');
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    this.data.sessions[sessionToken] = { user_id: userId, expires_at: expiresAt };
    this.saveData();
    return sessionToken;
  }

  public getUserBySession(sessionToken: string): UserProfile | null {
    if (!sessionToken) return null;
    const session = this.data.sessions[sessionToken];
    if (!session) return null;
    if (session.expires_at < Date.now()) {
      delete this.data.sessions[sessionToken];
      this.saveData();
      return null;
    }
    return this.getUser(session.user_id);
  }

  public destroySession(sessionToken: string): void {
    if (this.data.sessions[sessionToken]) {
      delete this.data.sessions[sessionToken];
      this.saveData();
    }
  }

  /* ==========================================================================
     TOKEN & ROUTING LOOKUP
     ========================================================================== */

  public getUserIdByOverlayToken(token: string): string | null {
    if (!token) return null;
    if (token === 'preview') {
      return this.data.users[0]?.id || 'usr_demo';
    }

    // Direct match in overlay_tokens
    const foundToken = this.data.overlay_tokens.find(
      (t) => t.token === token && !t.revoked_at
    );
    if (foundToken) return foundToken.user_id;

    // Direct match in user settings
    for (const [userId, settings] of Object.entries(this.data.settings)) {
      if (settings.streamer_token === token) return userId;
    }

    return null;
  }

  public getUserIdByWebhookKey(keyOrToken: string): string | null {
    if (!keyOrToken) return null;
    for (const [userId, settings] of Object.entries(this.data.settings)) {
      if (
        settings.webhook_key === keyOrToken ||
        settings.streamer_token === keyOrToken ||
        settings.webhook_secret === keyOrToken
      ) {
        return userId;
      }
    }
    return null;
  }

  public regenerateStreamerToken(userId: string): string {
    const newToken = '1v1_' + generateToken(8);
    const now = new Date().toISOString();

    // Revoke old tokens
    this.data.overlay_tokens.forEach((t) => {
      if (t.user_id === userId) {
        t.revoked_at = now;
      }
    });

    // Create new token
    this.data.overlay_tokens.push({
      id: 'tok_' + crypto.randomUUID().slice(0, 8),
      user_id: userId,
      token: newToken,
      created_at: now,
    });

    this.ensureUserSettings(userId);
    this.data.settings[userId].streamer_token = newToken;
    this.data.settings[userId].updated_at = now;
    this.saveData();

    this.logActivity(userId, `Token link OBS Overlay diperbarui menjadi ${newToken}`, 'edit');
    return newToken;
  }

  /* ==========================================================================
     SETTINGS MANAGEMENT (PER USER)
     ========================================================================== */

  private ensureUserSettings(userId: string): OverlaySettings {
    if (!this.data.settings[userId]) {
      const now = new Date().toISOString();
      const token = '1v1_' + generateToken(8);
      const webhookKey = 'sb_wh_' + generateToken(10);
      const webhookSecret = 'sb_sec_' + generateToken(16);

      this.data.settings[userId] = {
        id: 'settings_' + userId,
        user_id: userId,
        streamer_token: token,
        webhook_key: webhookKey,
        webhook_secret: webhookSecret,
        title: 'ANTRIAN BY1',
        theme: 'obsidian',
        font_size: 'medium',
        max_visible_players: 5,
        animation: 'smooth',
        opacity: 96,
        card_size: 'normal',
        spacing: 8,
        sociabuzz_url: 'https://sociabuzz.com',
        min_donation: 10000,
        vip_min_donation: 25000,
        vvip_min_donation: 50000,
        max_queue_limit: 50,
        sound_alert: true,
        allow_free_queue: false,
        live_badge_text: 'LIVE',
        hide_playing_in_overlay: false,
        dashboard_ui_theme: 'neobrutalism',
        panel_width: 440,
        show_id: true,
        show_vip_badge: true,
        show_live_badge: true,
        border_radius: 22,
        enable_animation: true,
        animation_speed: 'normal',
        created_at: now,
        updated_at: now,
      };

      this.data.overlay_tokens.push({
        id: 'tok_' + crypto.randomUUID().slice(0, 8),
        user_id: userId,
        token: token,
        created_at: now,
      });

      this.saveData();
    }
    return this.data.settings[userId];
  }

  public getSettings(userId: string): OverlaySettings {
    return this.ensureUserSettings(userId);
  }

  public updateSettings(userId: string, updates: Partial<OverlaySettings>): OverlaySettings {
    this.ensureUserSettings(userId);
    this.data.settings[userId] = {
      ...this.data.settings[userId],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveData();
    return this.data.settings[userId];
  }

  /* ==========================================================================
     ACTIVITY LOGS (PER USER)
     ========================================================================== */

  public logActivity(userId: string, text: string, type: ActivityLog['type']): void {
    const newLog: ActivityLog & { user_id: string } = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      user_id: userId,
      text,
      type,
      timestamp: new Date().toISOString(),
    };
    this.data.activity_logs.unshift(newLog);

    // Keep max 100 logs per user
    const userLogs = this.data.activity_logs.filter((l) => l.user_id === userId);
    if (userLogs.length > 100) {
      const logsToKeep = userLogs.slice(0, 100);
      const otherLogs = this.data.activity_logs.filter((l) => l.user_id !== userId);
      this.data.activity_logs = [...logsToKeep, ...otherLogs];
    }
    this.saveData();
  }

  public getActivityLogs(userId: string, limit = 20): ActivityLog[] {
    return this.data.activity_logs
      .filter((l) => l.user_id === userId)
      .slice(0, limit);
  }

  /* ==========================================================================
     QUEUE & PLAYERS (PER USER)
     ========================================================================== */

  public getActiveQueue(userId: string): QueueItem[] {
    const userQueue = this.data.queue.filter((q) => q.user_id === userId);

    const playing = userQueue
      .filter((q) => q.status === 'PLAYING')
      .map((q) => this.hydrateQueueItem(userId, q));

    const queued = userQueue
      .filter((q) => q.status === 'QUEUED')
      .sort((a, b) => a.position - b.position)
      .map((q) => this.hydrateQueueItem(userId, q));

    return [...playing, ...queued];
  }

  public getAllQueue(userId: string): QueueItem[] {
    return this.data.queue
      .filter((q) => q.user_id === userId)
      .map((q) => this.hydrateQueueItem(userId, q));
  }

  private hydrateQueueItem(
    userId: string,
    q: Omit<QueueItem, 'player' | 'donation'> & { user_id: string }
  ): QueueItem {
    const player = this.data.players.find(
      (p) => p.user_id === userId && p.id === q.player_id
    ) || {
      id: q.player_id,
      name: 'Unknown',
      game_id: '-',
      membership: 'REGULAR',
      status: q.status,
      created_at: q.joined_at,
      updated_at: q.joined_at,
    };

    const donation = this.data.donations.find(
      (d) => d.user_id === userId && d.claimed_by_player_id === q.player_id
    );

    return {
      ...q,
      player,
      donation,
    };
  }

  private reindexQueuePositions(userId: string): void {
    const userQueue = this.data.queue.filter((q) => q.user_id === userId);
    const playing = userQueue.find((q) => q.status === 'PLAYING');
    if (playing) {
      playing.position = 1;
    }

    const queuedItems = userQueue
      .filter((q) => q.status === 'QUEUED')
      .sort((a, b) => a.position - b.position);

    let startPos = playing ? 2 : 1;
    for (const item of queuedItems) {
      item.position = startPos++;
    }
  }

  public addPlayerToQueue(
    userId: string,
    params: {
      name: string;
      game_id: string;
      membership?: MembershipType;
      donation_id?: string;
    }
  ): { success: boolean; message: string; queueItem?: QueueItem } {
    const settings = this.getSettings(userId);
    const activeQueue = this.getActiveQueue(userId);

    if (activeQueue.length >= settings.max_queue_limit) {
      return { success: false, message: 'Antrian sudah penuh! Silakan coba lagi nanti.' };
    }

    // Check duplicate active game_id for this user
    const duplicate = activeQueue.find(
      (item) => item.player.game_id.toLowerCase() === params.game_id.toLowerCase().trim()
    );
    if (duplicate) {
      return {
        success: false,
        message: `ID Game ${params.game_id} sudah ada dalam antrian aktif (Posisi #${duplicate.position})!`,
      };
    }

    let membership: MembershipType = params.membership || 'REGULAR';
    let matchedDonation: Donation | undefined;

    // Check donation if provided
    if (params.donation_id) {
      const trimmedDonationId = params.donation_id.trim();
      const don = this.data.donations.find(
        (d) =>
          d.user_id === userId &&
          (d.id === trimmedDonationId ||
            d.external_donation_id.toLowerCase() === trimmedDonationId.toLowerCase()) &&
          d.status === 'UNCLAIMED'
      );

      if (don) {
        matchedDonation = don;
        if (don.amount >= settings.vvip_min_donation) {
          membership = 'VVIP';
        } else if (don.amount >= settings.vip_min_donation) {
          membership = 'VIP';
        }
      } else if (!settings.allow_free_queue && !params.membership) {
        return {
          success: false,
          message: 'Kode/ID Donasi tidak valid atau sudah pernah digunakan!',
        };
      }
    } else if (!settings.allow_free_queue && !params.membership) {
      return {
        success: false,
        message: 'Kode Donasi wajib diisi untuk bergabung antrian.',
      };
    }

    const now = new Date().toISOString();
    const playerId = 'p-' + crypto.randomUUID().slice(0, 8);
    const newPlayer: Player & { user_id: string } = {
      id: playerId,
      user_id: userId,
      name: params.name.trim(),
      game_id: params.game_id.trim(),
      membership,
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    };

    this.data.players.push(newPlayer);

    const currentMaxPosition = activeQueue.reduce((max, q) => Math.max(max, q.position), 0);
    const queueId = 'q-' + crypto.randomUUID().slice(0, 8);
    const newQueueItem = {
      id: queueId,
      user_id: userId,
      player_id: playerId,
      position: currentMaxPosition + 1,
      status: 'QUEUED' as const,
      joined_at: now,
    };

    // Priority insertion for VIP/VVIP
    if (membership === 'VVIP' || membership === 'VIP') {
      const queuedList = this.data.queue.filter(
        (q) => q.user_id === userId && q.status === 'QUEUED'
      );
      let insertIndex = queuedList.length;

      for (let i = 0; i < queuedList.length; i++) {
        const qp = this.data.players.find(
          (p) => p.user_id === userId && p.id === queuedList[i].player_id
        );
        if (!qp) continue;

        if (membership === 'VVIP') {
          if (qp.membership !== 'VVIP') {
            insertIndex = i;
            break;
          }
        } else if (membership === 'VIP') {
          if (qp.membership === 'REGULAR') {
            insertIndex = i;
            break;
          }
        }
      }

      if (insertIndex < queuedList.length) {
        const targetPos = queuedList[insertIndex].position;
        newQueueItem.position = targetPos;
        for (let i = insertIndex; i < queuedList.length; i++) {
          queuedList[i].position += 1;
        }
      }
    }

    this.data.queue.push(newQueueItem);
    this.reindexQueuePositions(userId);

    if (matchedDonation) {
      matchedDonation.status = 'CLAIMED';
      matchedDonation.claimed_by_player_id = playerId;
      matchedDonation.claimed_at = now;
    }

    this.saveData();
    this.logActivity(
      userId,
      `${newPlayer.name} (${newPlayer.game_id}) masuk antrian #${newQueueItem.position} [${membership}]`,
      'join'
    );

    return {
      success: true,
      message: 'Berhasil masuk antrian!',
      queueItem: this.hydrateQueueItem(userId, newQueueItem),
    };
  }

  public nextMatch(userId: string): { currentDone: Player | null; newPlaying: Player | null } {
    const now = new Date().toISOString();
    const userQueue = this.data.queue.filter((q) => q.user_id === userId);

    // 1. Current playing -> DONE
    const currentPlayingQueue = userQueue.find((q) => q.status === 'PLAYING');
    let donePlayer: Player | null = null;
    if (currentPlayingQueue) {
      currentPlayingQueue.status = 'DONE';
      const p = this.data.players.find(
        (pl) => pl.user_id === userId && pl.id === currentPlayingQueue.player_id
      );
      if (p) {
        p.status = 'DONE';
        p.updated_at = now;
        donePlayer = p;
      }
    }

    // 2. Next queued -> PLAYING
    const queuedItems = userQueue
      .filter((q) => q.status === 'QUEUED')
      .sort((a, b) => a.position - b.position);

    let nextPlayer: Player | null = null;
    if (queuedItems.length > 0) {
      const nextQueue = queuedItems[0];
      nextQueue.status = 'PLAYING';
      nextQueue.position = 1;
      const p = this.data.players.find(
        (pl) => pl.user_id === userId && pl.id === nextQueue.player_id
      );
      if (p) {
        p.status = 'PLAYING';
        p.updated_at = now;
        nextPlayer = p;
      }
    }

    this.reindexQueuePositions(userId);
    this.saveData();

    if (donePlayer) {
      this.logActivity(userId, `${donePlayer.name} selesai bermain (DONE)`, 'done');
    }
    if (nextPlayer) {
      this.logActivity(userId, `${nextPlayer.name} sekarang bermain (LIVE)`, 'play');
    }

    return { currentDone: donePlayer, newPlaying: nextPlayer };
  }

  public setPlaying(userId: string, queueId: string): boolean {
    const target = this.data.queue.find((q) => q.user_id === userId && q.id === queueId);
    if (!target) return false;

    // Previous playing to DONE
    const currentPlaying = this.data.queue.find(
      (q) => q.user_id === userId && q.status === 'PLAYING' && q.id !== queueId
    );
    if (currentPlaying) {
      currentPlaying.status = 'DONE';
      const prevPlayer = this.data.players.find(
        (p) => p.user_id === userId && p.id === currentPlaying.player_id
      );
      if (prevPlayer) prevPlayer.status = 'DONE';
    }

    target.status = 'PLAYING';
    const player = this.data.players.find(
      (p) => p.user_id === userId && p.id === target.player_id
    );
    if (player) {
      player.status = 'PLAYING';
      this.logActivity(userId, `${player.name} diset sebagai sedang bermain (LIVE)`, 'play');
    }

    this.reindexQueuePositions(userId);
    this.saveData();
    return true;
  }

  public setDone(userId: string, queueId: string): boolean {
    const target = this.data.queue.find((q) => q.user_id === userId && q.id === queueId);
    if (!target) return false;

    target.status = 'DONE';
    const player = this.data.players.find(
      (p) => p.user_id === userId && p.id === target.player_id
    );
    if (player) {
      player.status = 'DONE';
      this.logActivity(userId, `${player.name} selesai bermain (DONE)`, 'done');
    }

    this.reindexQueuePositions(userId);
    this.saveData();
    return true;
  }

  public skipPlayer(userId: string, queueId: string): boolean {
    const target = this.data.queue.find((q) => q.user_id === userId && q.id === queueId);
    if (!target) return false;

    target.status = 'SKIPPED';
    const player = this.data.players.find(
      (p) => p.user_id === userId && p.id === target.player_id
    );
    if (player) {
      player.status = 'SKIPPED';
      this.logActivity(userId, `${player.name} di-skip dari antrian`, 'skip');
    }

    this.reindexQueuePositions(userId);
    this.saveData();
    return true;
  }

  public removePlayer(userId: string, targetId: string): boolean {
    const cleanId = String(targetId || '').trim();
    if (!cleanId) return false;

    let index = this.data.queue.findIndex(
      (q) => q.user_id === userId && (q.id === cleanId || q.player_id === cleanId)
    );

    if (index === -1) {
      const pl = this.data.players.find(
        (p) => p.user_id === userId && (p.id === cleanId || p.game_id.toLowerCase() === cleanId.toLowerCase())
      );
      if (pl) {
        index = this.data.queue.findIndex((q) => q.user_id === userId && q.player_id === pl.id);
      }
    }

    if (index === -1) return false;

    const [removed] = this.data.queue.splice(index, 1);
    const player = this.data.players.find(
      (p) => p.user_id === userId && p.id === removed.player_id
    );
    if (player) {
      player.status = 'CANCELLED';
      player.updated_at = new Date().toISOString();
      this.logActivity(userId, `${player.name} dihapus dari antrian`, 'skip');
    }

    this.reindexQueuePositions(userId);
    this.saveData();
    return true;
  }

  public editPlayer(
    userId: string,
    playerId: string,
    updates: { name?: string; game_id?: string; membership?: MembershipType }
  ): boolean {
    const player = this.data.players.find(
      (p) => p.user_id === userId && p.id === playerId
    );
    if (!player) return false;

    if (updates.name) player.name = updates.name.trim();
    if (updates.game_id) player.game_id = updates.game_id.trim();
    if (updates.membership) player.membership = updates.membership;
    player.updated_at = new Date().toISOString();

    this.logActivity(userId, `Data player ${player.name} berhasil diperbarui`, 'edit');
    this.saveData();
    return true;
  }

  public movePosition(userId: string, queueId: string, direction: 'up' | 'down'): boolean {
    const queuedItems = this.data.queue
      .filter((q) => q.user_id === userId && q.status === 'QUEUED')
      .sort((a, b) => a.position - b.position);

    const index = queuedItems.findIndex((q) => q.id === queueId);
    if (index === -1) return false;

    if (direction === 'up' && index > 0) {
      const temp = queuedItems[index].position;
      queuedItems[index].position = queuedItems[index - 1].position;
      queuedItems[index - 1].position = temp;
      this.reindexQueuePositions(userId);
      this.saveData();
      this.logActivity(userId, 'Posisi antrian digeser ke atas', 'reorder');
      return true;
    } else if (direction === 'down' && index < queuedItems.length - 1) {
      const temp = queuedItems[index].position;
      queuedItems[index].position = queuedItems[index + 1].position;
      queuedItems[index + 1].position = temp;
      this.reindexQueuePositions(userId);
      this.saveData();
      this.logActivity(userId, 'Posisi antrian digeser ke bawah', 'reorder');
      return true;
    }

    return false;
  }

  /* ==========================================================================
     DONATIONS (PER USER)
     ========================================================================== */

  public getDonations(userId: string): Donation[] {
    return this.data.donations
      .filter((d) => d.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addDonation(
    userId: string,
    params: {
      external_donation_id: string;
      donor_name: string;
      amount: number;
      message: string;
    }
  ): { success: boolean; donation?: Donation; duplicate?: boolean } {
    // Unique check per user
    const existing = this.data.donations.find(
      (d) => d.user_id === userId && d.external_donation_id === params.external_donation_id
    );
    if (existing) {
      return { success: false, duplicate: true, donation: existing };
    }

    const now = new Date().toISOString();
    const newDonation: Donation & { user_id: string } = {
      id: 'don-' + crypto.randomUUID().slice(0, 8),
      user_id: userId,
      external_donation_id: params.external_donation_id,
      donor_name: params.donor_name,
      amount: Number(params.amount) || 0,
      message: params.message || '',
      status: 'UNCLAIMED',
      created_at: now,
    };

    this.data.donations.unshift(newDonation);
    this.logActivity(
      userId,
      `Donasi Sociabuzz masuk: ${newDonation.donor_name} (Rp ${newDonation.amount.toLocaleString(
        'id-ID'
      )}) [${newDonation.external_donation_id}]`,
      'donation'
    );

    this.saveData();
    return { success: true, donation: newDonation };
  }

  /* ==========================================================================
     WEBHOOK EVENT LOGS (PER USER)
     ========================================================================== */

  public saveWebhookEvent(
    userId: string,
    params: {
      provider: 'sociabuzz';
      external_event_id: string;
      payload: Record<string, unknown>;
      error?: string;
    }
  ): WebhookEvent {
    const newEvent: WebhookEvent & { user_id: string } = {
      id: 'wh-' + crypto.randomUUID().slice(0, 8),
      user_id: userId,
      provider: params.provider,
      external_event_id: params.external_event_id,
      payload: params.payload,
      processed: !params.error,
      error: params.error,
      created_at: new Date().toISOString(),
    };

    this.data.webhook_events.unshift(newEvent);

    // Limit to 50 logs per user
    const userEvents = this.data.webhook_events.filter((e) => e.user_id === userId);
    if (userEvents.length > 50) {
      const kept = userEvents.slice(0, 50);
      const others = this.data.webhook_events.filter((e) => e.user_id !== userId);
      this.data.webhook_events = [...kept, ...others];
    }

    this.saveData();
    return newEvent;
  }

  public getWebhookEvents(userId: string, limit = 30): WebhookEvent[] {
    return this.data.webhook_events
      .filter((w) => w.user_id === userId)
      .slice(0, limit);
  }

  /* ==========================================================================
     STATISTICS (PER USER)
     ========================================================================== */

  public getStats(userId: string): QueueStats {
    const active = this.getActiveQueue(userId);
    const playing = active.find((q) => q.status === 'PLAYING') || null;
    const queued = active.filter((q) => q.status === 'QUEUED');
    const next = queued.length > 0 ? queued[0] : null;

    const today = new Date().toDateString();
    const totalDonationsToday = this.data.donations
      .filter((d) => d.user_id === userId && new Date(d.created_at).toDateString() === today)
      .reduce((sum, d) => sum + d.amount, 0);

    const doneToday = this.data.players.filter(
      (p) =>
        p.user_id === userId &&
        p.status === 'DONE' &&
        new Date(p.updated_at).toDateString() === today
    ).length;

    return {
      total_queued: queued.length,
      currently_playing: playing,
      done_today: doneToday,
      total_donations_today: totalDonationsToday,
      next_player: next,
    };
  }
}

export const db = new Database();
