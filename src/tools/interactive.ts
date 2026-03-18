// ─────────────────────────────────────────────
// Module 2: Interactive Messages (5 tools)
// ─────────────────────────────────────────────

import type { McpToolResult } from "../whatsapp/types";
import { WhatsAppClient } from "../whatsapp/client";
import { withErrorHandling } from "../utils/errors";
import {
  sendButtonMessageSchema,
  sendListMessageSchema,
  sendCtaUrlSchema,
  sendProductSchema,
  sendProductListSchema,
} from "../whatsapp/validators";

function success(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const interactiveToolDefinitions = [
  {
    name: "send_button_message",
    description: "Send a message with up to 3 reply buttons. Great for quick choices.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        body: { type: "string", description: "Message body text" },
        buttons: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Button ID (max 256 chars)" },
              title: { type: "string", description: "Button label (max 20 chars)" },
            },
            required: ["id", "title"],
          },
          description: "1-3 reply buttons",
        },
        header: { type: "string", description: "Optional header text (max 60 chars)" },
        footer: { type: "string", description: "Optional footer text (max 60 chars)" },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "body", "buttons"],
    },
  },
  {
    name: "send_list_message",
    description:
      "Send a message with a list menu. Users tap a button to see sections with selectable rows.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        body: { type: "string", description: "Message body text" },
        button_text: { type: "string", description: "Button label to open the list (max 20 chars)" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Section title (max 24 chars)" },
              rows: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "Row ID (max 200 chars)" },
                    title: { type: "string", description: "Row title (max 24 chars)" },
                    description: { type: "string", description: "Row description (max 72 chars)" },
                  },
                  required: ["id", "title"],
                },
              },
            },
            required: ["rows"],
          },
          description: "1-10 sections with rows",
        },
        header: { type: "string", description: "Optional header text" },
        footer: { type: "string", description: "Optional footer text" },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "body", "button_text", "sections"],
    },
  },
  {
    name: "send_cta_url_button",
    description: "Send a message with a call-to-action URL button.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        body: { type: "string", description: "Message body text" },
        button_text: { type: "string", description: "Button label (max 20 chars)" },
        url: { type: "string", description: "URL to open when button is tapped" },
        header: { type: "string", description: "Optional header text" },
        footer: { type: "string", description: "Optional footer text" },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "body", "button_text", "url"],
    },
  },
  {
    name: "send_product_message",
    description: "Send a single product from your catalog. Requires a connected catalog.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        catalog_id: { type: "string", description: "Your catalog ID" },
        product_retailer_id: { type: "string", description: "Product SKU/retailer ID" },
        body: { type: "string", description: "Optional body text" },
        footer: { type: "string", description: "Optional footer text" },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "catalog_id", "product_retailer_id"],
    },
  },
  {
    name: "send_product_list_message",
    description: "Send a multi-product message from your catalog, organized in sections.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        catalog_id: { type: "string", description: "Your catalog ID" },
        header: { type: "string", description: "Header text (max 60 chars)" },
        body: { type: "string", description: "Body text" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Section title" },
              product_items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    product_retailer_id: { type: "string" },
                  },
                  required: ["product_retailer_id"],
                },
              },
            },
            required: ["title", "product_items"],
          },
        },
        footer: { type: "string", description: "Optional footer text" },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "catalog_id", "header", "body", "sections"],
    },
  },
];

export async function handleInteractiveTool(
  toolName: string,
  args: Record<string, unknown>,
  client: WhatsAppClient
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (toolName) {
      case "send_button_message": {
        const p = sendButtonMessageSchema.parse(args);
        const result = await client.sendButtonMessage(p.to, p.body, p.buttons, {
          header: p.header,
          footer: p.footer,
          replyTo: p.reply_to,
        });
        return success({ message: "Button message sent", ...result });
      }

      case "send_list_message": {
        const p = sendListMessageSchema.parse(args);
        const result = await client.sendListMessage(
          p.to, p.body, p.button_text, p.sections,
          { header: p.header, footer: p.footer, replyTo: p.reply_to }
        );
        return success({ message: "List message sent", ...result });
      }

      case "send_cta_url_button": {
        const p = sendCtaUrlSchema.parse(args);
        const result = await client.sendCtaUrlButton(
          p.to, p.body, p.button_text, p.url,
          { header: p.header, footer: p.footer, replyTo: p.reply_to }
        );
        return success({ message: "CTA URL button sent", ...result });
      }

      case "send_product_message": {
        const p = sendProductSchema.parse(args);
        const result = await client.sendProductMessage(
          p.to, p.catalog_id, p.product_retailer_id,
          { body: p.body, footer: p.footer, replyTo: p.reply_to }
        );
        return success({ message: "Product message sent", ...result });
      }

      case "send_product_list_message": {
        const p = sendProductListSchema.parse(args);
        const result = await client.sendProductListMessage(
          p.to, p.catalog_id, p.header, p.body, p.sections,
          { footer: p.footer, replyTo: p.reply_to }
        );
        return success({ message: "Product list sent", ...result });
      }

      default:
        return { content: [{ type: "text", text: `Unknown interactive tool: ${toolName}` }], isError: true };
    }
  });
}
