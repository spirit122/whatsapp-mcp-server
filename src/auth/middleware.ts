// ─────────────────────────────────────────────
// Authentication Middleware
// Validates requests and manages API keys
// ─────────────────────────────────────────────

import type { Env } from "../whatsapp/types";
import { AuthenticationError } from "../utils/errors";
import { Logger } from "../utils/logger";

export interface AuthContext {
  clientId: string;
  tier: "free" | "pro" | "enterprise";
  phoneNumberId: string;
  wabaId: string;
}

/**
 * Validate the incoming request has proper authentication.
 * For MCP servers, this typically validates:
 * 1. The WhatsApp access token is configured
 * 2. The request has a valid API key (for our tier system)
 */
export async function authenticate(
  request: Request,
  env: Env,
  logger: Logger
): Promise<AuthContext> {
  // Verify WhatsApp token is configured
  if (!env.WHATSAPP_ACCESS_TOKEN) {
    throw new AuthenticationError(
      "WHATSAPP_ACCESS_TOKEN is not configured. Set it using: wrangler secret put WHATSAPP_ACCESS_TOKEN"
    );
  }

  if (!env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new AuthenticationError(
      "WHATSAPP_PHONE_NUMBER_ID is not configured. Set it using: wrangler secret put WHATSAPP_PHONE_NUMBER_ID"
    );
  }

  if (!env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
    throw new AuthenticationError(
      "WHATSAPP_BUSINESS_ACCOUNT_ID is not configured. Set it using: wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID"
    );
  }

  // Check for API key in header (for tier-based access)
  const apiKey = request.headers.get("X-API-Key");
  let tier: AuthContext["tier"] = "free";
  let clientId = "anonymous";

  if (apiKey) {
    const keyData = await validateApiKey(apiKey, env);
    if (!keyData) {
      throw new AuthenticationError(
        "Invalid or deactivated API key. Check your key or purchase a plan at https://github.com/spirit122/whatsapp-mcp-server"
      );
    }
    tier = keyData.tier;
    clientId = keyData.clientId;
  }

  logger.info("Request authenticated", { clientId, tier });

  return {
    clientId,
    tier,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    wabaId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  };
}

/**
 * Validate an API key against KV storage
 */
async function validateApiKey(
  apiKey: string,
  env: Env
): Promise<{ clientId: string; tier: AuthContext["tier"] } | null> {
  try {
    const keyData = await env.CACHE.get(`apikey:${apiKey}`, "json") as {
      clientId: string;
      tier: AuthContext["tier"];
      active: boolean;
    } | null;

    if (!keyData || !keyData.active) {
      return null;
    }

    return { clientId: keyData.clientId, tier: keyData.tier };
  } catch {
    return null;
  }
}

/**
 * Async HMAC-SHA256 verification for webhook signatures (timing-safe)
 */
export async function verifyWebhookSignatureAsync(
  body: string,
  signature: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expectedHash = signature.slice(7);

  const { verifyHmacSha256 } = await import("../utils/crypto");
  return verifyHmacSha256(body, expectedHash, appSecret);
}

/**
 * Check if a tool requires a specific tier
 */
export function requiresTier(
  toolName: string,
  currentTier: AuthContext["tier"]
): boolean {
  // FREE (5 tools): send_text_message, get_business_profile, get_phone_numbers,
  //                  list_templates, send_template_message

  const PRO_TOOLS = new Set([
    // Messages (7 media types + 2 actions)
    "send_image_message",
    "send_video_message",
    "send_audio_message",
    "send_document_message",
    "send_sticker_message",
    "send_location_message",
    "send_contact_message",
    "send_reaction",
    "mark_as_read",
    // Interactive (3 basic)
    "send_button_message",
    "send_list_message",
    "send_cta_url_button",
    // Templates (3 management)
    "create_template",
    "delete_template",
    "get_template_status",
    // Media (3)
    "upload_media",
    "get_media_url",
    "delete_media",
    // Webhooks (2 basic)
    "get_recent_messages",
    "get_message_status_updates",
  ]);

  const ENTERPRISE_TOOLS = new Set([
    // Catalog/Commerce (2)
    "send_product_message",
    "send_product_list_message",
    // Advanced webhooks (1)
    "search_conversations",
    // Profile management (1)
    "update_business_profile",
    // WhatsApp Flows (2)
    "create_flow",
    "send_flow_message",
    // Analytics (4)
    "get_conversation_analytics",
    "get_phone_quality_rating",
    "get_messaging_limits",
    "get_delivery_stats",
  ]);

  const tierLevel = { free: 0, pro: 1, enterprise: 2 };

  if (ENTERPRISE_TOOLS.has(toolName)) {
    return tierLevel[currentTier] >= 2;
  }

  if (PRO_TOOLS.has(toolName)) {
    return tierLevel[currentTier] >= 1;
  }

  return true; // Free tools available to all
}
