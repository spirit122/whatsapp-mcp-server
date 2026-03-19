// ─────────────────────────────────────────────
// Multi-Tenant System
// Each paying customer can configure their own
// WhatsApp Business credentials
// ─────────────────────────────────────────────

import type { Env } from "../whatsapp/types";

export interface TenantConfig {
  clientId: string;
  email: string;
  tier: "free" | "pro" | "enterprise";
  // Customer's own WhatsApp credentials (optional — falls back to default)
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  webhookVerifyToken?: string;
  // Metadata
  configuredAt?: string;
  lastUsedAt?: string;
}

/**
 * Get tenant config from KV by API key
 */
export async function getTenantConfig(
  apiKey: string,
  env: Env
): Promise<TenantConfig | null> {
  const data = await env.CACHE.get(`tenant:${apiKey}`, "json");
  return data as TenantConfig | null;
}

/**
 * Save tenant config to KV
 */
export async function saveTenantConfig(
  apiKey: string,
  config: TenantConfig,
  env: Env
): Promise<void> {
  await env.CACHE.put(`tenant:${apiKey}`, JSON.stringify(config));
}

/**
 * Get effective WhatsApp credentials for a tenant
 * Falls back to server defaults if customer hasn't configured their own
 */
export function getEffectiveCredentials(
  tenant: TenantConfig | null,
  env: Env
): {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
} {
  if (tenant?.whatsappAccessToken && tenant?.whatsappPhoneNumberId && tenant?.whatsappBusinessAccountId) {
    return {
      accessToken: tenant.whatsappAccessToken,
      phoneNumberId: tenant.whatsappPhoneNumberId,
      businessAccountId: tenant.whatsappBusinessAccountId,
    };
  }

  // Fall back to server defaults
  return {
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  };
}

/**
 * Handle tenant configuration endpoint
 * POST /billing/configure — save WhatsApp credentials
 * GET /billing/configure — get current config
 */
export async function handleTenantConfig(
  request: Request,
  env: Env
): Promise<Response> {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    return Response.json(
      { error: "API key required. Add X-API-Key header." },
      { status: 401 }
    );
  }

  // Verify API key exists and is active
  const keyData = await env.CACHE.get(`apikey:${apiKey}`, "json") as {
    clientId: string;
    email: string;
    tier: string;
    active: boolean;
  } | null;

  if (!keyData || !keyData.active) {
    return Response.json(
      { error: "Invalid or deactivated API key." },
      { status: 401 }
    );
  }

  if (request.method === "GET") {
    // Return current config (without exposing full tokens)
    const tenant = await getTenantConfig(apiKey, env);
    if (!tenant) {
      return Response.json({
        configured: false,
        message: "No custom WhatsApp credentials configured. Using shared test environment.",
        hint: "POST to /billing/configure with your WhatsApp credentials to use your own number.",
      });
    }

    return Response.json({
      configured: true,
      email: tenant.email,
      tier: tenant.tier,
      hasOwnCredentials: !!(tenant.whatsappAccessToken && tenant.whatsappPhoneNumberId),
      phoneNumberId: tenant.whatsappPhoneNumberId
        ? tenant.whatsappPhoneNumberId.slice(0, 4) + "..." + tenant.whatsappPhoneNumberId.slice(-4)
        : null,
      configuredAt: tenant.configuredAt,
      lastUsedAt: tenant.lastUsedAt,
    });
  }

  if (request.method === "POST") {
    // Only Pro and Enterprise can configure custom credentials
    if (keyData.tier === "free") {
      return Response.json(
        { error: "Custom WhatsApp configuration requires Pro or Enterprise plan." },
        { status: 403 }
      );
    }

    let body: Record<string, string>;
    try {
      body = await request.json() as Record<string, string>;
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { access_token, phone_number_id, business_account_id, webhook_verify_token } = body;

    if (!access_token || !phone_number_id || !business_account_id) {
      return Response.json({
        error: "Missing required fields",
        required: {
          access_token: "Your WhatsApp Cloud API access token",
          phone_number_id: "Your phone number ID from Meta Developer Portal",
          business_account_id: "Your WhatsApp Business Account ID",
        },
        optional: {
          webhook_verify_token: "Custom verify token for your webhooks",
        },
      }, { status: 400 });
    }

    // Validate the credentials by making a test API call
    const testUrl = `https://graph.facebook.com/v21.0/${phone_number_id}/whatsapp_business_profile?fields=about`;
    const testResponse = await fetch(testUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json() as any;
      return Response.json({
        error: "Invalid WhatsApp credentials. Could not connect to Meta API.",
        details: errorData?.error?.message || "Unknown error",
        help: "Make sure your access token is valid and has the correct permissions.",
      }, { status: 400 });
    }

    // Save tenant config
    const tenant: TenantConfig = {
      clientId: keyData.clientId,
      email: keyData.email,
      tier: keyData.tier as TenantConfig["tier"],
      whatsappAccessToken: access_token,
      whatsappPhoneNumberId: phone_number_id,
      whatsappBusinessAccountId: business_account_id,
      webhookVerifyToken: webhook_verify_token,
      configuredAt: new Date().toISOString(),
    };

    await saveTenantConfig(apiKey, tenant, env);

    return Response.json({
      success: true,
      message: "WhatsApp credentials configured successfully! You are now using your own phone number.",
      configured: {
        phoneNumberId: phone_number_id.slice(0, 4) + "..." + phone_number_id.slice(-4),
        businessAccountId: business_account_id.slice(0, 4) + "..." + business_account_id.slice(-4),
      },
      next_steps: [
        "Your MCP tools will now use YOUR WhatsApp number",
        "Configure webhooks at Meta Developer Portal pointing to: https://whatsapp-mcp-server.eosspirit.workers.dev/webhook",
        "Set the verify token to: " + (webhook_verify_token || "spirit122_mcp_verify_2026"),
      ],
    });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
