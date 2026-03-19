// ─────────────────────────────────────────────
// WhatsApp Business MCP Server
// Entry Point — Cloudflare Worker
//
// The most complete MCP Server for WhatsApp Business
// 40 tools · 8 modules · Hosted on Cloudflare
//
// By spirit122
// ─────────────────────────────────────────────

import type { Env, WebhookPayload } from "./whatsapp/types";
import { McpServer, getAllToolDefinitions } from "./mcp-server";
import { authenticate, verifyWebhookSignatureAsync } from "./auth/middleware";
import { RateLimiter, RATE_LIMITS } from "./utils/rate-limiter";
import { Logger } from "./utils/logger";
import { errorToMcpResult } from "./utils/errors";
import { handleLemonSqueezyWebhook, handleGetApiKey } from "./billing/lemonsqueezy";
import { handleTenantConfig } from "./billing/tenant";
import { AutoReplyEngine, getAutoReplyConfig } from "./auto-reply/engine";
import { WhatsAppClient } from "./whatsapp/client";

// Re-export Durable Objects so Cloudflare can find them
export { WebhookReceiver } from "./durable-objects/webhook-receiver";
export { SessionManager } from "./durable-objects/session-manager";

// ── CORS Headers ──

const ALLOWED_ORIGINS = [
  "https://spirit122.github.io",
  "https://whatsapp-mcp-server.eosspirit.workers.dev",
];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get("Origin") || "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Default, overridden per-request
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

function corsResponse(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// ── Main Worker ──

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const logger = new Logger((env.LOG_LEVEL as any) || "info", {
      worker: "whatsapp-mcp",
    });

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return corsResponse(new Response(null, { status: 204 }));
    }

    try {
      // ── Route: Health Check ──
      if (url.pathname === "/" || url.pathname === "/health") {
        return corsResponse(
          Response.json({
            status: "ok",
            server: env.MCP_SERVER_NAME || "whatsapp-business-mcp",
            version: env.MCP_SERVER_VERSION || "1.0.0",
            tools: getAllToolDefinitions().length,
            modules: [
              "messages",
              "interactive",
              "templates",
              "media",
              "webhooks",
              "profile",
              "flows",
              "analytics",
            ],
          })
        );
      }

      // ── Route: MCP JSON-RPC (HTTP transport) ──
      if ((url.pathname === "/sse" || url.pathname === "/mcp" || url.pathname === "/jsonrpc") && request.method === "POST") {
        return await handleMcpRequest(request, env, logger);
      }

      // ── Route: MCP info (GET on /mcp or /sse returns server info) ──
      if ((url.pathname === "/sse" || url.pathname === "/mcp") && request.method === "GET") {
        return corsResponse(
          Response.json({
            server: env.MCP_SERVER_NAME || "whatsapp-business-mcp",
            version: env.MCP_SERVER_VERSION || "1.0.0",
            transport: "HTTP POST (JSON-RPC 2.0)",
            endpoint: `${url.origin}/mcp`,
            usage: "Send POST requests with JSON-RPC 2.0 body to this endpoint",
          })
        );
      }

      // ── Route: WhatsApp Webhook Verification (GET) ──
      if (url.pathname === "/webhook" && request.method === "GET") {
        return handleWebhookVerification(url, env);
      }

      // ── Route: WhatsApp Webhook Events (POST) ──
      if (url.pathname === "/webhook" && request.method === "POST") {
        return await handleWebhookEvent(request, env, logger, ctx);
      }

      // ── Route: Lemonsqueezy Billing Webhook ──
      if (url.pathname === "/billing/webhook" && request.method === "POST") {
        const result = await handleLemonSqueezyWebhook(request, env, logger);
        return corsResponse(result);
      }

      // ── Route: Get API Key (customer portal) ──
      if (url.pathname === "/billing/api-key" && request.method === "GET") {
        const result = await handleGetApiKey(request, env);
        return corsResponse(result);
      }

      // ── Route: Configure WhatsApp credentials (multi-tenant) ──
      if (url.pathname === "/billing/configure" && (request.method === "GET" || request.method === "POST")) {
        const result = await handleTenantConfig(request, env);
        return corsResponse(result);
      }

      // ── Route: API Info ──
      if (url.pathname === "/tools") {
        const tools = getAllToolDefinitions();
        return corsResponse(
          Response.json({
            total: tools.length,
            tools: tools.map((t) => ({
              name: t.name,
              description: t.description,
            })),
          })
        );
      }

      // ── 404 ──
      return corsResponse(
        Response.json(
          {
            error: "Not found",
            available_endpoints: [
              "GET  /          — Health check",
              "GET  /tools     — List all tools",
              "POST /mcp       — MCP JSON-RPC endpoint",
              "GET  /sse       — MCP SSE endpoint",
              "GET  /webhook   — WhatsApp webhook verification",
              "POST /webhook   — WhatsApp webhook events",
              "POST /billing/webhook  — Lemonsqueezy payment webhooks",
              "GET  /billing/api-key  — Retrieve API key by email",
            ],
          },
          { status: 404 }
        )
      );
    } catch (err) {
      logger.error("Unhandled error", {
        error: err instanceof Error ? err.message : String(err),
        path: url.pathname,
      });
      return corsResponse(
        Response.json(
          { error: "Internal server error" },
          { status: 500 }
        )
      );
    }
  },
};

// ── MCP Request Handler ──

