import crypto from 'node:crypto';
import { db } from './db';
import type { Donation } from '../types/queue';

export interface SociabuzzWebhookPayload {
  // Sociabuzz standard webhook attributes
  id?: string;
  donation_id?: string;
  external_id?: string;
  donor_name?: string;
  name?: string;
  amount?: number | string;
  nominal?: number | string;
  message?: string;
  created_at?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export class SociabuzzService {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.SOCIABUZZ_WEBHOOK_SECRET || 'sociabuzz_default_secret_key';
  }

  /**
   * Verify signature if Sociabuzz passes a cryptographic HMAC header (e.g., x-sociabuzz-signature)
   */
  public verifySignature(rawBody: string, signatureHeader?: string): boolean {
    if (!signatureHeader) {
      // If no signature header is provided in development or testing, log warning
      return true;
    }

    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const digest = hmac.update(rawBody).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
    } catch (e) {
      console.error('Failed to verify Sociabuzz webhook signature:', e);
      return false;
    }
  }

  /**
   * Process incoming Sociabuzz webhook event
   */
  public processWebhook(
    payload: SociabuzzWebhookPayload,
    rawPayloadString: string = JSON.stringify(payload)
  ): {
    success: boolean;
    duplicate?: boolean;
    donation?: Donation;
    error?: string;
  } {
    // Extract standardized fields
    const externalId = String(
      payload.id || payload.donation_id || payload.external_id || `SB-${Date.now()}`
    );

    const donorName = String(
      payload.donor_name || payload.name || 'Anonim'
    ).trim();

    const rawAmount = payload.amount || payload.nominal || 0;
    const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount.replace(/[^0-9.]/g, '')) || 0 : Number(rawAmount) || 0;

    const message = String(payload.message || '').trim();

    // Check duplicate and save donation
    const result = db.addDonation({
      external_donation_id: externalId,
      donor_name: donorName,
      amount,
      message,
    });

    // Record webhook event log
    db.saveWebhookEvent({
      provider: 'sociabuzz',
      external_event_id: externalId,
      payload: payload as Record<string, unknown>,
    });

    if (result.duplicate) {
      return {
        success: false,
        duplicate: true,
        donation: result.donation,
        error: 'Duplicate transaction ID: ' + externalId,
      };
    }

    // Auto-detection: If donor includes game ID directly in message
    // Example: "ID: 1849448577" or "1849448577"
    if (result.donation) {
      this.attemptAutoMatch(result.donation);
    }

    return {
      success: true,
      donation: result.donation,
    };
  }

  /**
   * Optional helper to auto-match if streamer enables auto-join via message syntax
   */
  private attemptAutoMatch(donation: Donation): void {
    const match = donation.message.match(/(?:id|game\s*id)?\s*[:=\s]?\s*([0-9]{6,12})/i);
    if (match && match[1]) {
      const extractedGameId = match[1];
      console.log(`[SociabuzzService] Detected Game ID ${extractedGameId} in message from ${donation.donor_name}`);
      // Streamer settings allow or keep unclaimed for viewer /join
    }
  }
}

export const sociabuzzService = new SociabuzzService();
