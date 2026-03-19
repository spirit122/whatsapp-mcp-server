// ─────────────────────────────────────────────
// MCP Protocol Handler
// Implements JSON-RPC 2.0 for Model Context Protocol
// Registers all 38 tools from 8 modules
// ─────────────────────────────────────────────

import type { Env, McpToolResult } from "./whatsapp/types";
import { WhatsAppClient } from "./whatsapp/client";
import { Logger } from "./utils/logger";
import { errorToMcpResult } from "./utils/errors";
import { requiresTier, type AuthContext } from "./auth/middleware";
import { D1Store } from "./storage/d1";
import { getTenantConfig, getEffectiveCredentials } from "./billing/tenant";
import { MessageGuard } from "./utils/message-guard";

// Tool definitions
import { messageToolDefinitions, handleMessageTool } from "./tools/messages";
import { interactiveToolDefinitions, handleInteractiveTool } from "./tools/interactive";
import { templateToolDefinitions, handleTemplateTool } from "./tools/templates";
import { mediaToolDefinitions, handleMediaTool } from "./tools/media";
import { webhookToolDefinitions, handleWebhookTool } from "./tools/webhooks";
import { profileToolDefinitions, handleProfileTool } from "./tools/profile";
import { flowToolDefinitions, handleFlowTool } from "./tools/flows";
import { analyticsToolDefinitions, handleAnalyticsTool } from "./tools/analytics";
import { safetyToolDefinitions, handleSafetyTool } from "./tools/safety";

// ── JSON-RPC Types ──

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ── All Tool Definitions Combined ──

export function getAllToolDefinitions() {
  return [
    ...messageToolDefinitions,
    ...interactiveToolDefinitions,
    ...templateToolDefinitions,
    ...mediaToolDefinitions,
    ...webhookToolDefinitions,
    ...profileToolDefinitions,
    ...flowToolDefinitions,
    ...analyticsToolDefinitions,
    ...safetyToolDefinitions,
  ];
}

// ── Tool Name to Module Mapping ──

const MESSAGE_TOOLS = new Set(messageToolDefinitions.map((t) => t.name));
const INTERACTIVE_TOOLS = new Set(interactiveToolDefinitions.map((t) => t.name));
const TEMPLATE_TOOLS = new Set(templateToolDefinitions.map((t) => t.name));
const MEDIA_TOOLS = new Set(mediaToolDefinitions.map((t) => t.name));
const WEBHOOK_TOOLS = new Set(webhookToolDefinitions.map((t) => t.name));
const PROFILE_TOOLS = new Set(profileToolDefinitions.map((t) => t.name));
const FLOW_TOOLS = new Set(flowToolDefinitions.map((t) => t.name));
const ANALYTICS_TOOLS = new Set(analyticsToolDefinitions.map((t) => t.name));
const SAFETY_TOOLS = new Set(safetyToolDefinitions.map((t) => t.name));

// Tools that SEND messages (need anti-spam guard)
const SENDING_TOOLS = new Set([
  "send_text_message", "send_image_message", "send_video_message",
  "send_audio_message", "send_document_message", "send_sticker_message",
  "send_location_message", "send_contact_message",
  "send_button_message", "send_list_message", "send_cta_url_button",
  "send_product_message", "send_product_list_message",
  "send_template_message", "send_flow_message",
]);

// ── MCP Server Class ──

export class McpServer {
  private env: Env;
  private client: WhatsAppClient;
  private logger: Logger;
  private d1Store: D1Store;
  private auth: AuthContext;
  private apiKey?: string;

  constructor(env: Env, auth: AuthContext, logger: Logger, apiKey?: string) {
    this.env = env;
    this.logger = logger;
    this.d1Store = new D1Store(env.DB);
    this.auth = auth;
    this.apiKey = apiKey;
    // Client is created with default credentials — will be overridden per-tenant in handleRequest
    this.client = new WhatsAppClient(env);
  }

  private tenantInitialized = false;

  /**
   * Initialize WhatsApp client with tenant-specific credentials if available
   */
  async initTenantClient(): Promise<void> {
    if (this.tenantInitialized) return;
    this.tenantInitialized = true;
    if (!this.apiKey) return;

    const tenant = await getTenantConfig(this.apiKey, this.env);
    if (tenant) {
      const creds = getEffectiveCredentials(tenant, this.env);
      // Create a modified env with tenant credentials
      const tenantEnv = {
        ...this.env,
        WHATSAPP_ACCESS_TOKEN: creds.accessToken,
        WHATSAPP_PHONE_NUMBER_ID: creds.phoneNumberId,
        WHATSAPP_BUSINESS_ACCOUNT_ID: creds.businessAccountId,
      };
      this.client = new WhatsAppClient(tenantEnv);
      this.logger.info("Using tenant-specific WhatsApp credentials", {
        clientId: tenant.clientId,
      });
    }
  }

  /**
   * Handle a JSON-RPC request
   */
  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { id, method, params } = request;

    // Ensure tenant client is initialized (idempotent — safe to call multiple times)
    await this.initTenantClient();

