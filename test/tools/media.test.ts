// ─────────────────────────────────────────────
// Tests: Media Tools
// ─────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMediaTool, mediaToolDefinitions } from "../../src/tools/media";
import { WhatsAppClient } from "../../src/whatsapp/client";
import type { Env } from "../../src/whatsapp/types";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createClient(): WhatsAppClient {
  return new WhatsAppClient({
    WHATSAPP_API_VERSION: "v21.0",
    WHATSAPP_API_BASE_URL: "https://graph.facebook.com",
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "123456",
    WHATSAPP_BUSINESS_ACCOUNT_ID: "654321",
  } as Env);
}

describe("Media Tool Definitions", () => {
  it("should have 3 tools", () => {
    expect(mediaToolDefinitions).toHaveLength(3);
  });
});

describe("Media Tool Handlers", () => {
  let client: WhatsAppClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createClient();
  });

  it("get_media_url — should return URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "media-123",
        url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/...",
        mime_type: "image/jpeg",
        sha256: "abc123",
        file_size: 54321,
        messaging_product: "whatsapp",
      }),
    });

    const result = await handleMediaTool("get_media_url", {
      media_id: "media-123",
    }, client);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.media_id).toBe("media-123");
    expect(parsed.note).toContain("expires");
  });

  it("delete_media — should succeed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await handleMediaTool("delete_media", {
      media_id: "media-to-delete",
    }, client);

    expect(result.isError).toBeUndefined();
  });

  it("get_media_url — fails without media_id", async () => {
    const result = await handleMediaTool("get_media_url", {}, client);
    expect(result.isError).toBe(true);
  });
});
