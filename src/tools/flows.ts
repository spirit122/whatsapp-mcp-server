// ─────────────────────────────────────────────
// Module 7: WhatsApp Flows — DIFFERENTIATOR
// Interactive forms, surveys, and sign-ups inside WhatsApp
// ─────────────────────────────────────────────

import type { McpToolResult } from "../whatsapp/types";
import { WhatsAppClient } from "../whatsapp/client";
import { withErrorHandling } from "../utils/errors";
import { createFlowSchema, sendFlowMessageSchema } from "../whatsapp/validators";

function success(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const flowToolDefinitions = [
  {
    name: "create_flow",
    description:
      "Create a new WhatsApp Flow — interactive multi-step experience (forms, surveys, sign-ups) inside WhatsApp chat.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Flow name" },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Flow categories (e.g. SIGN_UP, CONTACT_US, CUSTOMER_SUPPORT, SURVEY, OTHER)",
        },
      },
      required: ["name", "categories"],
    },
  },
  {
    name: "send_flow_message",
    description:
      "Send a WhatsApp Flow to a user. The user sees an interactive form/survey directly in the chat.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        flow_id: { type: "string", description: "ID of the published Flow" },
        flow_token: { type: "string", description: "Unique token for this flow session" },
        flow_cta: { type: "string", description: "Call-to-action button text (max 20 chars)" },
        flow_action: {
          type: "string",
          enum: ["navigate", "data_exchange"],
          description: "navigate: opens a screen. data_exchange: sends data to your endpoint.",
        },
        body: { type: "string", description: "Message body text" },
        screen: { type: "string", description: "Initial screen to navigate to (for navigate action)" },
        data: { type: "object", description: "Initial data to pass to the flow" },
        header: { type: "string", description: "Optional header text" },
        footer: { type: "string", description: "Optional footer text" },
      },
      required: ["to", "flow_id", "flow_token", "flow_cta", "flow_action", "body"],
    },
  },
];

export async function handleFlowTool(
  toolName: string,
  args: Record<string, unknown>,
  client: WhatsAppClient
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (toolName) {
      case "create_flow": {
        const p = createFlowSchema.parse(args);
        const result = await client.createFlow({
          name: p.name,
          categories: p.categories,
        });
        return success({
          message: "WhatsApp Flow created",
          flow_id: result.id,
          name: result.name,
          status: result.status,
          hint: "Use the Flow Builder in Meta Business Suite to design screens, then send with send_flow_message.",
        });
      }

      case "send_flow_message": {
        const p = sendFlowMessageSchema.parse(args);
        const result = await client.sendFlowMessage(
          p.to,
          p.flow_id,
          p.flow_token,
          p.flow_cta,
          p.flow_action,
          p.body,
          {
            screen: p.screen,
            data: p.data,
            header: p.header,
            footer: p.footer,
          }
        );
        return success({ message: "Flow message sent", ...result });
      }

      default:
        return { content: [{ type: "text", text: `Unknown flow tool: ${toolName}` }], isError: true };
    }
  });
}
