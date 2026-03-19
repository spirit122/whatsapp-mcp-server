// ─────────────────────────────────────────────
// Message Guard — Anti-spam protection
// Allowlist, per-recipient rate limiting, message type restrictions
// ─────────────────────────────────────────────

import type { Env } from "../whatsapp/types";

interface GuardConfig {
  clientId: string;
  tier: "free" | "pro" | "enterprise";
}

interface RecipientRateData {
  count: number;
  windowStart: number;
}

// ── Rate limits per tier per recipient per hour ──
const RECIPIENT_RATE_LIMITS: Record<string, number> = {
  free: 5,        // 5 messages per recipient per hour
  pro: 30,        // 30 messages per recipient per hour
  enterprise: 100, // 100 messages per recipient per hour
};

// ── Max unique recipients per hour per tier ──
const UNIQUE_RECIPIENT_LIMITS: Record<string, number> = {
  free: 3,        // Can only message 3 different numbers per hour
  pro: 50,        // 50 different numbers per hour
  enterprise: 500, // 500 different numbers per hour
};

// ── Blocked message patterns (anti-abuse) ──
const BLOCKED_PATTERNS = [
  /buy now/i,
  /limited offer/i,
  /act fast/i,
  /click here to claim/i,
  /congratulations you won/i,
  /send this to \d+ people/i,
  /forward this/i,
];

export class MessageGuard {
  private env: Env;
  private config: GuardConfig;

  constructor(env: Env, config: GuardConfig) {
    this.env = env;
    this.config = config;
  }

  /**
   * Check if a message can be sent to a recipient
   * Returns { allowed: true } or { allowed: false, reason: string }
   */
  async checkSend(
    recipientPhone: string,
    messageBody?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const normalized = this.normalizePhone(recipientPhone);

    // 1. Check allowlist (if configured for this client)
    const allowlistCheck = await this.checkAllowlist(normalized);
    if (!allowlistCheck.allowed) return allowlistCheck;

    // 2. Check per-recipient rate limit
    const recipientCheck = await this.checkRecipientRate(normalized);
    if (!recipientCheck.allowed) return recipientCheck;

    // 3. Check unique recipients limit
    const uniqueCheck = await this.checkUniqueRecipients(normalized);
    if (!uniqueCheck.allowed) return uniqueCheck;

    // 4. Check message content for spam patterns
    if (messageBody) {
      const contentCheck = this.checkContent(messageBody);
      if (!contentCheck.allowed) return contentCheck;
    }

    return { allowed: true };
  }

  /**
   * Record that a message was sent (call after successful send)
   */
  async recordSend(recipientPhone: string): Promise<void> {
    const normalized = this.normalizePhone(recipientPhone);
    const hour = this.getCurrentHourKey();

    // Update per-recipient counter
    const recipientKey = `msgrate:${this.config.clientId}:${normalized}:${hour}`;
    const current = await this.env.CACHE.get(recipientKey, "json") as RecipientRateData | null;
    const count = current ? current.count + 1 : 1;
    await this.env.CACHE.put(recipientKey, JSON.stringify({
      count,
      windowStart: current?.windowStart || Date.now(),
    }), { expirationTtl: 7200 }); // 2 hour TTL

    // Update unique recipients set
    const uniqueKey = `msguniq:${this.config.clientId}:${hour}`;
    const uniqueSet = await this.env.CACHE.get(uniqueKey, "json") as string[] | null;
    const recipients = uniqueSet || [];
    if (!recipients.includes(normalized)) {
      recipients.push(normalized);
      await this.env.CACHE.put(uniqueKey, JSON.stringify(recipients), { expirationTtl: 7200 });
    }
  }

  /**
   * Manage the allowlist for a client
   */
  async addToAllowlist(phones: string[]): Promise<void> {
    const normalized = phones.map(p => this.normalizePhone(p));
    const key = `allowlist:${this.config.clientId}`;
    const existing = await this.env.CACHE.get(key, "json") as string[] | null;
    const list = existing || [];
    for (const phone of normalized) {
      if (!list.includes(phone)) list.push(phone);
    }
    await this.env.CACHE.put(key, JSON.stringify(list));
  }

  async removeFromAllowlist(phones: string[]): Promise<void> {
    const normalized = phones.map(p => this.normalizePhone(p));
    const key = `allowlist:${this.config.clientId}`;
    const existing = await this.env.CACHE.get(key, "json") as string[] | null;
    if (!existing) return;
    const filtered = existing.filter(p => !normalized.includes(p));
    await this.env.CACHE.put(key, JSON.stringify(filtered));
  }

  async getAllowlist(): Promise<string[]> {
    const key = `allowlist:${this.config.clientId}`;
    return (await this.env.CACHE.get(key, "json") as string[] | null) || [];
  }

  async isAllowlistEnabled(): Promise<boolean> {
    const key = `allowlist_enabled:${this.config.clientId}`;
    return (await this.env.CACHE.get(key)) === "true";
  }

  async setAllowlistEnabled(enabled: boolean): Promise<void> {
    const key = `allowlist_enabled:${this.config.clientId}`;
    await this.env.CACHE.put(key, enabled ? "true" : "false");
  }

  // ── Private methods ──

  private async checkAllowlist(phone: string): Promise<{ allowed: boolean; reason?: string }> {
    const enabled = await this.isAllowlistEnabled();
    if (!enabled) return { allowed: true }; // Allowlist not enabled, all recipients OK

    const allowlist = await this.getAllowlist();
    if (allowlist.length === 0) return { allowed: true }; // Empty list = no restriction

    if (!allowlist.includes(phone)) {
      return {
        allowed: false,
        reason: `Recipient ${phone} is not in your allowlist. Add them with the manage_allowlist tool or disable the allowlist.`,
      };
    }
    return { allowed: true };
  }

  private async checkRecipientRate(phone: string): Promise<{ allowed: boolean; reason?: string }> {
    const hour = this.getCurrentHourKey();
    const key = `msgrate:${this.config.clientId}:${phone}:${hour}`;
    const data = await this.env.CACHE.get(key, "json") as RecipientRateData | null;
    const limit = RECIPIENT_RATE_LIMITS[this.config.tier] || 5;

    if (data && data.count >= limit) {
      return {
        allowed: false,
        reason: `Rate limit reached: ${data.count}/${limit} messages to ${phone} this hour. Try again later.`,
      };
    }
    return { allowed: true };
  }

  private async checkUniqueRecipients(phone: string): Promise<{ allowed: boolean; reason?: string }> {
    const hour = this.getCurrentHourKey();
    const key = `msguniq:${this.config.clientId}:${hour}`;
    const uniqueSet = await this.env.CACHE.get(key, "json") as string[] | null;
    const recipients = uniqueSet || [];
    const limit = UNIQUE_RECIPIENT_LIMITS[this.config.tier] || 3;

    if (!recipients.includes(phone) && recipients.length >= limit) {
      return {
        allowed: false,
        reason: `Unique recipient limit reached: ${recipients.length}/${limit} different numbers this hour. Upgrade your plan for more recipients.`,
      };
    }
    return { allowed: true };
  }

  private checkContent(body: string): { allowed: boolean; reason?: string } {
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(body)) {
        return {
          allowed: false,
          reason: `Message blocked: content matches spam pattern. Please rephrase your message.`,
        };
      }
    }
    return { allowed: true };
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)\+]/g, "");
  }

  private getCurrentHourKey(): string {
    return Math.floor(Date.now() / 3600000).toString();
  }
}
