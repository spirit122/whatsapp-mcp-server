// ─────────────────────────────────────────────
// Auto-Reply Tools — Configure AI-powered responses
// Enterprise only
// ─────────────────────────────────────────────

import type { Env, McpToolResult } from "../whatsapp/types";
import {
  getAutoReplyConfig,
  saveAutoReplyConfig,
  type AutoReplyConfig,
} from "../auto-reply/engine";

function success(data: unknown): McpToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export const autoReplyToolDefinitions = [
  {
    name: "configure_auto_reply",
    description:
      "Enterprise only. Configure AI-powered automatic replies to incoming WhatsApp messages. " +
      "Supports Claude (Anthropic), OpenAI (GPT), and Google Gemini. " +
      "Each client uses their own AI API key — you are not charged for AI calls.",
    inputSchema: {
      type: "object" as const,
      properties: {
        enabled: { type: "boolean", description: "Enable or disable auto-reply" },
        provider: {
          type: "string",
          enum: ["claude", "openai", "gemini", "deepseek", "groq"],
          description: "AI provider to use for generating replies",
        },
        api_key: {
          type: "string",
          description: "Your AI provider API key (Anthropic, OpenAI, or Google). Stored encrypted.",
        },
        model: {
          type: "string",
          description: "Model to use (optional). Defaults: claude-sonnet-4-20250514, gpt-4o, gemini-1.5-pro",
        },
        system_prompt: {
          type: "string",
          description:
            "Instructions for the AI. Example: 'You are a helpful customer service agent for Acme Store. " +
            "Answer questions about products, shipping, and returns. Be friendly and concise.'",
        },
        max_tokens: { type: "number", description: "Max response length (default 500)" },
        temperature: { type: "number", description: "Creativity 0-1 (default 0.7)" },
        memory_enabled: {
          type: "boolean",
          description: "Remember conversation history per customer (default true)",
        },
        max_history_messages: {
          type: "number",
          description: "Max messages to remember per conversation (default 10)",
        },
        business_hours_only: {
          type: "boolean",
          description: "Only auto-reply during business hours",
        },
        business_hours_start: { type: "number", description: "Start hour 0-23 (default 9)" },
        business_hours_end: { type: "number", description: "End hour 0-23 (default 18)" },
        off_hours_message: {
          type: "string",
          description: "Message to send outside business hours. Empty = no reply outside hours.",
        },
        max_replies_per_hour: {
          type: "number",
          description: "Max auto-replies per recipient per hour (default 20)",
        },
      },
      required: ["enabled"],
    },
  },
  {
    name: "get_auto_reply_status",
    description:
      "Enterprise only. Check current auto-reply configuration, including provider, model, " +
      "memory status, business hours, and rate limits.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "clear_conversation_history",
    description:
      "Enterprise only. Clear the AI conversation memory for a specific customer or all customers. " +
      "Use when you want the AI to start fresh with a customer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        phone_number: {
          type: "string",
          description: "Customer phone number to clear history for. Omit to clear ALL conversations.",
        },
      },
      required: [],
    },
  },
];

