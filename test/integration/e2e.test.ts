// ─────────────────────────────────────────────
// E2E Integration Tests
// Tests the full MCP JSON-RPC flow
// ─────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer, getAllToolDefinitions } from "../../src/mcp-server";
import type { Env } from "../../src/whatsapp/types";
import type { AuthContext } from "../../src/auth/middleware";
import { Logger } from "../../src/utils/logger";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createMockEnv(): Env {
  return {
    WHATSAPP_API_VERSION: "v21.0",
    WHATSAPP_API_BASE_URL: "https://graph.facebook.com",
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "123456",
    WHATSAPP_BUSINESS_ACCOUNT_ID: "654321",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify",
    META_APP_SECRET: "secret",
    MCP_SERVER_NAME: "whatsapp-business-mcp",
    MCP_SERVER_VERSION: "1.0.0",
    LOG_LEVEL: "error",
    CACHE: {} as any,
    DB: {
      prepare: () => ({
        bind: () => ({ run: async () => ({}) }),
        all: async () => ({ results: [] }),
      }),
    } as any,
    WEBHOOK_RECEIVER: {
      idFromName: () => "do-id",
      get: () => ({
        fetch: async () => Response.json({ messages: [] }),
      }),
    } as any,
    SESSION_MANAGER: {} as any,
  };
}

function createAuth(tier: AuthContext["tier"] = "pro"): AuthContext {
  return {
    clientId: "test-client",
    tier,
    phoneNumberId: "123456",
    wabaId: "654321",
  };
}

describe("MCP Server E2E", () => {
  let server: McpServer;
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new Logger("error");
    server = new McpServer(createMockEnv(), createAuth(), logger);
  });

  // ── Initialize ──

  it("should handle initialize request", async () => {
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });

    expect(result.jsonrpc).toBe("2.0");
    expect(result.id).toBe(1);
    expect((result.result as any).protocolVersion).toBe("2024-11-05");
    expect((result.result as any).serverInfo.name).toBe("whatsapp-business-mcp");
    expect((result.result as any).capabilities.tools).toBeDefined();
  });

  // ── Tools List ──

  it("should list all 35 tools for pro tier", async () => {
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    const tools = (result.result as any).tools;
    // Pro tier gets 25 tools (5 free + 20 pro)
    expect(tools.length).toBe(25);
  });

  it("should list only free tools for free tier", async () => {
    const freeServer = new McpServer(
      createMockEnv(),
      createAuth("free"),
      logger
    );

    const result = await freeServer.handleRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    });

    const tools = (result.result as any).tools;
    // Free tier should have only 5 tools
    expect(tools.length).toBeLessThan(35);
    expect(tools.length).toBe(5);
  });

  // ── Tool Calls ──

  it("should execute send_text_message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
        messages: [{ id: "wamid.e2e1" }],
      }),
    });

    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "send_text_message",
        arguments: {
          to: "5215512345678",
          body: "E2E test message",
        },
      },
    });

    const content = (result.result as any).content[0].text;
    const parsed = JSON.parse(content);
    expect(parsed.message).toBe("Text message sent");
    expect(parsed.messages[0].id).toBe("wamid.e2e1");
  });

  it("should block pro tools for free tier", async () => {
    const freeServer = new McpServer(
      createMockEnv(),
      createAuth("free"),
      logger
    );

    const result = await freeServer.handleRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "get_recent_messages",
        arguments: {},
      },
    });

    const content = (result.result as any).content[0].text;
    const parsed = JSON.parse(content);
    expect(parsed.error).toBe(true);
    expect(parsed.message).toContain("higher tier");
  });

  // ── Ping ──

  it("should respond to ping", async () => {
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "ping",
    });

    expect((result.result as any).status).toBe("ok");
  });

  // ── Unknown Method ──

  it("should return error for unknown method", async () => {
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "unknown/method",
    });

    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe(-32601);
  });

  // ── Unknown Tool ──

  it("should return error for unknown tool", async () => {
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "nonexistent_tool",
        arguments: {},
      },
    });

    const content = (result.result as any).content[0].text;
    const parsed = JSON.parse(content);
    expect(parsed.error).toBe(true);
    expect(parsed.message).toContain("Unknown tool");
  });

  // ── Validation Errors ──

  it("should return validation error for bad params", async () => {
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: {
        name: "send_text_message",
        arguments: { to: "invalid!", body: "" },
      },
    });

    const content = (result.result as any).content[0].text;
    const parsed = JSON.parse(content);
    expect(parsed.error).toBe(true);
    expect(parsed.type).toBe("ValidationError");
  });
});

describe("Tool Definitions Integrity", () => {
  it("should have exactly 35 tools", () => {
    expect(getAllToolDefinitions()).toHaveLength(35);
  });

  it("all tools should have unique names", () => {
    const tools = getAllToolDefinitions();
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(35);
  });

  it("all tools should have descriptions", () => {
    for (const tool of getAllToolDefinitions()) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools should have valid inputSchema", () => {
    for (const tool of getAllToolDefinitions()) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});
