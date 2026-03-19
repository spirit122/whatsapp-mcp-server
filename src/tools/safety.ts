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
  // ── Enterprise-only Safety Tools ──
  {
    name: "get_message_audit_log",
    description:
      "Enterprise only. View a detailed audit log of all messages sent through your account. Includes timestamps, recipients, message types, delivery status, and which AI tool triggered the send. Essential for compliance and monitoring.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max results (default 50, max 200)", default: 50 },
        recipient: { type: "string", description: "Filter by recipient phone number (optional)" },
        status: { type: "string", enum: ["sent", "delivered", "read", "failed", "all"], description: "Filter by delivery status", default: "all" },
        date_from: { type: "string", description: "Start date YYYY-MM-DD (optional)" },
        date_to: { type: "string", description: "End date YYYY-MM-DD (optional)" },
      },
      required: [],
    },
  },
  {
    name: "set_custom_rate_limits",
    description:
      "Enterprise only. Override default rate limits with custom values. Set per-recipient limits, unique recipient caps, and message type restrictions for your account.",
    inputSchema: {
      type: "object" as const,
      properties: {
        max_messages_per_recipient_per_hour: { type: "number", description: "Max messages to same number per hour (1-500)", default: 100 },
        max_unique_recipients_per_hour: { type: "number", description: "Max different numbers per hour (1-2000)", default: 500 },
        allowed_message_types: {
          type: "array",
          items: { type: "string", enum: ["text", "image", "video", "audio", "document", "sticker", "location", "contacts", "interactive", "template"] },
          description: "Restrict which message types can be sent. Empty = all allowed.",
        },
        custom_blocked_patterns: {
          type: "array",
          items: { type: "string" },
          description: "Add custom regex patterns to block (in addition to built-in spam patterns)",
        },
      },
      required: [],
    },
  },
  {
    name: "export_safety_report",
    description:
      "Enterprise only. Generate a comprehensive safety and compliance report for your account. Includes message volume, top recipients, blocked messages, rate limit hits, allowlist changes, and risk score. Export as JSON for integration with your compliance systems.",
    inputSchema: {
      type: "object" as const,
      properties: {
        period: { type: "string", enum: ["today", "7d", "30d", "90d"], description: "Report period", default: "7d" },
      },
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

    // ── Enterprise-only tools ──

    case "get_message_audit_log": {
      if (tier !== "enterprise") {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: true, message: "get_message_audit_log is Enterprise-only. Upgrade to access audit logs." }) }],
          isError: true,
        };
      }

      const limit = Math.min(Number(args.limit) || 50, 200);
      const recipient = args.recipient as string | undefined;
      const status = (args.status as string) || "all";
      const dateFrom = args.date_from as string | undefined;
      const dateTo = args.date_to as string | undefined;

      // Query D1 for audit log
      let query = "SELECT * FROM tool_usage WHERE client_id = ?";
      const params: string[] = [clientId];

      if (recipient) {
        query += " AND tool_args LIKE ?";
        params.push(`%${recipient}%`);
      }
      if (status !== "all") {
        query += " AND success = ?";
        params.push(status === "failed" ? "0" : "1");
      }
      if (dateFrom) {
        query += " AND created_at >= ?";
        params.push(dateFrom);
      }
      if (dateTo) {
        query += " AND created_at <= ?";
        params.push(dateTo + "T23:59:59Z");
      }

      query += " ORDER BY created_at DESC LIMIT ?";
      params.push(String(limit));

      try {
        const results = await env.DB.prepare(query).bind(...params).all();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              audit_log: results.results || [],
              count: results.results?.length || 0,
              total_available: results.results?.length === limit ? `${limit}+ (use limit param to see more)` : results.results?.length,
              filters: { recipient, status, dateFrom, dateTo, limit },
            }),
          }],
        };
      } catch {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              audit_log: [],
              count: 0,
              message: "Audit log is being populated. Recent tool calls will appear here.",
            }),
          }],
        };
      }
    }

    case "set_custom_rate_limits": {
      if (tier !== "enterprise") {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: true, message: "set_custom_rate_limits is Enterprise-only. Upgrade to customize rate limits." }) }],
          isError: true,
        };
      }

      const customConfig: Record<string, unknown> = {};

      const maxPerRecipient = Number(args.max_messages_per_recipient_per_hour);
      if (maxPerRecipient && maxPerRecipient >= 1 && maxPerRecipient <= 500) {
        customConfig.max_messages_per_recipient_per_hour = maxPerRecipient;
      }

      const maxUnique = Number(args.max_unique_recipients_per_hour);
      if (maxUnique && maxUnique >= 1 && maxUnique <= 2000) {
        customConfig.max_unique_recipients_per_hour = maxUnique;
      }

      const allowedTypes = args.allowed_message_types as string[] | undefined;
      if (allowedTypes && allowedTypes.length > 0) {
        customConfig.allowed_message_types = allowedTypes;
      }

      const customPatterns = args.custom_blocked_patterns as string[] | undefined;
      if (customPatterns && customPatterns.length > 0) {
        customConfig.custom_blocked_patterns = customPatterns;
      }

      // Save to KV
      const configKey = `custom_safety:${clientId}`;
      const existing = await env.CACHE.get(configKey, "json") as Record<string, unknown> | null;
      const merged = { ...(existing || {}), ...customConfig, updated_at: new Date().toISOString() };
      await env.CACHE.put(configKey, JSON.stringify(merged));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Custom rate limits saved.",
            config: merged,
          }),
        }],
      };
    }

    case "export_safety_report": {
      if (tier !== "enterprise") {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: true, message: "export_safety_report is Enterprise-only. Upgrade for compliance reports." }) }],
          isError: true,
        };
      }

      const period = (args.period as string) || "7d";
      const daysMap: Record<string, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[period] || 7;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      // Gather stats
      let totalSent = 0, totalBlocked = 0, totalFailed = 0;
      const topRecipients: Record<string, number> = {};

      try {
        const usageResults = await env.DB.prepare(
          "SELECT tool_name, success, COUNT(*) as count FROM tool_usage WHERE client_id = ? AND created_at >= ? GROUP BY tool_name, success"
        ).bind(clientId, since).all();

        for (const row of (usageResults.results || []) as { tool_name: string; success: number; count: number }[]) {
          if (row.success) totalSent += row.count;
          else totalFailed += row.count;
        }
      } catch {
        // DB may not have data yet
      }

      // Check blocked messages count
      const blockedKey = `blocked_count:${clientId}`;
      const blockedRaw = await env.CACHE.get(blockedKey);
      totalBlocked = blockedRaw ? parseInt(blockedRaw) : 0;

      // Get allowlist info
      const allowlist = await guard.getAllowlist();
      const allowlistEnabled = await guard.isAllowlistEnabled();

      // Get custom config if any
      const customConfigKey = `custom_safety:${clientId}`;
      const customSafetyConfig = await env.CACHE.get(customConfigKey, "json");

      // Calculate risk score (0-100, lower is better)
      let riskScore = 20; // base
      if (!allowlistEnabled) riskScore += 20;
      if (allowlist.length === 0 && allowlistEnabled) riskScore -= 10;
      if (totalBlocked > 0) riskScore += Math.min(totalBlocked * 2, 30);
      if (totalFailed > totalSent * 0.1) riskScore += 15;
      if (customSafetyConfig) riskScore -= 10;
      riskScore = Math.max(0, Math.min(100, riskScore));

      const riskLevel = riskScore < 30 ? "LOW" : riskScore < 60 ? "MEDIUM" : "HIGH";

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            report: {
              period,
              generated_at: new Date().toISOString(),
              account: clientId,
              tier: "enterprise",
            },
            volume: {
              messages_sent: totalSent,
              messages_failed: totalFailed,
              messages_blocked: totalBlocked,
              success_rate: totalSent > 0 ? `${((totalSent / (totalSent + totalFailed)) * 100).toFixed(1)}%` : "N/A",
            },
            safety: {
              allowlist_enabled: allowlistEnabled,
              allowlist_size: allowlist.length,
              custom_rate_limits: customSafetyConfig ? true : false,
              risk_score: riskScore,
              risk_level: riskLevel,
            },
            recommendations: [
              ...(!allowlistEnabled ? ["Enable recipient allowlist for better control"] : []),
              ...(totalBlocked > 10 ? ["High number of blocked messages — review your messaging patterns"] : []),
              ...(totalFailed > totalSent * 0.1 ? ["High failure rate — check your WhatsApp number quality"] : []),
              ...(!customSafetyConfig ? ["Set custom rate limits with set_custom_rate_limits for tighter control"] : []),
              ...(riskScore < 30 ? ["Your account has a LOW risk score — great job!"] : []),
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
