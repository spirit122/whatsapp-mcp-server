// ─────────────────────────────────────────────
// Tests: Flow Tools
// ─────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFlowTool, flowToolDefinitions } from "../../src/tools/flows";
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

describe("Flow Tools", () => {
  let client: WhatsAppClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createClient();
  });

  it("should have 2 tools", () => {
    expect(flowToolDefinitions).toHaveLength(2);
  });

  it("create_flow — should create flow", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "flow-123",
        name: "Customer Survey",
        status: "DRAFT",
      }),
    });

    const result = await handleFlowTool("create_flow", {
      name: "Customer Survey",
      categories: ["SURVEY"],
    }, client);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.flow_id).toBe("flow-123");
    expect(parsed.status).toBe("DRAFT");
  });

  it("send_flow_message — should send flow", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.flow1" }],
      }),
    });

    const result = await handleFlowTool("send_flow_message", {
      to: "5215512345678",
      flow_id: "flow-123",
      flow_token: "unique-token-abc",
      flow_cta: "Take Survey",
      flow_action: "navigate",
      body: "Please fill out our survey!",
      screen: "WELCOME_SCREEN",
    }, client);

    expect(result.isError).toBeUndefined();
  });
});
