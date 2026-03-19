// ─────────────────────────────────────────────
// Module 5: Webhooks — DIFFERENTIATOR
// Receive messages, track statuses, search conversations
// Powered by Durable Objects for persistent storage
// ─────────────────────────────────────────────

import type { Env, McpToolResult } from "../whatsapp/types";
import { withErrorHandling } from "../utils/errors";
import {
  getRecentMessagesSchema,
  getMessageStatusSchema,
  searchConversationsSchema,
} from "../whatsapp/validators";

function success(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const webhookToolDefinitions = [
  {
    name: "get_recent_messages",
    description:
      "Get recently received WhatsApp messages. Unlike other MCP servers, this actually receives and stores incoming messages via webhooks.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max messages to return (1-100)", default: 20 },
        phone_number: { type: "string", description: "Filter by sender phone number" },
        since: { type: "string", description: "ISO date string — only messages after this time" },
      },
    },
  },
  {
    name: "get_message_status_updates",
    description:
      "Get delivery status updates for sent messages (sent, delivered, read, failed).",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max status updates to return", default: 20 },
        status: {
          type: "string",
          enum: ["sent", "delivered", "read", "failed"],
          description: "Filter by specific status",
        },
      },
    },
  },
  {
    name: "search_conversations",
    description:
      "Search through received messages by text content, phone number, or date range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search text in message content" },
        phone_number: { type: "string", description: "Filter by phone number" },
        from_date: { type: "string", description: "Start date (ISO format)" },
        to_date: { type: "string", description: "End date (ISO format)" },
        limit: { type: "number", description: "Max results (1-50)", default: 20 },
      },
      required: ["query"],
    },
  },
];

export async function handleWebhookTool(
  toolName: string,
  args: Record<string, unknown>,
  env: Env,
  clientId: string = "primary"
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    // Use "primary" DO for now — webhook handler stores all messages there
    const doId = env.WEBHOOK_RECEIVER.idFromName("primary");
    const stub = env.WEBHOOK_RECEIVER.get(doId);

    switch (toolName) {
      case "get_recent_messages": {
        const p = getRecentMessagesSchema.parse(args);
        const response = await stub.fetch(
          new Request("https://internal/messages", {
            method: "POST",
            body: JSON.stringify({
              action: "get_recent",
              limit: p.limit,
              phone_number: p.phone_number,
              since: p.since,
            }),
          })
        );
        const data = await response.json();
        return success(data);
      }

      case "get_message_status_updates": {
        const p = getMessageStatusSchema.parse(args);
        const response = await stub.fetch(
          new Request("https://internal/statuses", {
            method: "POST",
            body: JSON.stringify({
              action: "get_statuses",
              limit: p.limit,
              status: p.status,
            }),
          })
        );
        const data = await response.json();
        return success(data);
      }

      case "search_conversations": {
        const p = searchConversationsSchema.parse(args);
        const response = await stub.fetch(
          new Request("https://internal/search", {
            method: "POST",
            body: JSON.stringify({
              action: "search",
              query: p.query,
              phone_number: p.phone_number,
              from_date: p.from_date,
              to_date: p.to_date,
              limit: p.limit,
            }),
          })
        );
        const data = await response.json();
        return success(data);
      }

      default:
        return { content: [{ type: "text", text: `Unknown webhook tool: ${toolName}` }], isError: true };
    }
  });
}
