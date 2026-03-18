// ─────────────────────────────────────────────
// Standardized Error Handling
// ─────────────────────────────────────────────

import type { McpToolResult } from "../whatsapp/types";
import { WhatsAppApiError } from "../whatsapp/client";

export class McpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "McpError";
    this.statusCode = statusCode;
  }
}

export class ValidationError extends McpError {
  constructor(message: string) {
    super(message, 422);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends McpError {
  constructor(message = "Authentication failed") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends McpError {
  retryAfter: number;

  constructor(retryAfter = 60) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`, 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Convert any error into a standardized MCP tool result
 */
export function errorToMcpResult(error: unknown): McpToolResult {
  if (error instanceof WhatsAppApiError) {
    return error.toMcpResult();
  }

  if (error instanceof McpError) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: true,
              type: error.name,
              message: error.message,
              statusCode: error.statusCode,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  // ZodError
  if (error && typeof error === "object" && "issues" in error) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: true,
              type: "ValidationError",
              message: "Invalid parameters",
              details: zodError.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
              })),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  // Generic error
  const message =
    error instanceof Error ? error.message : "An unknown error occurred";
  return {
    content: [{ type: "text", text: JSON.stringify({ error: true, message }, null, 2) }],
    isError: true,
  };
}

/**
 * Wrap a tool handler with error catching
 */
export function withErrorHandling(
  handler: () => Promise<McpToolResult>
): Promise<McpToolResult> {
  return handler().catch((err) => errorToMcpResult(err));
}
