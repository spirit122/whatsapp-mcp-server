// ─────────────────────────────────────────────
// Safety Tools — Allowlist management
// ─────────────────────────────────────────────

import type { Env, McpToolResult } from "../whatsapp/types";
import { MessageGuard } from "../utils/message-guard";
import { z } from "zod";

// ── Tool Definitions ──

export const safetyToolDefinitions = [
  {
    name: "manage_allowlist",
    description:
      "Add or remove phone numbers from your recipient allowlist. When enabled, messages can only be sent to numbers on the list. Use action 'add' to add numbers, 'remove' to remove, 'list' to view current allowlist, 'enable' to turn on, 'disable' to turn off.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["add", "remove", "list", "enable", "disable"],
          description: "Action to perform on the allowlist",
        },
        phone_numbers: {
          type: "array",
          items: { type: "string" },
          description: "Phone numbers to add/remove (with country code, e.g. '56936538600')",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "get_messaging_safety_status",
    description:
      "Check your current messaging safety settings including allowlist status, rate limits, and usage this hour.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ── Schemas ──

const manageAllowlistSchema = z.object({
  action: z.enum(["add", "remove", "list", "enable", "disable"]),
  phone_numbers: z.array(z.string()).optional(),
});

// ── Handler ──

export async function handleSafetyTool(
  toolName: string,
  args: Record<string, unknown>,
  env: Env,
  clientId: string,
  tier: "free" | "pro" | "enterprise"
): Promise<McpToolResult> {
  const guard = new MessageGuard(env, { clientId, tier });

  switch (toolName) {
    case "manage_allowlist": {
      const parsed = manageAllowlistSchema.parse(args);

      switch (parsed.action) {
        case "add": {
          if (!parsed.phone_numbers?.length) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: true, message: "Provide phone_numbers to add" }) }],
              isError: true,
            };
          }
          await guard.addToAllowlist(parsed.phone_numbers);
          await guard.setAllowlistEnabled(true);
          const list = await guard.getAllowlist();
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Added ${parsed.phone_numbers.length} number(s) to allowlist. Allowlist is now enabled.`,
                allowlist: list,
                allowlist_enabled: true,
              }),
            }],
          };
        }
        case "remove": {
          if (!parsed.phone_numbers?.length) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: true, message: "Provide phone_numbers to remove" }) }],
              isError: true,
            };
          }
          await guard.removeFromAllowlist(parsed.phone_numbers);
          const list = await guard.getAllowlist();
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Removed ${parsed.phone_numbers.length} number(s) from allowlist.`,
                allowlist: list,
              }),
            }],
          };
        }
        case "list": {
          const list = await guard.getAllowlist();
          const enabled = await guard.isAllowlistEnabled();
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                allowlist_enabled: enabled,
                allowlist: list,
                count: list.length,
              }),
            }],
          };
        }
        case "enable": {
          await guard.setAllowlistEnabled(true);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Allowlist enabled. Messages can only be sent to numbers on your allowlist.",
              }),
            }],
          };
        }
        case "disable": {
          await guard.setAllowlistEnabled(false);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Allowlist disabled. Messages can be sent to any number (subject to rate limits).",
              }),
            }],
          };
        }
      }
      break;
    }

    case "get_messaging_safety_status": {
      const enabled = await guard.isAllowlistEnabled();
      const allowlist = await guard.getAllowlist();
      const rateLimits = {
        free: { per_recipient_per_hour: 5, unique_recipients_per_hour: 3 },
        pro: { per_recipient_per_hour: 30, unique_recipients_per_hour: 50 },
        enterprise: { per_recipient_per_hour: 100, unique_recipients_per_hour: 500 },
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            tier,
            allowlist_enabled: enabled,
            allowlist_count: allowlist.length,
            rate_limits: rateLimits[tier],
            spam_filter: "enabled (blocked patterns active)",
            protections: [
              "Per-recipient rate limiting",
              "Unique recipient limit per hour",
              "Spam content detection",
              enabled ? "Allowlist filtering (ON)" : "Allowlist filtering (OFF)",
            ],
          }),
        }],
      };
    }
  }

  return {
    content: [{ type: "text", text: JSON.stringify({ error: true, message: `Unknown safety tool: ${toolName}` }) }],
    isError: true,
  };
}
