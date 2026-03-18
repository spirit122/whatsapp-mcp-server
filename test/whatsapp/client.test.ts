// ─────────────────────────────────────────────
// Tests: WhatsApp API Client
// ─────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsAppClient, WhatsAppApiError } from "../../src/whatsapp/client";
import type { Env } from "../../src/whatsapp/types";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createMockEnv(): Env {
  return {
    WHATSAPP_API_VERSION: "v21.0",
    WHATSAPP_API_BASE_URL: "https://graph.facebook.com",
    WHATSAPP_ACCESS_TOKEN: "test-token-123",
    WHATSAPP_PHONE_NUMBER_ID: "123456789",
    WHATSAPP_BUSINESS_ACCOUNT_ID: "987654321",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret",
    MCP_SERVER_NAME: "test-server",
    MCP_SERVER_VERSION: "1.0.0",
    LOG_LEVEL: "error",
    CACHE: {} as any,
    DB: {} as any,
    WEBHOOK_RECEIVER: {} as any,
    SESSION_MANAGER: {} as any,
  };
}

function mockApiResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
  });
}

describe("WhatsAppClient", () => {
  let client: WhatsAppClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new WhatsAppClient(createMockEnv());
  });

  // ── Text Messages ──

  describe("sendTextMessage", () => {
    it("should send a text message successfully", async () => {
      mockApiResponse({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.abc123" }],
      });

      const result = await client.sendTextMessage("5215512345678", "Hello!");

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://graph.facebook.com/v21.0/123456789/messages");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body.messaging_product).toBe("whatsapp");
      expect(body.to).toBe("5215512345678");
      expect(body.type).toBe("text");
      expect(body.text.body).toBe("Hello!");

      expect(result.messages[0].id).toBe("wamid.abc123");
    });

    it("should send with preview_url enabled", async () => {
      mockApiResponse({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.abc456" }],
      });

      await client.sendTextMessage("5215512345678", "Check https://example.com", true);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text.preview_url).toBe(true);
    });

    it("should send with reply context", async () => {
      mockApiResponse({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.reply1" }],
      });

      await client.sendTextMessage("5215512345678", "Reply!", false, "wamid.original");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.context.message_id).toBe("wamid.original");
    });
  });

  // ── Image Messages ──

  describe("sendImageMessage", () => {
    it("should send image by URL", async () => {
      mockApiResponse({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.img1" }],
      });

      await client.sendImageMessage("5215512345678", {
        link: "https://example.com/photo.jpg",
        caption: "My photo",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe("image");
      expect(body.image.link).toBe("https://example.com/photo.jpg");
      expect(body.image.caption).toBe("My photo");
    });

    it("should send image by media ID", async () => {
      mockApiResponse({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.img2" }],
      });

      await client.sendImageMessage("5215512345678", { id: "media-id-123" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.image.id).toBe("media-id-123");
    });
  });

  // ── Location Messages ──

  describe("sendLocationMessage", () => {
    it("should send location with all fields", async () => {
      mockApiResponse({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.loc1" }],
      });

      await client.sendLocationMessage("5215512345678", {
        latitude: 19.4326,
        longitude: -99.1332,
        name: "CDMX",
        address: "Mexico City",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe("location");
      expect(body.location.latitude).toBe(19.4326);
      expect(body.location.name).toBe("CDMX");
    });
  });

  // ── Reactions ──

  describe("sendReaction", () => {
    it("should send emoji reaction", async () => {
      mockApiResponse({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.react1" }],
      });

      await client.sendReaction("5215512345678", "wamid.target", "👍");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe("reaction");
      expect(body.reaction.emoji).toBe("👍");
      expect(body.reaction.message_id).toBe("wamid.target");
    });
  });

  // ── Mark as Read ──

  describe("markAsRead", () => {
    it("should mark message as read", async () => {
      mockApiResponse({ success: true });

      await client.markAsRead("wamid.toread");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.status).toBe("read");
      expect(body.message_id).toBe("wamid.toread");
    });
  });

  // ── Interactive: Buttons ──

  describe("sendButtonMessage", () => {
    it("should send button message with 3 buttons", async () => {
      mockApiResponse({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.btn1" }],
      });

      await client.sendButtonMessage(
        "5215512345678",
        "Choose an option:",
        [
          { id: "opt1", title: "Option 1" },
          { id: "opt2", title: "Option 2" },
          { id: "opt3", title: "Option 3" },
        ],
        { header: "Menu", footer: "Reply below" }
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe("interactive");
      expect(body.interactive.type).toBe("button");
      expect(body.interactive.action.buttons).toHaveLength(3);
      expect(body.interactive.header.text).toBe("Menu");
    });
  });

  // ── Templates ──

  describe("listTemplates", () => {
    it("should list templates with filters", async () => {
      mockApiResponse({
        data: [
          { name: "hello_world", status: "APPROVED", category: "UTILITY", language: "en_US", id: "1" },
          { name: "promo", status: "PENDING", category: "MARKETING", language: "es_MX", id: "2" },
        ],
      });

      const result = await client.listTemplates(10, "APPROVED");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("987654321/message_templates");
      expect(url).toContain("limit=10");
      expect(url).toContain("status=APPROVED");
      expect(result.data).toHaveLength(2);
    });
  });

  // ── Business Profile ──

  describe("getBusinessProfile", () => {
    it("should retrieve business profile", async () => {
      mockApiResponse({
        data: [{
          about: "Test Business",
          description: "A test business",
          email: "test@example.com",
          websites: ["https://example.com"],
        }],
      });

      const profile = await client.getBusinessProfile();

      expect(profile.about).toBe("Test Business");
      expect(profile.email).toBe("test@example.com");
    });
  });

  // ── Error Handling ──

  describe("error handling", () => {
    it("should throw WhatsAppApiError on API error", async () => {
      mockApiResponse(
        {
          error: {
            message: "Invalid phone number",
            type: "OAuthException",
            code: 100,
            error_subcode: 2018001,
            fbtrace_id: "trace123",
          },
        },
        false,
        400
      );

      await expect(
        client.sendTextMessage("invalid", "Hello")
      ).rejects.toThrow(WhatsAppApiError);

      try {
        mockApiResponse(
          { error: { message: "Rate limited", code: 4 } },
          false,
          429
        );
        await client.sendTextMessage("5215512345678", "Hello");
      } catch (err) {
        expect(err).toBeInstanceOf(WhatsAppApiError);
        expect((err as WhatsAppApiError).code).toBe(4);
      }
    });

    it("should convert error to MCP result", () => {
      const error = new WhatsAppApiError("Test error", 100, 2018001, "trace1");
      const result = error.toMcpResult();

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe(true);
      expect(parsed.code).toBe(100);
    });
  });

  // ── Media ──

  describe("getMediaUrl", () => {
    it("should get media download URL", async () => {
      mockApiResponse({
        id: "media-123",
        url: "https://lookaside.fbsbx.com/whatsapp_business/...",
        mime_type: "image/jpeg",
        sha256: "abc",
        file_size: 12345,
        messaging_product: "whatsapp",
      });

      const result = await client.getMediaUrl("media-123");

      expect(result.id).toBe("media-123");
      expect(result.mime_type).toBe("image/jpeg");
      expect(result.file_size).toBe(12345);
    });
  });

  // ── Phone Numbers ──

  describe("getPhoneNumbers", () => {
    it("should list phone numbers with quality", async () => {
      mockApiResponse({
        data: [
          {
            id: "phone-1",
            display_phone_number: "+52 155 1234 5678",
            verified_name: "My Business",
            quality_rating: "GREEN",
            status: "CONNECTED",
            messaging_limit_tier: "TIER_1K",
          },
        ],
      });

      const phones = await client.getPhoneNumbers();

      expect(phones).toHaveLength(1);
      expect(phones[0].quality_rating).toBe("GREEN");
      expect(phones[0].messaging_limit_tier).toBe("TIER_1K");
    });
  });
});
