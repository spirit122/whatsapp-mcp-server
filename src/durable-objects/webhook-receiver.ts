// ─────────────────────────────────────────────
// Durable Object: Webhook Receiver
// Stores incoming WhatsApp messages & status updates
// Provides query interface for MCP webhook tools
// ─────────────────────────────────────────────

import type {
  IncomingMessage,
  MessageStatus,
  WebhookPayload,
  WebhookValue,
} from "../whatsapp/types";

interface StoredMessage {
  id: string;
  from: string;
  from_name?: string;
  timestamp: string;
  type: string;
  content: string;
  raw: IncomingMessage;
  received_at: string;
}

interface StoredStatus {
  message_id: string;
  status: string;
  recipient: string;
  timestamp: string;
  conversation_id?: string;
  pricing_category?: string;
  received_at: string;
}

export class WebhookReceiver implements DurableObject {
  private state: DurableObjectState;
  private messages: StoredMessage[] = [];
  private statuses: StoredStatus[] = [];
  private initialized = false;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async init() {
    if (this.initialized) return;

    const stored = await this.state.storage.get<{
      messages: StoredMessage[];
      statuses: StoredStatus[];
    }>("data");

    if (stored) {
      this.messages = stored.messages || [];
      this.statuses = stored.statuses || [];
    }

    this.initialized = true;
  }

  private async save() {
    // Keep max 1000 messages and 1000 statuses
    if (this.messages.length > 1000) {
      this.messages = this.messages.slice(-1000);
    }
    if (this.statuses.length > 1000) {
      this.statuses = this.statuses.slice(-1000);
    }

    await this.state.storage.put("data", {
      messages: this.messages,
      statuses: this.statuses,
    });
  }

  /**
   * Extract readable content from an incoming message
   */
  private extractContent(msg: IncomingMessage): string {
    switch (msg.type) {
      case "text":
        return msg.text?.body || "";
      case "image":
        return msg.image?.caption || "[Image]";
      case "video":
        return msg.video?.caption || "[Video]";
      case "audio":
        return "[Audio]";
      case "document":
        return msg.document?.filename || "[Document]";
      case "sticker":
        return "[Sticker]";
      case "location":
        return msg.location
          ? `[Location: ${msg.location.name || ""} ${msg.location.latitude},${msg.location.longitude}]`
          : "[Location]";
      case "contacts":
        return msg.contacts
          ? `[Contact: ${msg.contacts[0]?.name?.formatted_name || "Unknown"}]`
          : "[Contact]";
      case "button":
        return msg.button?.text || "[Button Reply]";
      case "interactive":
        return (
          msg.interactive?.button_reply?.title ||
          msg.interactive?.list_reply?.title ||
          "[Interactive Reply]"
        );
      default:
        return `[${msg.type}]`;
    }
  }

  /**
   * Process incoming webhook payload from Meta
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    await this.init();
    const now = new Date().toISOString();

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value: WebhookValue = change.value;

        // Process incoming messages
        if (value.messages) {
          for (const msg of value.messages) {
            const contactName = value.contacts?.find(
              (c) => c.wa_id === msg.from
            )?.profile?.name;

            this.messages.push({
              id: msg.id,
              from: msg.from,
              from_name: contactName,
              timestamp: msg.timestamp,
              type: msg.type,
              content: this.extractContent(msg),
              raw: msg,
              received_at: now,
            });
          }
        }

        // Process status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            this.statuses.push({
              message_id: status.id,
              status: status.status,
              recipient: status.recipient_id,
              timestamp: status.timestamp,
              conversation_id: status.conversation?.id,
              pricing_category: status.pricing?.category,
              received_at: now,
            });
          }
        }
      }
    }

    await this.save();
  }

  /**
   * Handle internal requests from MCP tools
   */
  async fetch(request: Request): Promise<Response> {
    await this.init();

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    switch (path) {
      case "/webhook": {
        await this.processWebhook(body as unknown as WebhookPayload);
        return Response.json({ success: true });
      }

      case "/messages": {
        const limit = (body.limit as number) || 20;
        const phone = body.phone_number as string | undefined;
        const since = body.since as string | undefined;

        let filtered = [...this.messages];

        if (phone) {
          filtered = filtered.filter((m) => m.from.includes(phone));
        }
        if (since) {
          const sinceTs = new Date(since).getTime() / 1000;
          filtered = filtered.filter((m) => parseInt(m.timestamp) >= sinceTs);
        }

        // Most recent first
        filtered.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
        filtered = filtered.slice(0, limit);

        return Response.json({
          message: `Found ${filtered.length} messages`,
          total_stored: this.messages.length,
          messages: filtered.map((m) => ({
            id: m.id,
            from: m.from,
            from_name: m.from_name,
            type: m.type,
            content: m.content,
            timestamp: new Date(parseInt(m.timestamp) * 1000).toISOString(),
            received_at: m.received_at,
          })),
        });
      }

      case "/statuses": {
        const limit = (body.limit as number) || 20;
        const statusFilter = body.status as string | undefined;

        let filtered = [...this.statuses];

        if (statusFilter) {
          filtered = filtered.filter((s) => s.status === statusFilter);
        }

        filtered.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
        filtered = filtered.slice(0, limit);

        return Response.json({
          message: `Found ${filtered.length} status updates`,
          total_stored: this.statuses.length,
          statuses: filtered.map((s) => ({
            message_id: s.message_id,
            status: s.status,
            recipient: s.recipient,
            timestamp: new Date(parseInt(s.timestamp) * 1000).toISOString(),
            conversation_id: s.conversation_id,
            pricing: s.pricing_category,
          })),
        });
      }

      case "/search": {
        const query = (body.query as string || "").toLowerCase();
        const phone = body.phone_number as string | undefined;
        const fromDate = body.from_date as string | undefined;
        const toDate = body.to_date as string | undefined;
        const limit = (body.limit as number) || 20;

        let filtered = this.messages.filter((m) =>
          m.content.toLowerCase().includes(query)
        );

        if (phone) {
          filtered = filtered.filter((m) => m.from.includes(phone));
        }
        if (fromDate) {
          const ts = new Date(fromDate).getTime() / 1000;
          filtered = filtered.filter((m) => parseInt(m.timestamp) >= ts);
        }
        if (toDate) {
          const ts = new Date(toDate).getTime() / 1000;
          filtered = filtered.filter((m) => parseInt(m.timestamp) <= ts);
        }

        filtered.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
        filtered = filtered.slice(0, limit);

        return Response.json({
          message: `Found ${filtered.length} messages matching "${body.query}"`,
          results: filtered.map((m) => ({
            id: m.id,
            from: m.from,
            from_name: m.from_name,
            type: m.type,
            content: m.content,
            timestamp: new Date(parseInt(m.timestamp) * 1000).toISOString(),
          })),
        });
      }

      default:
        return new Response("Not found", { status: 404 });
    }
  }
}
