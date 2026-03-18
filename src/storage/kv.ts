// ─────────────────────────────────────────────
// KV Storage Operations
// Cache layer for tokens, templates, and rate limits
// ─────────────────────────────────────────────

export class KvStore {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  // ── Template Cache ──

  async getCachedTemplates(): Promise<unknown[] | null> {
    return this.kv.get("templates:cache", "json");
  }

  async setCachedTemplates(templates: unknown[], ttlSeconds = 300): Promise<void> {
    await this.kv.put("templates:cache", JSON.stringify(templates), {
      expirationTtl: ttlSeconds,
    });
  }

  async invalidateTemplateCache(): Promise<void> {
    await this.kv.delete("templates:cache");
  }

  // ── API Key Management ──

  async getApiKeyData(apiKey: string): Promise<{
    clientId: string;
    tier: "free" | "pro" | "enterprise";
    active: boolean;
  } | null> {
    return this.kv.get(`apikey:${apiKey}`, "json");
  }

  async setApiKeyData(
    apiKey: string,
    data: { clientId: string; tier: "free" | "pro" | "enterprise"; active: boolean }
  ): Promise<void> {
    await this.kv.put(`apikey:${apiKey}`, JSON.stringify(data));
  }

  async revokeApiKey(apiKey: string): Promise<void> {
    const data = await this.getApiKeyData(apiKey);
    if (data) {
      data.active = false;
      await this.kv.put(`apikey:${apiKey}`, JSON.stringify(data));
    }
  }

  // ── Generic Cache ──

  async get<T>(key: string): Promise<T | null> {
    return this.kv.get(key, "json") as Promise<T | null>;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const options = ttlSeconds ? { expirationTtl: ttlSeconds } : undefined;
    await this.kv.put(key, JSON.stringify(value), options);
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}