    try {
      switch (method) {
        case "initialize":
          return this.handleInitialize(id);

        case "tools/list":
          return this.handleToolsList(id);

        case "tools/call":
          return await this.handleToolCall(id, params || {});

        case "ping":
          return { jsonrpc: "2.0", id, result: { status: "ok" } };

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
          };
      }
    } catch (err) {
      this.logger.error("MCP request failed", {
        method,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : "Internal error",
        },
      };
    }
  }

  /**
   * Handle initialize — return server capabilities
   */
  private handleInitialize(id: string | number): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: this.env.MCP_SERVER_NAME || "whatsapp-business-mcp",
          version: this.env.MCP_SERVER_VERSION || "1.0.0",
          description:
            "The most complete MCP Server for WhatsApp Business Cloud API. " +
            "38 tools across 8 modules: messaging, interactive, templates, media, " +
            "webhooks, business profile, WhatsApp Flows, and analytics.",
        },
      },
    };
  }

  /**
   * Handle tools/list — return available tools based on tier
   */
  private handleToolsList(id: string | number): JsonRpcResponse {
    const allTools = getAllToolDefinitions();

    // Filter tools by tier
    const availableTools = allTools.filter((tool) =>
      requiresTier(tool.name, this.auth.tier)
    );

    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: availableTools,
      },
    };
  }

  /**
   * Handle tools/call — execute a tool
   */
  private async handleToolCall(
    id: string | number,
    params: Record<string, unknown>
  ): Promise<JsonRpcResponse> {
    const toolName = params.name as string;
    const toolArgs = (params.arguments as Record<string, unknown>) || {};
    const startTime = Date.now();

    this.logger.info("Tool call", { tool: toolName, tier: this.auth.tier });

    // Check tier access
    if (!requiresTier(toolName, this.auth.tier)) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: true,
                message: `Tool '${toolName}' requires a higher tier. Current: ${this.auth.tier}. Upgrade at https://whatsapp-mcp.yourdomain.com/pricing`,
              }),
            },
          ],
          isError: true,
        },
      };
    }

    // ── Anti-spam guard for sending tools ──
    if (SENDING_TOOLS.has(toolName)) {
      const recipientPhone = toolArgs.to as string;
      if (recipientPhone) {
        const guard = new MessageGuard(this.env, {
          clientId: this.auth.clientId,
          tier: this.auth.tier,
        });
        const check = await guard.checkSend(
          recipientPhone,
          (toolArgs.body as string) || undefined
        );
        if (!check.allowed) {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [{
                type: "text",
                text: JSON.stringify({
                  error: true,
                  blocked: true,
                  reason: check.reason,
                  tip: "Use manage_allowlist tool to configure allowed recipients, or get_messaging_safety_status to check your limits.",
                }),
              }],
              isError: true,
            },
          };
        }
      }
    }

    // Route to appropriate handler
    let result: McpToolResult;

    try {
      if (MESSAGE_TOOLS.has(toolName)) {
        result = await handleMessageTool(toolName, toolArgs, this.client);
      } else if (INTERACTIVE_TOOLS.has(toolName)) {
        result = await handleInteractiveTool(toolName, toolArgs, this.client);
      } else if (TEMPLATE_TOOLS.has(toolName)) {
        result = await handleTemplateTool(toolName, toolArgs, this.client);
      } else if (MEDIA_TOOLS.has(toolName)) {
        result = await handleMediaTool(toolName, toolArgs, this.client);
      } else if (WEBHOOK_TOOLS.has(toolName)) {
        result = await handleWebhookTool(toolName, toolArgs, this.env, this.auth.clientId);
      } else if (PROFILE_TOOLS.has(toolName)) {
        result = await handleProfileTool(toolName, toolArgs, this.client);
      } else if (FLOW_TOOLS.has(toolName)) {
        result = await handleFlowTool(toolName, toolArgs, this.client);
      } else if (ANALYTICS_TOOLS.has(toolName)) {
        result = await handleAnalyticsTool(toolName, toolArgs, this.client, this.env.DB);
      } else if (SAFETY_TOOLS.has(toolName)) {
        result = await handleSafetyTool(toolName, toolArgs, this.env, this.auth.clientId, this.auth.tier);
      } else {
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: true,
                message: `Unknown tool: ${toolName}`,
                available_tools: getAllToolDefinitions().map((t) => t.name),
              }),
            },
          ],
          isError: true,
        };
      }
    } catch (err) {
      result = errorToMcpResult(err);
    }

    // Record successful send for rate limiting
    if (SENDING_TOOLS.has(toolName) && !result.isError) {
      const recipientPhone = toolArgs.to as string;
      if (recipientPhone) {
        try {
          const guard = new MessageGuard(this.env, {
            clientId: this.auth.clientId,
            tier: this.auth.tier,
          });
          await guard.recordSend(recipientPhone);
        } catch { /* don't fail the send if recording fails */ }
      }
    }

    // Log tool usage
    const duration = Date.now() - startTime;
    try {
      await this.d1Store.logToolUsage({
        client_id: this.auth.clientId,
        tool_name: toolName,
        tier: this.auth.tier,
        success: !result.isError,
        duration_ms: duration,
      });
    } catch {
      // Don't fail the tool call if logging fails
    }

    return { jsonrpc: "2.0", id, result };
  }
}
