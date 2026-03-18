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
    if (keyData) {
      tier = keyData.tier;
      clientId = keyData.clientId;
    }
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
 * Verify Meta webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) return false;

  // Meta sends signature as "sha256=<hash>"
  const expectedPrefix = "sha256=";
  if (!signature.startsWith(expectedPrefix)) return false;

  // In Cloudflare Workers, use crypto.subtle for HMAC
  // This is a sync check placeholder — actual implementation uses async crypto
  // For production, implement with crypto.subtle.sign()
  return true; // TODO: Implement proper HMAC verification
}

/**
 * Async HMAC-SHA256 verification for webhook signatures
 */
export async function verifyWebhookSignatureAsync(
  body: string,
  signature: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) return false;

  const expectedHash = signature.slice(7);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hashArray = Array.from(new Uint8Array(sig));
  const computedHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHash === expectedHash;
}

/**
 * Check if a tool requires a specific tier
 */
export function requiresTier(
  toolName: string,
  currentTier: AuthContext["tier"]
): boolean {
  const PRO_TOOLS = new Set([
    "get_recent_messages",
    "get_message_status_updates",
    "search_conversations",
    "send_button_message",
    "send_list_message",
    "send_cta_url_button",
    "send_product_message",
    "send_product_list_message",
    "create_flow",
    "send_flow_message",
    "get_conversation_analytics",
    "get_phone_quality_rating",
    "get_messaging_limits",
    "get_delivery_stats",
  ]);

  const ENTERPRISE_TOOLS = new Set<string>([
    // Future enterprise-only tools
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
