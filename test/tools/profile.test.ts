// ─────────────────────────────────────────────
// Tests: Profile Tools
// ─────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleProfileTool, profileToolDefinitions } from "../../src/tools/profile";
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

describe("Profile Tools", () => {
  let client: WhatsAppClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createClient();
  });

  it("should have 3 tools", () => {
    expect(profileToolDefinitions).toHaveLength(3);
  });

  it("get_business_profile — should return profile", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{
          about: "Galidar Studio",
          description: "Game Development",
          email: "hello@galidar.com",
        }],
      }),
    });

    const result = await handleProfileTool("get_business_profile", {}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.profile.about).toBe("Galidar Studio");
  });

  it("update_business_profile — should update", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await handleProfileTool("update_business_profile", {
      about: "Updated Business",
      email: "new@example.com",
    }, client);

    expect(result.isError).toBeUndefined();
  });

  it("get_phone_numbers — should list numbers", async () => {
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

    const result = await handleProfileTool("get_phone_numbers", {}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.phone_numbers).toHaveLength(1);
    expect(parsed.phone_numbers[0].quality).toBe("GREEN");
  });
});
