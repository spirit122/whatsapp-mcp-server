// ─────────────────────────────────────────────
// Durable Object: Session Manager
// Manages active MCP client sessions and
// tracks per-client state (tier, usage, etc.)
// ─────────────────────────────────────────────

interface ClientSession {
  clientId: string;
  tier: "free" | "pro" | "enterprise";
  connectedAt: string;
  lastActiveAt: string;
  toolCalls: number;
  phoneNumberId: string;
}

export class SessionManager implements DurableObject {
  private state: DurableObjectState;
  private sessions: Map<string, ClientSession> = new Map();
  private initialized = false;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async init() {
    if (this.initialized) return;

    const stored = await this.state.storage.get<Record<string, ClientSession>>("sessions");
    if (stored) {
      this.sessions = new Map(Object.entries(stored));
    }

    this.initialized = true;
  }

  private async save() {
    const obj: Record<string, ClientSession> = {};
    for (const [key, val] of this.sessions) {
      obj[key] = val;
    }
    await this.state.storage.put("sessions", obj);
  }

  async fetch(request: Request): Promise<Response> {
    await this.init();

    const url = new URL(request.url);
    const path = url.pathname;
    const body = request.method === "POST"
      ? (await request.json()) as Record<string, unknown>
      : {};

    switch (path) {
      case "/connect": {
        const clientId = body.clientId as string;
        const tier = (body.tier as ClientSession["tier"]) || "free";
        const phoneNumberId = body.phoneNumberId as string;
        const now = new Date().toISOString();

        this.sessions.set(clientId, {
          clientId,
          tier,
          connectedAt: now,
          lastActiveAt: now,
          toolCalls: 0,
          phoneNumberId,
        });

        await this.save();
        return Response.json({ success: true, session: this.sessions.get(clientId) });
      }

      case "/heartbeat": {
        const clientId = body.clientId as string;
        const session = this.sessions.get(clientId);
        if (session) {
          session.lastActiveAt = new Date().toISOString();
          session.toolCalls++;
          await this.save();
        }
        return Response.json({ success: !!session });
      }

      case "/disconnect": {
        const clientId = body.clientId as string;
        this.sessions.delete(clientId);
        await this.save();
        return Response.json({ success: true });
      }

      case "/list": {
        const sessions = Array.from(this.sessions.values());
        return Response.json({
          active_sessions: sessions.length,
          sessions,
        });
      }

      case "/stats": {
        const sessions = Array.from(this.sessions.values());
        const totalCalls = sessions.reduce((sum, s) => sum + s.toolCalls, 0);
        return Response.json({
          active_sessions: sessions.length,
          total_tool_calls: totalCalls,
          by_tier: {
            free: sessions.filter((s) => s.tier === "free").length,
            pro: sessions.filter((s) => s.tier === "pro").length,
            enterprise: sessions.filter((s) => s.tier === "enterprise").length,
          },
        });
      }

      default:
        return new Response("Not found", { status: 404 });
    }
  }
}
