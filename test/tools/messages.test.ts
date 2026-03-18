// ─────────────────────────────────────────────
// Tests: Message Tools
// ─────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMessageTool, messageToolDefinitions } from "../../src/tools/messages";
import { WhatsAppClient } from "../../src/whatsapp/client";
import type { Env } from "../../src/whatsapp/types";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockSuccess(data: unknown = {}) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      messaging_product: "whatsapp",
      contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
      messages: [{ id: "wamid.test" }],
      ...data,
    }),
  });
}

function createClient(): WhatsAppClient {
  return new WhatsAppClient({
    WHATSAPP_API_VERSION: "v21.0",
    WHATSAPP_API_BASE_URL: "https://graph.facebook.com",
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "123456",
    WHATSAPP_BUSINESS_ACCOUNT_ID: "654321",
  } as Env);
}

describe("Message Tool Definitions", () => {
  it("should have 10 tool definitions", () => {
    expect(messageToolDefinitions).toHaveLength(10);
  });

  it("should have unique names", () => {
    const names = messageToolDefinitions.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all tools should have required inputSchema", () => {
    for (const tool of messageToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.description).toBeTruthy();
    }
  });
});

describe("Message Tool Handlers", () => {
  let client: WhatsAppClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createClient();
  });

  it("send_text_message — should succeed", async () => {
    mockSuccess();
    const result = await handleMessageTool("send_text_message", {
      to: "5215512345678",
      body: "Hello from MCP!",
    }, client);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toBe("Text message sent");
  });

  it("send_text_message — should fail with invalid phone", async () => {
    const result = await handleMessageTool("send_text_message", {
      to: "abc",
      body: "Hello",
    }, client);

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.type).toBe("ValidationError");
  });

  it("send_text_message — should fail with empty body", async () => {
    const result = await handleMessageTool("send_text_message", {
      to: "5215512345678",
      body: "",
    }, client);

    expect(result.isError).toBe(true);
  });

  it("send_image_message — should succeed with URL", async () => {
    mockSuccess();
    const result = await handleMessageTool("send_image_message", {
      to: "5215512345678",
      image: { link: "https://example.com/photo.jpg", caption: "Nice!" },
    }, client);

    expect(result.isError).toBeUndefined();
  });

  it("send_location_message — should succeed", async () => {
    mockSuccess();
    const result = await handleMessageTool("send_location_message", {
      to: "5215512345678",
      latitude: 19.4326,
      longitude: -99.1332,
      name: "CDMX",
    }, client);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toBe("Location sent");
  });

  it("send_location_message — should fail with invalid coords", async () => {
    const result = await handleMessageTool("send_location_message", {
      to: "5215512345678",
      latitude: 999,
      longitude: -99.1332,
    }, client);

    expect(result.isError).toBe(true);
  });

  it("send_reaction — should succeed", async () => {
    mockSuccess();
    const result = await handleMessageTool("send_reaction", {
      to: "5215512345678",
      message_id: "wamid.target",
      emoji: "❤️",
    }, client);

    expect(result.isError).toBeUndefined();
  });

  it("mark_as_read — should succeed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const result = await handleMessageTool("mark_as_read", {
      message_id: "wamid.toread",
    }, client);

    expect(result.isError).toBeUndefined();
  });

  it("unknown tool — should return error", async () => {
    const result = await handleMessageTool("nonexistent_tool", {}, client);
    expect(result.isError).toBe(true);
  });
});