export async function handleAutoReplyTool(
  toolName: string,
  args: Record<string, unknown>,
  env: Env,
  clientId: string,
  tier: string
): Promise<McpToolResult> {
  if (tier !== "enterprise") {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: true,
          message: `${toolName} is Enterprise-only. Upgrade to enable AI-powered auto-replies.`,
          upgrade_url: "https://spirit122.lemonsqueezy.com/checkout/buy/1c83b498-baa7-41da-8500-601996487f86",
        }),
      }],
      isError: true,
    };
  }

  switch (toolName) {
    case "configure_auto_reply": {
      const existing = await getAutoReplyConfig(clientId, env);

      const config: AutoReplyConfig = {
        enabled: (args.enabled as boolean) ?? existing?.enabled ?? false,
        provider: (args.provider as "claude" | "openai" | "gemini" | "deepseek" | "groq") ?? existing?.provider ?? "claude",
        apiKey: (args.api_key as string) ?? existing?.apiKey ?? "",
        model: (args.model as string) ?? existing?.model,
        systemPrompt: (args.system_prompt as string) ?? existing?.systemPrompt ?? "You are a helpful assistant.",
        maxTokens: (args.max_tokens as number) ?? existing?.maxTokens ?? 500,
        temperature: (args.temperature as number) ?? existing?.temperature ?? 0.7,
        memoryEnabled: (args.memory_enabled as boolean) ?? existing?.memoryEnabled ?? true,
        maxHistoryMessages: (args.max_history_messages as number) ?? existing?.maxHistoryMessages ?? 10,
        businessHoursOnly: (args.business_hours_only as boolean) ?? existing?.businessHoursOnly ?? false,
        businessHoursStart: (args.business_hours_start as number) ?? existing?.businessHoursStart ?? 9,
        businessHoursEnd: (args.business_hours_end as number) ?? existing?.businessHoursEnd ?? 18,
        offHoursMessage: (args.off_hours_message as string) ?? existing?.offHoursMessage,
        maxRepliesPerHourPerRecipient: (args.max_replies_per_hour as number) ?? existing?.maxRepliesPerHourPerRecipient ?? 20,
      };

      // Validate API key is provided if enabling
      if (config.enabled && !config.apiKey) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: "API key is required to enable auto-reply. Provide your AI provider API key.",
            }),
          }],
          isError: true,
        };
      }

      await saveAutoReplyConfig(clientId, config, env);

      return success({
        message: config.enabled ? "Auto-reply ENABLED" : "Auto-reply DISABLED",
        config: {
          enabled: config.enabled,
          provider: config.provider,
          model: config.model || `default (${config.provider})`,
          systemPrompt: config.systemPrompt.substring(0, 100) + (config.systemPrompt.length > 100 ? "..." : ""),
          memoryEnabled: config.memoryEnabled,
          businessHoursOnly: config.businessHoursOnly,
          maxRepliesPerHour: config.maxRepliesPerHourPerRecipient,
          apiKeyConfigured: !!config.apiKey,
        },
      });
    }

    case "get_auto_reply_status": {
      const config = await getAutoReplyConfig(clientId, env);

      if (!config) {
        return success({
          enabled: false,
          message: "Auto-reply not configured. Use configure_auto_reply to set it up.",
        });
      }

      return success({
        enabled: config.enabled,
        provider: config.provider,
        model: config.model || `default`,
        systemPrompt: config.systemPrompt.substring(0, 200) + (config.systemPrompt.length > 200 ? "..." : ""),
        memoryEnabled: config.memoryEnabled,
        maxHistoryMessages: config.maxHistoryMessages,
        businessHoursOnly: config.businessHoursOnly,
        businessHours: config.businessHoursOnly
          ? `${config.businessHoursStart}:00 - ${config.businessHoursEnd}:00`
          : "24/7",
        offHoursMessage: config.offHoursMessage || "(no message)",
        maxRepliesPerHour: config.maxRepliesPerHourPerRecipient,
        apiKeyConfigured: !!config.apiKey,
        configuredAt: config.configuredAt,
      });
    }

    case "clear_conversation_history": {
      const phone = args.phone_number as string | undefined;

      if (phone) {
        const key = `convo:${clientId}:${phone.replace(/[\s\-\+\(\)]/g, "")}`;
        await env.CACHE.delete(key);
        return success({ message: `Conversation history cleared for ${phone}` });
      }

      // Clear all — list and delete all convo keys
      const listResult = await env.CACHE.list({ prefix: `convo:${clientId}:` });
      let deleted = 0;
      for (const key of listResult.keys) {
        await env.CACHE.delete(key.name);
        deleted++;
      }

      return success({ message: `Cleared ${deleted} conversation histories` });
    }

    default:
      return {
        content: [{ type: "text", text: JSON.stringify({ error: true, message: `Unknown tool: ${toolName}` }) }],
        isError: true,
      };
  }
}
