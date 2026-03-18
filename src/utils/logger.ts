// ─────────────────────────────────────────────
// Structured Logger for Cloudflare Workers
// ─────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private minLevel: LogLevel;
  private context: Record<string, unknown>;

  constructor(minLevel: LogLevel = "info", context?: Record<string, unknown>) {
    this.minLevel = minLevel;
    this.context = context || {};
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger(this.minLevel, { ...this.context, ...context });
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    switch (level) {
      case "debug":
        console.debug(JSON.stringify(entry));
        break;
      case "info":
        console.info(JSON.stringify(entry));
        break;
      case "warn":
        console.warn(JSON.stringify(entry));
        break;
      case "error":
        console.error(JSON.stringify(entry));
        break;
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }
}
