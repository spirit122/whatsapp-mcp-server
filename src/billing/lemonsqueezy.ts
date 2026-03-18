// ─────────────────────────────────────────────
// Lemonsqueezy Billing Integration
// Handles webhooks, subscription management,
// and API key generation for paid tiers
// ─────────────────────────────────────────────

import type { Env } from "../whatsapp/types";
import { Logger } from "../utils/logger";

// ── Lemonsqueezy Webhook Event Types ──

interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: {
      email?: string;
      client_id?: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      customer_id: number;
      order_id?: number;
      product_id: number;
      variant_id: number;
      product_name: string;
      variant_name: string;
      status: string;
      user_name: string;
      user_email: string;
      card_brand?: string;
      card_last_four?: string;
      renews_at?: string;
      ends_at?: string;
      created_at: string;
      updated_at: string;
      first_subscription_item?: {
        id: number;
        price_id: number;
      };
    };
  };
}

// ── API Key Data Structure ──

interface ApiKeyData {
  clientId: string;
  email: string;
  tier: "free" | "pro" | "enterprise";
  active: boolean;
  subscriptionId: string;
  customerId: number;
  productName: string;
  createdAt: string;
  expiresAt?: string;
}

// ── Variant ID to Tier Mapping ──
// You'll set these after creating products in Lemonsqueezy

interface TierConfig {
  variantIds: {
    pro: number[];
    enterprise: number[];
  };
}

// ── Webhook Handler ──

