import type { Response } from 'express';
import { db } from './db';

interface RealtimeClient {
  id: string;
  res: Response;
  token?: string; // If connected from an overlay with specific token
  isAdmin: boolean;
}

class RealtimeHub {
  private clients: Map<string, RealtimeClient> = new Map();

  constructor() {
    // Send keep-alive every 15 seconds to prevent stream timeout
    setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  public addClient(
    id: string,
    res: Response,
    token?: string,
    isAdmin = false
  ): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx/proxies
    res.flushHeaders?.();

    const client: RealtimeClient = { id, res, token, isAdmin };
    this.clients.set(id, client);

    // Initial sync
    const settings = db.getSettings();
    const queue = db.getActiveQueue();
    const stats = db.getStats();

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
      },
      queue,
      stats: isAdmin ? stats : undefined,
    });

    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  public broadcast(eventName: string, data: unknown): void {
    const payload = JSON.stringify(data);
    for (const [, client] of this.clients) {
      try {
        client.res.write(`event: ${eventName}\ndata: ${payload}\n\n`);
      } catch (err) {
        console.error('Failed to send SSE to client', client.id, err);
      }
    }
  }

  public broadcastQueueChange(reason: string = 'queue_update'): void {
    const queue = db.getActiveQueue();
    const settings = db.getSettings();
    const stats = db.getStats();
    const logs = db.getActivityLogs(10);

    for (const [, client] of this.clients) {
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
