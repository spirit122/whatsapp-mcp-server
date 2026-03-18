// ─────────────────────────────────────────────
// D1 Database Operations
// Persistent storage for logs, analytics, keys
// ─────────────────────────────────────────────

export class D1Store {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // ── Message Logging ──

  async logMessage(message: {
    id: string;
    from_number: string;
    from_name?: string;
    message_type: string;
    content?: string;
    timestamp: number;
    phone_number_id?: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO messages (id, from_number, from_name, message_type, content, timestamp, phone_number_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        message.id,
        message.from_number,
        message.from_name || null,
        message.message_type,
        message.content || null,
        message.timestamp,
        message.phone_number_id || null
      )
      .run();
  }

  // ── Status Logging ──

  async logStatus(status: {
    message_id: string;
    status: string;
    recipient: string;
    timestamp: number;
    conversation_id?: string;
    pricing_category?: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO message_statuses (message_id, status, recipient, timestamp, conversation_id, pricing_category)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        status.message_id,
        status.status,
        status.recipient,
        status.timestamp,
        status.conversation_id || null,
        status.pricing_category || null
      )
      .run();
  }

  // ── Tool Usage Tracking ──

  async logToolUsage(usage: {
    client_id: string;
    tool_name: string;
    tier: string;
    success: boolean;
    duration_ms?: number;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO tool_usage (client_id, tool_name, tier, success, duration_ms)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        usage.client_id,
        usage.tool_name,
        usage.tier,
        usage.success ? 1 : 0,
        usage.duration_ms || null
      )
      .run();
  }

  // ── Analytics Queries ──

  async getToolUsageStats(
    startDate: string,
    endDate: string
  ): Promise<Array<{ tool_name: string; count: number; success_rate: number }>> {
    const result = await this.db
      .prepare(
        `SELECT
          tool_name,
          COUNT(*) as count,
          ROUND(AVG(success) * 100, 1) as success_rate
        FROM tool_usage
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY tool_name
        ORDER BY count DESC`
      )
      .bind(startDate, endDate)
      .all();

    return result.results as any;
  }

  async getMessageStats(
    startDate: string,
    endDate: string
  ): Promise<{
    total: number;
    by_type: Array<{ type: string; count: number }>;
    by_status: Array<{ status: string; count: number }>;
  }> {
    const [typeStats, statusStats] = await Promise.all([
      this.db
        .prepare(
          `SELECT message_type as type, COUNT(*) as count
           FROM messages
           WHERE received_at >= ? AND received_at <= ?
           GROUP BY message_type ORDER BY count DESC`
        )
        .bind(startDate, endDate)
        .all(),
      this.db
        .prepare(
          `SELECT status, COUNT(*) as count
           FROM message_statuses
           WHERE created_at >= ? AND created_at <= ?
           GROUP BY status ORDER BY count DESC`
        )
        .bind(startDate, endDate)
        .all(),
    ]);

    const total = (typeStats.results as any[]).reduce(
      (sum: number, r: any) => sum + r.count,
      0
    );

    return {
      total,
      by_type: typeStats.results as any,
      by_status: statusStats.results as any,
    };
  }
}
