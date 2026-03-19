// ─────────────────────────────────────────────
// Auto-Reply Engine — Multi-provider AI responses
// Supports: Claude (Anthropic), OpenAI (GPT), Google (Gemini)
// ─────────────────────────────────────────────

import type { Env } from "../whatsapp/types";

// ── Types ──

export interface AutoReplyConfig {
  enabled: boolean;
  provider: "claude" | "openai" | "gemini";
  apiKey: string;
  model?: string;
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
  // Conversation memory
  memoryEnabled?: boolean;
  maxHistoryMessages?: number;
  // Filters
  onlyRespondToAllowlist?: boolean;
  ignoredNumbers?: string[];
  businessHoursOnly?: boolean;
  businessHoursStart?: number; // 0-23
  businessHoursEnd?: number;   // 0-23
  offHoursMessage?: string;
  // Rate limits
  maxRepliesPerHourPerRecipient?: number;
  // Configured at
  configuredAt?: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Default Models ──

const DEFAULT_MODELS: Record<string, string> = {
  claude: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  gemini: "gemini-1.5-pro",
};

// ── Auto Reply Engine ──

export class AutoReplyEngine {
  private env: Env;
  private config: AutoReplyConfig;
  private clientId: string;

  constructor(env: Env, config: AutoReplyConfig, clientId: string) {
    this.env = env;
    this.config = config;
    this.clientId = clientId;
  }

  /**
   * Generate a reply to an incoming message
   */
  async generateReply(
    senderPhone: string,
    senderName: string | undefined,
    messageText: string
  ): Promise<string | null> {
    // Check if auto-reply is enabled
    if (!this.config.enabled) return null;

    // Check business hours
    if (this.config.businessHoursOnly) {
      const hour = new Date().getHours();
      const start = this.config.businessHoursStart ?? 9;
      const end = this.config.businessHoursEnd ?? 18;
      if (hour < start || hour >= end) {
        return this.config.offHoursMessage || null;
      }
    }

    // Check ignored numbers
    if (this.config.ignoredNumbers?.includes(senderPhone)) return null;

    // Check reply rate limit
    const rateLimitOk = await this.checkReplyRateLimit(senderPhone);
    if (!rateLimitOk) return null;

    // Get conversation history if memory enabled
    let history: ConversationMessage[] = [];
    if (this.config.memoryEnabled) {
      history = await this.getConversationHistory(senderPhone);
    }

    // Generate reply based on provider
    let reply: string;
    try {
      switch (this.config.provider) {
        case "claude":
          reply = await this.callClaude(messageText, history, senderName);
          break;
        case "openai":
          reply = await this.callOpenAI(messageText, history, senderName);
          break;
        case "gemini":
          reply = await this.callGemini(messageText, history, senderName);
          break;
        default:
          return null;
      }
    } catch (err) {
      console.error("Auto-reply AI call failed:", err);
      return null;
    }

    // Save to conversation history
    if (this.config.memoryEnabled) {
      await this.saveConversationHistory(senderPhone, messageText, reply);
    }

    // Record reply for rate limiting
    await this.recordReply(senderPhone);

    return reply;
  }

  // ── Claude (Anthropic) ──

  private async callClaude(
    message: string,
    history: ConversationMessage[],
    senderName?: string
  ): Promise<string> {
    const model = this.config.model || DEFAULT_MODELS.claude;
    const maxTokens = this.config.maxTokens || 500;

    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: message },
    ];

    const systemPrompt = this.buildSystemPrompt(senderName);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
        temperature: this.config.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    return data.content[0]?.text || "Sorry, I could not generate a response.";
  }

  // ── OpenAI (GPT) ──

  private async callOpenAI(
    message: string,
    history: ConversationMessage[],
    senderName?: string
  ): Promise<string> {
    const model = this.config.model || DEFAULT_MODELS.openai;
    const maxTokens = this.config.maxTokens || 500;

    const systemPrompt = this.buildSystemPrompt(senderName);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user" as const, content: message },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: this.config.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${err}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices[0]?.message?.content || "Sorry, I could not generate a response.";
  }

  // ── Google Gemini ──

  private async callGemini(
    message: string,
    history: ConversationMessage[],
    senderName?: string
  ): Promise<string> {
    const model = this.config.model || DEFAULT_MODELS.gemini;
    const maxTokens = this.config.maxTokens || 500;

    const systemPrompt = this.buildSystemPrompt(senderName);

    const contents = [
      ...history.map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: this.config.temperature ?? 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${err}`);
    }

    const data = (await response.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I could not generate a response.";
  }

  // ── Helpers ──

  private buildSystemPrompt(senderName?: string): string {
    let prompt = this.config.systemPrompt;
    if (senderName) {
      prompt += `\n\nThe customer's name is ${senderName}.`;
    }
    prompt += "\n\nKeep responses concise and suitable for WhatsApp (under 500 characters when possible).";
    return prompt;
  }

  // ── Conversation Memory ──

  private async getConversationHistory(phone: string): Promise<ConversationMessage[]> {
    const key = `convo:${this.clientId}:${phone}`;
    const raw = await this.env.CACHE.get(key);
    if (!raw) return [];

    const history: ConversationMessage[] = JSON.parse(raw);
    const maxHistory = this.config.maxHistoryMessages || 10;
    return history.slice(-maxHistory);
  }

  private async saveConversationHistory(
    phone: string,
    userMessage: string,
    assistantReply: string
  ): Promise<void> {
    const key = `convo:${this.clientId}:${phone}`;
    const existing = await this.getConversationHistory(phone);

    existing.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantReply }
    );

    // Keep max 20 messages
    const trimmed = existing.slice(-20);
    await this.env.CACHE.put(key, JSON.stringify(trimmed), {
      expirationTtl: 86400 * 7, // 7 days
    });
  }

  // ── Rate Limiting ──

  private async checkReplyRateLimit(phone: string): Promise<boolean> {
    const limit = this.config.maxRepliesPerHourPerRecipient || 20;
    const hour = Math.floor(Date.now() / 3600000);
    const key = `autoreply_rate:${this.clientId}:${phone}:${hour}`;

    const countRaw = await this.env.CACHE.get(key);
    const count = countRaw ? parseInt(countRaw) : 0;

    return count < limit;
  }

  private async recordReply(phone: string): Promise<void> {
    const hour = Math.floor(Date.now() / 3600000);
    const key = `autoreply_rate:${this.clientId}:${phone}:${hour}`;

    const countRaw = await this.env.CACHE.get(key);
    const count = countRaw ? parseInt(countRaw) : 0;

    await this.env.CACHE.put(key, String(count + 1), { expirationTtl: 7200 });
  }
}

// ── Config Storage ──

export async function getAutoReplyConfig(
  clientId: string,
  env: Env
): Promise<AutoReplyConfig | null> {
  const key = `autoreply:${clientId}`;
  const raw = await env.CACHE.get(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function saveAutoReplyConfig(
  clientId: string,
  config: AutoReplyConfig,
  env: Env
): Promise<void> {
  const key = `autoreply:${clientId}`;
  await env.CACHE.put(key, JSON.stringify({
    ...config,
    configuredAt: new Date().toISOString(),
  }));
}
