// ─────────────────────────────────────────────
// Tests: Analytics Tools
// ─────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAnalyticsTool, analyticsToolDefinitions } from "../../src/tools/analytics";
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

describe("Analytics Tools", () => {
  let client: WhatsAppClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createClient();
  });

  it("should have 4 tools", () => {
    expect(analyticsToolDefinitions).toHaveLength(4);
  });

  it("get_phone_quality_rating — should show quality and advice", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "1",
            display_phone_number: "+52 155 1234 5678",
            verified_name: "Test Biz",
            quality_rating: "YELLOW",
            status: "CONNECTED",
          },
        ],
      }),
    });

    const result = await handleAnalyticsTool("get_phone_quality_rating", {}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.phones[0].quality).toBe("YELLOW");
    expect(parsed.phones[0].advice).toContain("Warning");
  });

  it("get_messaging_limits — should show tier info", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "1",
            display_phone_number: "+52 155 1234 5678",
            verified_name: "Test Biz",
            quality_rating: "GREEN",
            status: "CONNECTED",
            messaging_limit_tier: "TIER_10K",
          },
        ],
      }),
    });

    const result = await handleAnalyticsTool("get_messaging_limits", {}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.limits[0].tier).toBe("TIER_10K");
    expect(parsed.limits[0].explanation).toContain("10,000");
  });

  it("get_conversation_analytics — should retrieve analytics", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ data_points: [{ start: 1700000000, end: 1700086400, sent: 100, delivered: 95 }] }],
      }),
    });

    const result = await handleAnalyticsTool("get_conversation_analytics", {
      start_date: "2025-01-01",
      end_date: "2025-01-31",
      granularity: "DAY",
    }, client);

    expect(result.isError).toBeUndefined();
  });
});
