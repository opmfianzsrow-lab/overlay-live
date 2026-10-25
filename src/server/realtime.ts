import type { Response } from 'express';
import { db } from './db.ts';

interface RealtimeClient {
  id: string;
  res: Response;
  token?: string; // If connected from an overlay with specific token
  userId?: string; // Target streamer user_id
  isAdmin: boolean;
}

class RealtimeHub {
  private clients: Map<string, RealtimeClient> = new Map();

  constructor() {
    // Send keep-alive every 15 seconds to prevent stream timeout
    const heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
    heartbeatTimer.unref();
  }

  public addClient(
    id: string,
    res: Response,
    token?: string,
    explicitUserId?: string,
    isAdmin = false
  ): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx/proxies
    res.flushHeaders?.();

    // Determine target streamer userId
    let userId = explicitUserId;
    if (!userId && token) {
      userId = db.getUserIdByOverlayToken(token) || undefined;
    }
    if (!userId) {
      userId = 'usr_demo';
    }

    const client: RealtimeClient = { id, res, token, userId, isAdmin };
    this.clients.set(id, client);

    // Initial sync for this specific user
    const settings = db.getSettings(userId);
    const queue = db.getActiveQueue(userId);
    const stats = db.getStats(userId);

    this.sendEvent(client, 'init', {
      timestamp: Date.now(),
      settings: isAdmin ? settings : {
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
      queue,
      stats: isAdmin ? stats : undefined,
    });

    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  public broadcastQueueChange(userId: string, reason: string = 'queue_update'): void {
    if (!userId) return;

    const queue = db.getActiveQueue(userId);
    const settings = db.getSettings(userId);
    const stats = db.getStats(userId);
    const logs = db.getActivityLogs(userId, 10);

    for (const [, client] of this.clients) {
      // User Isolation: only send to clients belonging to this streamer!
      if (client.userId !== userId) continue;

      try {
        const clientData = {
          reason,
          timestamp: Date.now(),
          queue,
          settings: client.isAdmin ? settings : {
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
          stats: client.isAdmin ? stats : undefined,
          logs: client.isAdmin ? logs : undefined,
        };

        client.res.write(`event: queue_update\ndata: ${JSON.stringify(clientData)}\n\n`);
      } catch (err) {
        console.error('Error broadcasting to client', client.id, err);
      }
    }
  }

  private sendEvent(client: RealtimeClient, event: string, data: unknown): void {
    try {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      console.error('Error sending event', e);
    }
  }

  private sendHeartbeat(): void {
    for (const [, client] of this.clients) {
      try {
        client.res.write(': heartbeat\n\n');
      } catch {
        this.clients.delete(client.id);
      }
    }
  }
}

export const realtimeHub = new RealtimeHub();
