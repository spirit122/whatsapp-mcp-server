// ─────────────────────────────────────────────
// Tests: Webhook Tools
// ─────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { webhookToolDefinitions } from "../../src/tools/webhooks";

describe("Webhook Tool Definitions", () => {
  it("should have 3 tools", () => {
    expect(webhookToolDefinitions).toHaveLength(3);
  });

  it("should have correct tool names", () => {
    const names = webhookToolDefinitions.map((t) => t.name);
    expect(names).toContain("get_recent_messages");
    expect(names).toContain("get_message_status_updates");
    expect(names).toContain("search_conversations");
  });

  it("search_conversations should require query", () => {
    const searchTool = webhookToolDefinitions.find((t) => t.name === "search_conversations");
    expect(searchTool?.inputSchema.required).toContain("query");
  });
});
