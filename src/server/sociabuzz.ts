import crypto from 'node:crypto';
import { db } from './db.ts';
import { realtimeHub } from './realtime.ts';
import type { Donation } from '../types/queue.ts';

export interface SociabuzzWebhookPayload {
  [key: string]: unknown;
}

export class SociabuzzService {
  /**
   * Verify signature if Sociabuzz passes a cryptographic HMAC header (e.g., x-sociabuzz-signature, x-signature)
   */
  public verifySignature(
    rawBody: string,
    secret: string,
    signatureHeader?: string
  ): boolean {
    if (!signatureHeader || !secret) {
      // In testing or when no signature header is sent, allow request through
      return true;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(rawBody).digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(digest, 'utf-8'),
        Buffer.from(signatureHeader, 'utf-8')
      );
    } catch (e) {
      console.error('[SociabuzzService] Failed to verify signature:', e);
      return false;
    }
  }

  /**
   * Process incoming Sociabuzz webhook event for a specific streamer (userId)
   */
  public processWebhook(
    userId: string,
    payload: Record<string, unknown>,
    rawPayloadString: string = JSON.stringify(payload),
    headers: Record<string, unknown> = {}
  ): {
    success: boolean;
    duplicate?: boolean;
    donation?: Donation;
    queueCreated?: boolean;
    error?: string;
  } {
    // 1. Extract Transaction/Event identifier (Check all known provider variants)
    const externalId = String(
      payload.id ||
        payload.donation_id ||
        payload.transaction_id ||
        payload.external_id ||
        payload.order_id ||
        payload.invoice_number ||
        `SB-${Date.now()}`
    );

    // 2. Extract Donor Name
    const donorName = String(
      payload.donor_name ||
        payload.donor ||
        payload.name ||
        payload.supporter_name ||
        payload.from ||
        payload.nama ||
        'Anonim'
    ).trim();

    // 3. Extract Amount
    const rawAmount =
      payload.amount ??
      payload.nominal ??
      payload.gross_amount ??
      payload.total ??
      payload.donation_amount ??
      0;
    const amount =
      typeof rawAmount === 'string'
        ? parseFloat(rawAmount.replace(/[^0-9.]/g, '')) || 0
        : Number(rawAmount) || 0;

    // 4. Extract Message
    const message = String(
      payload.message ??
        payload.pesan ??
        payload.note ??
        payload.comment ??
        ''
    ).trim();

    // 5. Check Duplicate Protection (external_event_id per streamer)
    const existingDonations = db.getDonations(userId);
    const isDuplicate = existingDonations.some(
      (d) => d.external_donation_id.toLowerCase() === externalId.toLowerCase()
    );

    if (isDuplicate) {
      console.warn(`[SociabuzzService] Duplicate donation ignored: ${externalId} for user ${userId}`);
      db.saveWebhookEvent(userId, {
        provider: 'sociabuzz',
        external_event_id: externalId,
        payload: {
          headers,
          body: payload,
          note: 'DUPLICATE TRANSACTION DETECTED - SKIPPED',
        },
        error: 'Duplicate transaction ID: ' + externalId,
      });

      return {
        success: false,
        duplicate: true,
        error: 'Duplicate transaction ID: ' + externalId,
      };
    }

    // 6. Record Raw Diagnostic Webhook Event for streamer to inspect in dashboard
    db.saveWebhookEvent(userId, {
      provider: 'sociabuzz',
      external_event_id: externalId,
      payload: {
        headers,
        body: payload,
        extracted: {
          external_id: externalId,
          donor_name: donorName,
          amount,
          message,
        },
      },
    });

    // 7. Add Donation Record to Streamer Database
    const donResult = db.addDonation(userId, {
      external_donation_id: externalId,
      donor_name: donorName,
      amount,
      message,
    });

    const donation = donResult.donation;

    // 8. Queue Mapping: Search for Game ID / Queue Input
    // Check direct fields first:
    let extractedGameId = String(
      payload.queue_input ||
        payload.game_id ||
        payload.id_game ||
        payload.player_id ||
        payload.id_pemain ||
        ''
    ).trim();

    // If not found in explicit field, check nested custom fields or data
    if (!extractedGameId && typeof payload.custom_field === 'string') {
      extractedGameId = payload.custom_field.trim();
    } else if (!extractedGameId && typeof payload.custom_fields === 'object' && payload.custom_fields !== null) {
      const cf = payload.custom_fields as Record<string, unknown>;
      extractedGameId = String(cf.game_id || cf.id || cf['ID Game'] || Object.values(cf)[0] || '').trim();
    }

    // If still not found, search in message string for numeric game ID patterns
    if (!extractedGameId && message) {
      const match = message.match(/(?:id|game\s*id|mlbb|ff|pubg)?\s*[:=\s]?\s*([0-9]{5,14}(?:\s*\(\d+\))?)/i);
      if (match && match[1]) {
        extractedGameId = match[1].trim();
      } else {
        // Fallback: If message has content, use it as in-game note/ID so player enters queue automatically
        extractedGameId = message.slice(0, 30);
      }
    }

    // If still no Game ID (e.g. message empty), fallback to donor name so no donation is left out of overlay
    if (!extractedGameId) {
      extractedGameId = donorName || `SB-${externalId.slice(-6)}`;
    }

    let queueCreated = false;

    // 9. If Game ID is found, automatically add player to streamer's queue!
    if (extractedGameId) {
      const settings = db.getSettings(userId);
      let membership: 'REGULAR' | 'VIP' | 'VVIP' = 'REGULAR';
      if (amount >= settings.vvip_min_donation) {
        membership = 'VVIP';
      } else if (amount >= settings.vip_min_donation) {
        membership = 'VIP';
      }

      const qResult = db.addPlayerToQueue(userId, {
        name: donorName,
        game_id: extractedGameId,
        membership,
        donation_id: externalId,
      });

      if (qResult.success) {
        queueCreated = true;
        realtimeHub.broadcastQueueChange(userId, 'sociabuzz_auto_queue');
      } else {
        console.warn(`[SociabuzzService] Could not auto-queue player: ${qResult.message}`);
        db.logActivity(userId, `Donasi masuk tapi gagal antri otomatis: ${qResult.message}`, 'donation');
        realtimeHub.broadcastQueueChange(userId, 'sociabuzz_donation');
      }
    } else {
      // Requirement 12: If donation has no queue information, do not auto add player.
      // Log as "Donation received - Queue data unavailable"
      db.logActivity(
        userId,
        `Donasi Rp ${amount.toLocaleString('id-ID')} dari ${donorName} diterima (Queue data unavailable)`,
        'donation'
      );
      realtimeHub.broadcastQueueChange(userId, 'sociabuzz_donation_unclaimed');
    }

    return {
      success: true,
      donation,
      queueCreated,
    };
  }
}

export const sociabuzzService = new SociabuzzService();
