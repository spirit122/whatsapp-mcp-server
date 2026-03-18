// ─────────────────────────────────────────────
// Tests: Interactive Message Tools
// ─────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleInteractiveTool, interactiveToolDefinitions } from "../../src/tools/interactive";
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

function mockSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      messaging_product: "whatsapp",
      contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
      messages: [{ id: "wamid.interactive1" }],
    }),
  });
}

describe("Interactive Tool Definitions", () => {
  it("should have 5 tools", () => {
    expect(interactiveToolDefinitions).toHaveLength(5);
  });
});

describe("Interactive Tool Handlers", () => {
  let client: WhatsAppClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createClient();
  });

  it("send_button_message — 3 buttons", async () => {
    mockSuccess();
    const result = await handleInteractiveTool("send_button_message", {
      to: "5215512345678",
      body: "Pick one:",
      buttons: [
        { id: "a", title: "Option A" },
        { id: "b", title: "Option B" },
        { id: "c", title: "Option C" },
      ],
    }, client);

    expect(result.isError).toBeUndefined();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.interactive.action.buttons).toHaveLength(3);
  });

  it("send_button_message — fails with >3 buttons", async () => {
    const result = await handleInteractiveTool("send_button_message", {
      to: "5215512345678",
      body: "Pick one:",
      buttons: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
        { id: "c", title: "C" },
        { id: "d", title: "D" },
      ],
    }, client);

    expect(result.isError).toBe(true);
  });

  it("send_list_message — with sections", async () => {
    mockSuccess();
    const result = await handleInteractiveTool("send_list_message", {
      to: "5215512345678",
      body: "Our menu:",
      button_text: "View Menu",
      sections: [
        {
          title: "Drinks",
          rows: [
            { id: "coffee", title: "Coffee", description: "$3.00" },
            { id: "tea", title: "Tea", description: "$2.50" },
          ],
        },
        {
          title: "Food",
          rows: [
            { id: "sandwich", title: "Sandwich", description: "$5.00" },
          ],
        },
      ],
      header: "Restaurant",
      footer: "Prices include tax",
    }, client);

    expect(result.isError).toBeUndefined();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.interactive.action.sections).toHaveLength(2);
    expect(body.interactive.header.text).toBe("Restaurant");
  });

  it("send_cta_url_button — should succeed", async () => {
    mockSuccess();
    const result = await handleInteractiveTool("send_cta_url_button", {
      to: "5215512345678",
      body: "Visit our website",
      button_text: "Open Site",
      url: "https://example.com",
    }, client);

    expect(result.isError).toBeUndefined();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.interactive.action.parameters.url).toBe("https://example.com");
  });

  it("send_product_message — should succeed", async () => {
    mockSuccess();
    const result = await handleInteractiveTool("send_product_message", {
      to: "5215512345678",
      catalog_id: "cat-123",
      product_retailer_id: "SKU-001",
    }, client);

    expect(result.isError).toBeUndefined();
  });
});
