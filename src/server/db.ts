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
} from '../types/queue';

interface DatabaseSchema {
  settings: OverlaySettings;
  players: Player[];
  queue: Omit<QueueItem, 'player' | 'donation'>[];
  donations: Donation[];
  webhook_events: WebhookEvent[];
  activity_logs: ActivityLog[];
  admin_pin: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

function generateToken(length = 12): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

function getDefaultInitialData(): DatabaseSchema {
  const now = new Date().toISOString();
  const token = '1v1_' + generateToken(8);

  const initialPlayers: Player[] = [
    {
      id: 'p-1',
      name: 'GALANG',
      game_id: '12933886421',
      membership: 'VVIP',
      status: 'PLAYING',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-2',
      name: 'PENGUSAHA',
      game_id: '17456782197',
      membership: 'VVIP',
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-3',
      name: 'JOKO W',
      game_id: '1849448577',
      membership: 'VIP',
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-4',
      name: 'LIONEL',
      game_id: '8766413615',
      membership: 'VIP',
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'p-5',
      name: 'RIZKY PRO',
      game_id: '9928374112',
      membership: 'REGULAR',
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    },
  ];

  const initialQueue = [
    { id: 'q-1', player_id: 'p-1', position: 1, status: 'PLAYING' as const, joined_at: now },
    { id: 'q-2', player_id: 'p-2', position: 2, status: 'QUEUED' as const, joined_at: now },
    { id: 'q-3', player_id: 'p-3', position: 3, status: 'QUEUED' as const, joined_at: now },
    { id: 'q-4', player_id: 'p-4', position: 4, status: 'QUEUED' as const, joined_at: now },
    { id: 'q-5', player_id: 'p-5', position: 5, status: 'QUEUED' as const, joined_at: now },
  ];

  const initialDonations: Donation[] = [
    {
      id: 'don-1',
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

  const initialLogs: ActivityLog[] = [
    { id: 'log-1', text: 'GALANG sedang bermain (LIVE)', type: 'play', timestamp: now },
    { id: 'log-2', text: 'PENGUSAHA bergabung ke antrian #2 (VVIP)', type: 'join', timestamp: now },
    { id: 'log-3', text: 'JOKO W bergabung ke antrian #3 (VIP)', type: 'join', timestamp: now },
    { id: 'log-4', text: 'Donasi masuk dari GALANG sebesar Rp 50.000', type: 'donation', timestamp: now },
  ];

  return {
    settings: {
      id: 'settings_main',
      streamer_token: token,
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
      hide_playing_in_overlay: true,
      dashboard_ui_theme: 'neobrutalism',
      created_at: now,
      updated_at: now,
    },
    players: initialPlayers,
    queue: initialQueue,
    donations: initialDonations,
    webhook_events: [],
    activity_logs: initialLogs,
    admin_pin: 'streamer123',
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
    if (this.data.settings.hide_playing_in_overlay === undefined) {
      this.data.settings.hide_playing_in_overlay = true;
      this.saveData();
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
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

  // Settings
  public getSettings(): OverlaySettings {
    return { ...this.data.settings };
  }

  public updateSettings(updates: Partial<OverlaySettings>): OverlaySettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveData();
    return this.data.settings;
  }

  public regenerateStreamerToken(): string {
    const newToken = '1v1_' + generateToken(10);
    this.data.settings.streamer_token = newToken;
    this.data.settings.updated_at = new Date().toISOString();
    this.saveData();
    this.logActivity(`Token overlay OBS diperbarui menjadi ${newToken}`, 'edit');
    return newToken;
  }

  // Admin Auth
  public verifyPin(pin: string): boolean {
    return this.data.admin_pin === pin;
  }

  public updatePin(newPin: string): boolean {
    if (!newPin || newPin.length < 4) return false;
    this.data.admin_pin = newPin;
    this.saveData();
    return true;
  }

  // Activity logs
  public logActivity(text: string, type: ActivityLog['type']): void {
    const newLog: ActivityLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      text,
      type,
      timestamp: new Date().toISOString(),
    };
    this.data.activity_logs.unshift(newLog);
    // keep max 100 logs
    if (this.data.activity_logs.length > 100) {
      this.data.activity_logs = this.data.activity_logs.slice(0, 100);
    }
    this.saveData();
  }

  public getActivityLogs(limit = 20): ActivityLog[] {
    return this.data.activity_logs.slice(0, limit);
  }

  // Queue & Players
  public getActiveQueue(): QueueItem[] {
    // Sort active queue: PLAYING first at position 1, then QUEUED sorted by position
    const playing = this.data.queue
      .filter((q) => q.status === 'PLAYING')
      .map((q) => this.hydrateQueueItem(q));

    const queued = this.data.queue
      .filter((q) => q.status === 'QUEUED')
      .sort((a, b) => a.position - b.position)
      .map((q) => this.hydrateQueueItem(q));

    return [...playing, ...queued];
  }

  public getAllQueue(): QueueItem[] {
    return this.data.queue.map((q) => this.hydrateQueueItem(q));
  }

  private hydrateQueueItem(q: Omit<QueueItem, 'player' | 'donation'>): QueueItem {
    const player = this.data.players.find((p) => p.id === q.player_id) || {
      id: q.player_id,
      name: 'Unknown',
      game_id: '-',
      membership: 'REGULAR',
      status: q.status,
      created_at: q.joined_at,
      updated_at: q.joined_at,
    };

    const donation = this.data.donations.find((d) => d.claimed_by_player_id === q.player_id);

    return {
      ...q,
      player,
      donation,
    };
  }

  private reindexQueuePositions(): void {
    const playing = this.data.queue.find((q) => q.status === 'PLAYING');
    if (playing) {
      playing.position = 1;
    }

    const queuedItems = this.data.queue
      .filter((q) => q.status === 'QUEUED')
      .sort((a, b) => a.position - b.position);

    let startPos = playing ? 2 : 1;
    for (const item of queuedItems) {
      item.position = startPos++;
    }
  }

  public addPlayerToQueue(params: {
    name: string;
    game_id: string;
    membership?: MembershipType;
    donation_id?: string;
  }): { success: boolean; message: string; queueItem?: QueueItem } {
    // Check queue limit
    const activeQueuedCount = this.data.queue.filter(
      (q) => q.status === 'QUEUED' || q.status === 'PLAYING'
    ).length;

    if (activeQueuedCount >= this.data.settings.max_queue_limit) {
      return { success: false, message: 'Antrian sudah penuh! Silakan coba lagi nanti.' };
    }

    // Check duplicate active game_id
    const duplicate = this.getActiveQueue().find(
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
          (d.id === trimmedDonationId ||
            d.external_donation_id.toLowerCase() === trimmedDonationId.toLowerCase()) &&
          d.status === 'UNCLAIMED'
      );

      if (don) {
        matchedDonation = don;
        // Auto-assign membership based on amount
        if (don.amount >= this.data.settings.vvip_min_donation) {
          membership = 'VVIP';
        } else if (don.amount >= this.data.settings.vip_min_donation) {
          membership = 'VIP';
        }
      } else {
        // If donation required and not found
        if (!this.data.settings.allow_free_queue && !params.membership) {
          return {
            success: false,
            message: 'Kode/ID Donasi tidak valid atau sudah pernah digunakan!',
          };
        }
      }
    } else if (!this.data.settings.allow_free_queue && !params.membership) {
      return {
        success: false,
        message: 'Kode Donasi wajib diisi untuk bergabung antrian.',
      };
    }

    const now = new Date().toISOString();
    const playerId = 'p-' + crypto.randomUUID().slice(0, 8);
    const newPlayer: Player = {
      id: playerId,
      name: params.name.trim(),
      game_id: params.game_id.trim(),
      membership,
      status: 'QUEUED',
      created_at: now,
      updated_at: now,
    };

    this.data.players.push(newPlayer);

    // Calculate position
    const currentMaxPosition = this.data.queue
      .filter((q) => q.status === 'QUEUED' || q.status === 'PLAYING')
      .reduce((max, q) => Math.max(max, q.position), 0);

    const queueId = 'q-' + crypto.randomUUID().slice(0, 8);
    const newQueueItem = {
      id: queueId,
      player_id: playerId,
      position: currentMaxPosition + 1,
      status: 'QUEUED' as const,
      joined_at: now,
    };

    // VVIP / VIP Priority Insertion logic if membership is elevated
    if (membership === 'VVIP' || membership === 'VIP') {
      // Find position right behind other VIPs/VVIPs, but ahead of regular players
      const queuedList = this.data.queue.filter((q) => q.status === 'QUEUED');
      let insertIndex = queuedList.length;

      for (let i = 0; i < queuedList.length; i++) {
        const qp = this.data.players.find((p) => p.id === queuedList[i].player_id);
        if (!qp) continue;

        if (membership === 'VVIP') {
          // VVIP goes after other VVIPs, but ahead of VIP and REGULAR
          if (qp.membership !== 'VVIP') {
            insertIndex = i;
            break;
          }
        } else if (membership === 'VIP') {
          // VIP goes after VVIP and other VIPs, ahead of REGULAR
          if (qp.membership === 'REGULAR') {
            insertIndex = i;
            break;
          }
        }
      }

      // If we insert before regular players, place it nicely
      if (insertIndex < queuedList.length) {
        // adjust positions
        const targetPos = queuedList[insertIndex].position;
        newQueueItem.position = targetPos;
        for (let i = insertIndex; i < queuedList.length; i++) {
          queuedList[i].position += 1;
        }
      }
    }

    this.data.queue.push(newQueueItem);
    this.reindexQueuePositions();

    // Mark donation claimed
    if (matchedDonation) {
      matchedDonation.status = 'CLAIMED';
      matchedDonation.claimed_by_player_id = playerId;
      matchedDonation.claimed_at = now;
    }

    this.saveData();
    this.logActivity(
      `${newPlayer.name} (${newPlayer.game_id}) masuk antrian #${newQueueItem.position} [${membership}]`,
      'join'
    );

    return {
      success: true,
      message: 'Berhasil masuk antrian!',
      queueItem: this.hydrateQueueItem(newQueueItem),
    };
  }

  // Next match action
  public nextMatch(): { currentDone: Player | null; newPlaying: Player | null } {
    const now = new Date().toISOString();
    // 1. Current playing -> DONE
    const currentPlayingQueue = this.data.queue.find((q) => q.status === 'PLAYING');
    let donePlayer: Player | null = null;
    if (currentPlayingQueue) {
      currentPlayingQueue.status = 'DONE';
      const p = this.data.players.find((pl) => pl.id === currentPlayingQueue.player_id);
      if (p) {
        p.status = 'DONE';
        p.updated_at = now;
        donePlayer = p;
      }
    }

    // 2. Next queued -> PLAYING
    const queuedItems = this.data.queue
      .filter((q) => q.status === 'QUEUED')
      .sort((a, b) => a.position - b.position);

    let nextPlayer: Player | null = null;
    if (queuedItems.length > 0) {
      const nextQueue = queuedItems[0];
      nextQueue.status = 'PLAYING';
      nextQueue.position = 1;
      const p = this.data.players.find((pl) => pl.id === nextQueue.player_id);
      if (p) {
        p.status = 'PLAYING';
        p.updated_at = now;
        nextPlayer = p;
      }
    }

    this.reindexQueuePositions();
    this.saveData();

    if (donePlayer) {
      this.logActivity(`${donePlayer.name} selesai bermain (DONE)`, 'done');
    }
    if (nextPlayer) {
      this.logActivity(`${nextPlayer.name} sekarang bermain (LIVE)`, 'play');
    }

    return { currentDone: donePlayer, newPlaying: nextPlayer };
  }

  // Set specific queue item to Playing
  public setPlaying(queueId: string): boolean {
    const target = this.data.queue.find((q) => q.id === queueId);
    if (!target) return false;

    // Previous playing to done or queued? User flow says previous playing to DONE
    const currentPlaying = this.data.queue.find(
      (q) => q.status === 'PLAYING' && q.id !== queueId
    );
    if (currentPlaying) {
      currentPlaying.status = 'DONE';
      const prevPlayer = this.data.players.find((p) => p.id === currentPlaying.player_id);
      if (prevPlayer) prevPlayer.status = 'DONE';
    }

    target.status = 'PLAYING';
    const player = this.data.players.find((p) => p.id === target.player_id);
    if (player) {
      player.status = 'PLAYING';
      this.logActivity(`${player.name} diset sebagai sedang bermain (LIVE)`, 'play');
    }

    this.reindexQueuePositions();
    this.saveData();
    return true;
  }

  // Set specific queue item to Done
  public setDone(queueId: string): boolean {
    const target = this.data.queue.find((q) => q.id === queueId);
    if (!target) return false;

    target.status = 'DONE';
    const player = this.data.players.find((p) => p.id === target.player_id);
    if (player) {
      player.status = 'DONE';
      this.logActivity(`${player.name} selesai bermain (DONE)`, 'done');
    }

    this.reindexQueuePositions();
    this.saveData();
    return true;
  }

  // Skip player
  public skipPlayer(queueId: string): boolean {
    const target = this.data.queue.find((q) => q.id === queueId);
    if (!target) return false;

    target.status = 'SKIPPED';
    const player = this.data.players.find((p) => p.id === target.player_id);
    if (player) {
      player.status = 'SKIPPED';
      this.logActivity(`${player.name} di-skip dari antrian`, 'skip');
    }

    this.reindexQueuePositions();
    this.saveData();
    return true;
  }

  // Remove player from queue
  public removePlayer(queueId: string): boolean {
    const cleanId = String(queueId || '').trim();
    if (!cleanId) return false;

    // 1. Direct search by queue ID or player_id in queue list
    let index = this.data.queue.findIndex(
      (q) => q.id === cleanId || q.player_id === cleanId
    );

    // 2. If not found directly, check if cleanId matches player's ID or game_id
    if (index === -1) {
      const pl = this.data.players.find(
        (p) => p.id === cleanId || p.game_id.toLowerCase() === cleanId.toLowerCase()
      );
      if (pl) {
        index = this.data.queue.findIndex((q) => q.player_id === pl.id);
      }
    }

    if (index === -1) {
      console.warn(`[removePlayer] Item tidak ditemukan untuk ID: ${cleanId}`);
      return false;
    }

    const [removed] = this.data.queue.splice(index, 1);
    const player = this.data.players.find((p) => p.id === removed.player_id);
    if (player) {
      player.status = 'CANCELLED';
      player.updated_at = new Date().toISOString();
      this.logActivity(`${player.name} dihapus dari antrian`, 'skip');
    }

    this.reindexQueuePositions();
    this.saveData();
    return true;
  }

  // Edit player
  public editPlayer(
    playerId: string,
    updates: { name?: string; game_id?: string; membership?: MembershipType }
  ): boolean {
    const player = this.data.players.find((p) => p.id === playerId);
    if (!player) return false;

    if (updates.name) player.name = updates.name.trim();
    if (updates.game_id) player.game_id = updates.game_id.trim();
    if (updates.membership) player.membership = updates.membership;
    player.updated_at = new Date().toISOString();

    this.logActivity(`Data player ${player.name} berhasil diperbarui`, 'edit');
    this.saveData();
    return true;
  }

  // Move queue position
  public movePosition(queueId: string, direction: 'up' | 'down'): boolean {
    const queuedItems = this.data.queue
      .filter((q) => q.status === 'QUEUED')
      .sort((a, b) => a.position - b.position);

    const index = queuedItems.findIndex((q) => q.id === queueId);
    if (index === -1) return false;

    if (direction === 'up' && index > 0) {
      const temp = queuedItems[index].position;
      queuedItems[index].position = queuedItems[index - 1].position;
      queuedItems[index - 1].position = temp;
      this.reindexQueuePositions();
      this.saveData();
      this.logActivity('Posisi antrian digeser ke atas', 'reorder');
      return true;
    } else if (direction === 'down' && index < queuedItems.length - 1) {
      const temp = queuedItems[index].position;
      queuedItems[index].position = queuedItems[index + 1].position;
      queuedItems[index + 1].position = temp;
      this.reindexQueuePositions();
      this.saveData();
      this.logActivity('Posisi antrian digeser ke bawah', 'reorder');
      return true;
    }

    return false;
  }

  // Donations
  public getDonations(): Donation[] {
    return [...this.data.donations].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public addDonation(params: {
    external_donation_id: string;
    donor_name: string;
    amount: number;
    message: string;
  }): { success: boolean; donation?: Donation; duplicate?: boolean } {
    // Unique check
    const existing = this.data.donations.find(
      (d) => d.external_donation_id === params.external_donation_id
    );
    if (existing) {
      return { success: false, duplicate: true, donation: existing };
    }

    const now = new Date().toISOString();
    const newDonation: Donation = {
      id: 'don-' + crypto.randomUUID().slice(0, 8),
      external_donation_id: params.external_donation_id,
      donor_name: params.donor_name,
      amount: Number(params.amount) || 0,
      message: params.message || '',
      status: 'UNCLAIMED',
      created_at: now,
    };

    this.data.donations.unshift(newDonation);
    this.logActivity(
      `Donasi Sociabuzz masuk: ${newDonation.donor_name} (Rp ${newDonation.amount.toLocaleString(
        'id-ID'
      )}) [${newDonation.external_donation_id}]`,
      'donation'
    );

    this.saveData();
    return { success: true, donation: newDonation };
  }

  // Webhook event storage
  public saveWebhookEvent(params: {
    provider: 'sociabuzz';
    external_event_id: string;
    payload: Record<string, unknown>;
  }): WebhookEvent {
    const newEvent: WebhookEvent = {
      id: 'wh-' + crypto.randomUUID().slice(0, 8),
      provider: params.provider,
      external_event_id: params.external_event_id,
      payload: params.payload,
      processed: true,
      created_at: new Date().toISOString(),
    };
    this.data.webhook_events.unshift(newEvent);
    if (this.data.webhook_events.length > 50) {
      this.data.webhook_events = this.data.webhook_events.slice(0, 50);
    }
    this.saveData();
    return newEvent;
  }

  // Statistics
  public getStats(): QueueStats {
    const active = this.getActiveQueue();
    const playing = active.find((q) => q.status === 'PLAYING') || null;
    const queued = active.filter((q) => q.status === 'QUEUED');
    const next = queued.length > 0 ? queued[0] : null;

    // Donations today
    const today = new Date().toDateString();
    const totalDonationsToday = this.data.donations
      .filter((d) => new Date(d.created_at).toDateString() === today)
      .reduce((sum, d) => sum + d.amount, 0);

    // Done today
    const doneToday = this.data.players.filter(
      (p) => p.status === 'DONE' && new Date(p.updated_at).toDateString() === today
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
