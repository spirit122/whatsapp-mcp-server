// ─────────────────────────────────────────────
// Tests: Template Tools
// ─────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleTemplateTool, templateToolDefinitions } from "../../src/tools/templates";
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

describe("Template Tool Definitions", () => {
  it("should have 5 tool definitions", () => {
    expect(templateToolDefinitions).toHaveLength(5);
  });
});

describe("Template Tool Handlers", () => {
  let client: WhatsAppClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createClient();
  });

  it("send_template_message — should succeed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.tpl1" }],
      }),
    });

    const result = await handleTemplateTool("send_template_message", {
      to: "5215512345678",
      template_name: "hello_world",
      language_code: "en_US",
    }, client);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toBe("Template message sent");
  });

  it("send_template_message — with body params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.tpl2" }],
      }),
    });

    const result = await handleTemplateTool("send_template_message", {
      to: "5215512345678",
      template_name: "order_update",
      language_code: "es_MX",
      body_params: ["#12345", "$99.99"],
    }, client);

    expect(result.isError).toBeUndefined();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.template.components).toBeDefined();
    expect(body.template.components[0].type).toBe("body");
    expect(body.template.components[0].parameters).toHaveLength(2);
  });

  it("list_templates — should return template list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { name: "hello_world", status: "APPROVED", category: "UTILITY", language: "en_US", id: "1" },
          { name: "promo_sale", status: "PENDING", category: "MARKETING", language: "es_MX", id: "2" },
        ],
      }),
    });

    const result = await handleTemplateTool("list_templates", { limit: 10 }, client);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.templates).toHaveLength(2);
    expect(parsed.templates[0].name).toBe("hello_world");
  });

  it("create_template — should create and return status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "tpl-new-1", status: "PENDING", category: "UTILITY" }),
    });

    const result = await handleTemplateTool("create_template", {
      name: "order_confirmation",
      category: "UTILITY",
      language: "en_US",
      body: "Your order {{1}} has been confirmed. Total: {{2}}",
      footer: "Thank you!",
    }, client);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toContain("Template created");
    expect(parsed.id).toBe("tpl-new-1");
  });

  it("create_template — should fail with invalid name", async () => {
    const result = await handleTemplateTool("create_template", {
      name: "Invalid Name With Spaces",
      category: "UTILITY",
      language: "en_US",
      body: "Hello",
    }, client);

    expect(result.isError).toBe(true);
  });

  it("get_template_status — should return template status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { name: "hello_world", status: "APPROVED", category: "UTILITY", language: "en_US", id: "1" },
        ],
      }),
    });

    const result = await handleTemplateTool("get_template_status", {
      template_name: "hello_world",
    }, client);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("APPROVED");
  });

  it("delete_template — should delete", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await handleTemplateTool("delete_template", {
      template_name: "old_template",
    }, client);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toContain("deleted");
  });
});
