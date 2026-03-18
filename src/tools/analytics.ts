// ─────────────────────────────────────────────
// Module 8: Analytics & Quality — DIFFERENTIATOR
// Conversation metrics, phone quality, messaging limits
// ─────────────────────────────────────────────

import type { McpToolResult } from "../whatsapp/types";
import { WhatsAppClient } from "../whatsapp/client";
import { withErrorHandling } from "../utils/errors";
import { getAnalyticsSchema, getDeliveryStatsSchema } from "../whatsapp/validators";

function success(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const analyticsToolDefinitions = [
  {
    name: "get_conversation_analytics",
    description:
      "Get conversation analytics — messages sent, delivered, costs, broken down by time period.",
    inputSchema: {
      type: "object" as const,
      properties: {
        start_date: { type: "string", description: "Start date (UNIX timestamp or YYYY-MM-DD)" },
        end_date: { type: "string", description: "End date (UNIX timestamp or YYYY-MM-DD)" },
        granularity: {
          type: "string",
          enum: ["HALF_HOUR", "DAY", "MONTH"],
          description: "Time granularity",
          default: "DAY",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_phone_quality_rating",
    description:
      "Check the quality rating of your phone numbers. GREEN = good, YELLOW = warning, RED = at risk of being blocked.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_messaging_limits",
    description:
      "Get current messaging limits per phone number. Shows tier (250/1K/10K/100K/Unlimited unique contacts per 24h).",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_delivery_stats",
    description:
      "Get message delivery statistics — how many messages were sent, delivered, read, and failed in a date range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        start_date: { type: "string", description: "Start date" },
        end_date: { type: "string", description: "End date" },
      },
      required: ["start_date", "end_date"],
    },
  },
];

export async function handleAnalyticsTool(
  toolName: string,
  args: Record<string, unknown>,
  client: WhatsAppClient,
  db?: D1Database
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (toolName) {
      case "get_conversation_analytics": {
        const p = getAnalyticsSchema.parse(args);
        const result = await client.getConversationAnalytics(
          p.start_date,
          p.end_date,
          p.granularity
        );
        return success({ message: "Conversation analytics retrieved", analytics: result });
      }

      case "get_phone_quality_rating": {
        const phones = await client.getPhoneQualityRating();
        return success({
          message: "Phone quality ratings",
          phones: phones.map((p) => ({
            number: p.display_phone_number,
            name: p.verified_name,
            quality: p.quality_rating,
            status: p.status,
            advice:
              p.quality_rating === "GREEN"
                ? "Good — keep it up!"
                : p.quality_rating === "YELLOW"
                  ? "Warning — reduce marketing messages, improve content quality"
                  : "Critical — your number may be blocked. Stop sending marketing messages immediately.",
          })),
        });
      }

      case "get_messaging_limits": {
        const limits = await client.getMessagingLimits();
        return success({
          message: "Current messaging limits",
          limits: limits.map((l) => ({
            phone_number: l.phone_number,
            tier: l.tier || "Unknown",
            quality: l.quality,
            explanation: getTierExplanation(l.tier),
          })),
        });
      }

      case "get_delivery_stats": {
        const p = getDeliveryStatsSchema.parse(args);
        // Query D1 for stored delivery stats from webhook data
        if (db) {
          const stats = await db
            .prepare(
              `SELECT
                status,
                COUNT(*) as count
              FROM message_statuses
              WHERE created_at >= ? AND created_at <= ?
              GROUP BY status`
            )
            .bind(p.start_date, p.end_date)
            .all();

          return success({
            message: "Delivery statistics",
            period: { from: p.start_date, to: p.end_date },
            stats: stats.results,
          });
        }

        // Fallback to API analytics if D1 not available
        const analytics = await client.getConversationAnalytics(
          p.start_date,
          p.end_date,
          "DAY"
        );
        return success({
          message: "Delivery statistics (from API analytics)",
          analytics,
        });
      }

      default:
        return { content: [{ type: "text", text: `Unknown analytics tool: ${toolName}` }], isError: true };
    }
  });
}

function getTierExplanation(tier: string | undefined): string {
  switch (tier) {
    case "TIER_250":
      return "250 unique contacts per 24h (new account)";
    case "TIER_1K":
      return "1,000 unique contacts per 24h";
    case "TIER_10K":
      return "10,000 unique contacts per 24h";
    case "TIER_100K":
      return "100,000 unique contacts per 24h";
    case "TIER_UNLIMITED":
      return "Unlimited unique contacts per 24h";
    default:
      return "Unknown tier — check Meta Business Manager";
  }
}