export async function handleLemonSqueezyWebhook(
  request: Request,
  env: Env,
  logger: Logger
): Promise<Response> {
  const body = await request.text();

  // Verify webhook signature
  const signature = request.headers.get("x-signature");
  if (env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    const isValid = await verifyLemonSignature(
      body,
      signature,
      env.LEMONSQUEEZY_WEBHOOK_SECRET
    );
    if (!isValid) {
      logger.warn("Invalid Lemonsqueezy webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  const event: LemonSqueezyWebhookEvent = JSON.parse(body);
  const eventName = event.meta.event_name;
  const attrs = event.data.attributes;

  logger.info("Lemonsqueezy webhook received", {
    event: eventName,
    email: attrs.user_email,
    product: attrs.product_name,
  });

  switch (eventName) {
    case "subscription_created":
    case "subscription_resumed":
    case "subscription_unpaused": {
      // New subscription or reactivated — generate API key
      const tier = getTierFromVariant(attrs.variant_id, env);
      const apiKey = await generateApiKey();
      const keyData: ApiKeyData = {
        clientId: `ls_${attrs.customer_id}`,
        email: attrs.user_email,
        tier,
        active: true,
        subscriptionId: event.data.id,
        customerId: attrs.customer_id,
        productName: attrs.product_name,
        createdAt: new Date().toISOString(),
      };

      // Store API key in KV
      await env.CACHE.put(`apikey:${apiKey}`, JSON.stringify(keyData));

      // Store reverse lookup: email -> api key
      await env.CACHE.put(`email:${attrs.user_email}`, JSON.stringify({
        apiKey,
        tier,
        subscriptionId: event.data.id,
      }));

      // Store reverse lookup: subscription -> api key
      await env.CACHE.put(`sub:${event.data.id}`, apiKey);

      // Log to D1
      try {
        await env.DB.prepare(
          `INSERT INTO api_keys (key_hash, client_id, tier, active)
           VALUES (?, ?, ?, 1)`
        ).bind(hashKey(apiKey), `ls_${attrs.customer_id}`, tier).run();
      } catch { /* ignore duplicate */ }

      logger.info("API key generated for new subscription", {
        email: attrs.user_email,
        tier,
        subscriptionId: event.data.id,
      });

      // TODO: Send API key to customer via email
      // For now, they can retrieve it from the dashboard
      // or we store it and show it in a customer portal

      return Response.json({
        success: true,
        message: "Subscription activated",
        tier,
      });
    }

    case "subscription_updated": {
      // Plan change (upgrade/downgrade)
      const existingKey = await env.CACHE.get(`sub:${event.data.id}`);
      if (existingKey) {
        const keyData = await env.CACHE.get(`apikey:${existingKey}`, "json") as ApiKeyData | null;
        if (keyData) {
          const newTier = getTierFromVariant(attrs.variant_id, env);
          keyData.tier = newTier;
          keyData.active = attrs.status === "active";
          await env.CACHE.put(`apikey:${existingKey}`, JSON.stringify(keyData));

          logger.info("Subscription updated", {
            email: attrs.user_email,
            newTier,
            status: attrs.status,
          });
        }
      }

      return Response.json({ success: true, message: "Subscription updated" });
    }

    case "subscription_cancelled":
    case "subscription_paused":
    case "subscription_expired": {
      // Deactivate API key
      const existingKey = await env.CACHE.get(`sub:${event.data.id}`);
      if (existingKey) {
        const keyData = await env.CACHE.get(`apikey:${existingKey}`, "json") as ApiKeyData | null;
        if (keyData) {
          keyData.active = false;
          await env.CACHE.put(`apikey:${existingKey}`, JSON.stringify(keyData));

          // Update D1
          try {
            await env.DB.prepare(
              `UPDATE api_keys SET active = 0 WHERE client_id = ?`
            ).bind(keyData.clientId).run();
          } catch { /* ignore */ }

          logger.info("Subscription deactivated", {
            email: attrs.user_email,
            event: eventName,
          });
        }
      }

      return Response.json({ success: true, message: "Subscription deactivated" });
    }

    case "subscription_payment_success": {
      // Payment successful — ensure key is active
      const existingKey = await env.CACHE.get(`sub:${event.data.id}`);
      if (existingKey) {
        const keyData = await env.CACHE.get(`apikey:${existingKey}`, "json") as ApiKeyData | null;
        if (keyData && !keyData.active) {
          keyData.active = true;
          await env.CACHE.put(`apikey:${existingKey}`, JSON.stringify(keyData));
        }
      }
      return Response.json({ success: true, message: "Payment recorded" });
    }

    case "subscription_payment_failed": {
      // Payment failed — mark key as at risk (don't deactivate immediately)
      logger.warn("Subscription payment failed", {
        email: attrs.user_email,
        subscriptionId: event.data.id,
      });
      return Response.json({ success: true, message: "Payment failure recorded" });
    }

    default:
      logger.info("Unhandled Lemonsqueezy event", { event: eventName });
      return Response.json({ success: true, message: `Event ${eventName} noted` });
  }
}

// ── API Key Retrieval (for customer portal) ──

export async function handleGetApiKey(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return Response.json({ error: "Email parameter required" }, { status: 400 });
  }

  const data = await env.CACHE.get(`email:${email}`, "json") as {
    apiKey: string;
    tier: string;
    subscriptionId: string;
  } | null;

  if (!data) {
    return Response.json({
      error: "No subscription found for this email",
      hint: "Purchase a plan at our website first",
    }, { status: 404 });
  }

  // Mask the API key for security (show first 8 and last 4 chars)
  const masked = data.apiKey.slice(0, 8) + "..." + data.apiKey.slice(-4);

  return Response.json({
    email,
    tier: data.tier,
    apiKey: data.apiKey,
    apiKeyMasked: masked,
    subscriptionId: data.subscriptionId,
    usage: {
      configure: `Add header "X-API-Key: ${masked}" to your MCP requests`,
      claude_config: {
        mcpServers: {
          whatsapp: {
            type: "sse",
            url: "https://whatsapp-mcp-server.eosspirit.workers.dev/mcp",
            headers: {
              "X-API-Key": data.apiKey,
            },
          },
        },
      },
    },
  });
}

// ── Helper Functions ──

async function generateApiKey(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `wmcp_${key}`;
}

function hashKey(apiKey: string): string {
  // Simple hash for DB storage (not the actual key)
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

function getTierFromVariant(
  variantId: number,
  env: Env
): "pro" | "enterprise" {
  // Check environment variable for variant mapping
  // Format: PRO_VARIANT_IDS=123,456 ENTERPRISE_VARIANT_IDS=789
  const proIds = (env as any).PRO_VARIANT_IDS?.split(",").map(Number) || [];
  const enterpriseIds = (env as any).ENTERPRISE_VARIANT_IDS?.split(",").map(Number) || [];

  if (enterpriseIds.includes(variantId)) return "enterprise";
  return "pro"; // Default to pro for any paid plan
}

async function verifyLemonSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hashArray = Array.from(new Uint8Array(sig));
  const computedHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHash === signature;
}