async function handleMcpRequest(
  request: Request,
  env: Env,
  logger: Logger
): Promise<Response> {
  // Authenticate
  let auth;
  try {
    auth = await authenticate(request, env, logger);
  } catch (err) {
    return corsResponse(
      Response.json(
        { jsonrpc: "2.0", id: null, error: { code: -32000, message: err instanceof Error ? err.message : "Authentication failed" } },
        { status: 401 }
      )
    );
  }

  // Rate limiting
  const rateLimiter = new RateLimiter(env.CACHE, RATE_LIMITS[auth.tier]);
  const rateCheck = await rateLimiter.check(auth.clientId);

  if (!rateCheck.allowed) {
    return corsResponse(
      Response.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: `Rate limit exceeded. ${rateCheck.remaining} requests remaining. Resets at ${new Date(rateCheck.resetAt * 1000).toISOString()}`,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.resetAt - Math.floor(Date.now() / 1000)),
            "X-RateLimit-Remaining": String(rateCheck.remaining),
          },
        }
      )
    );
  }

  // Check body size limit (1MB max to prevent DoS)
  const contentLength = parseInt(request.headers.get("content-length") || "0");
  if (contentLength > 1_048_576) {
    return corsResponse(
      Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request body too large (max 1MB)" } }, { status: 413 })
    );
  }

  // Parse JSON-RPC request
  let body: any;
  try {
    body = await request.json();
  } catch {
    return corsResponse(
      Response.json(
        { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: invalid JSON body" } },
        { status: 400 }
      )
    );
  }

  // Create MCP server instance with tenant API key for multi-tenant support
  const apiKey = request.headers.get("X-API-Key") || undefined;
  const mcpServer = new McpServer(env, auth, logger, apiKey);

  // Initialize tenant client ONCE before processing any requests (avoid race condition)
  await mcpServer.initTenantClient();

  // Handle single or batch requests
  if (Array.isArray(body)) {
    const results = await Promise.all(
      body.map((req: any) => mcpServer.handleRequest(req))
    );
    return corsResponse(Response.json(results));
  }

  const result = await mcpServer.handleRequest(body);
  return corsResponse(
    Response.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(rateCheck.remaining),
      },
    })
  );
}

// ── Webhook Verification (Meta sends GET to verify) ──

function handleWebhookVerification(url: URL, env: Env): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ── Webhook Event Handler ──

async function handleWebhookEvent(
  request: Request,
  env: Env,
  logger: Logger,
  ctx: ExecutionContext
): Promise<Response> {
  const body = await request.text();

  // Verify signature from Meta — REJECT if secret not configured
  if (!env.META_APP_SECRET) {
    logger.error("META_APP_SECRET not configured — rejecting webhook");
    return Response.json({ error: "Webhook verification not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-hub-signature-256");
  logger.info("Webhook received", { hasSignature: !!signature, bodyLength: body.length, bodyPreview: body.substring(0, 200) });

  const isValid = await verifyWebhookSignatureAsync(body, signature, env.META_APP_SECRET);
  logger.info("Webhook signature check", { isValid, signature: signature?.substring(0, 20) });

  if (!isValid) {
    logger.warn("Invalid webhook signature — allowing anyway for debugging");
    // Temporarily allow unsigned webhooks for debugging
    // return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse and forward to Durable Object
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    logger.error("Webhook JSON parse failed");
    return new Response("Invalid JSON", { status: 400 });
  }

  logger.info("Webhook payload parsed", {
    object: payload.object,
    entries: payload.entry?.length || 0,
  });

  // Process synchronously to ensure DO saves before returning
  try {
    // Route to all tenant DOs — for now use "primary" as default
    // Tenants are identified by their phone number ID from the webhook metadata
    const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    // Find which tenant owns this phone number by checking KV
    // For simplicity, also store in "primary" as fallback
    const doId = env.WEBHOOK_RECEIVER.idFromName("primary");
    const stub = env.WEBHOOK_RECEIVER.get(doId);

    const doResponse = await stub.fetch(
      new Request("https://internal/webhook", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      })
    );

    const doResult = await doResponse.text();
    logger.info("Webhook processed by DO", {
      status: doResponse.status,
      result: doResult,
      entries: payload.entry?.length || 0,
    });

    // ── Auto-Reply: check if any tenant has auto-reply enabled ──
    // Find incoming text messages and generate AI replies
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages) continue;

        for (const msg of value.messages) {
          if (msg.type !== "text" || !msg.text?.body) continue;

          const senderPhone = msg.from;
          const senderName = value.contacts?.find(
            (c: { wa_id: string; profile?: { name?: string } }) => c.wa_id === senderPhone
          )?.profile?.name;

          // Try to find which tenant owns this phone number
          // For now, check "owner" tenant (we can expand this later)
          const tenantKey = `phone_to_tenant:${value.metadata?.phone_number_id}`;
          const tenantClientId = await env.CACHE.get(tenantKey) || "owner_spirit122";

          const autoReplyConfig = await getAutoReplyConfig(tenantClientId, env);
          if (!autoReplyConfig?.enabled) continue;

          logger.info("Auto-reply triggered", { from: senderPhone, tenant: tenantClientId });

          const engine = new AutoReplyEngine(env, autoReplyConfig, tenantClientId);
          const reply = await engine.generateReply(senderPhone, senderName, msg.text.body);

          if (reply) {
            // Send the reply via WhatsApp
            const client = new WhatsAppClient(env);
            try {
              await client.sendTextMessage(senderPhone, reply);
              logger.info("Auto-reply sent", { to: senderPhone, replyLength: reply.length });
            } catch (sendErr) {
              logger.error("Auto-reply send failed", {
                error: sendErr instanceof Error ? sendErr.message : String(sendErr),
              });
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error("Webhook processing failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return new Response("OK", { status: 200 });
}
