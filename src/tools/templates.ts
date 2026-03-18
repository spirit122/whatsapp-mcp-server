// ─────────────────────────────────────────────
// Module 3: Templates (5 tools)
// ─────────────────────────────────────────────

import type { McpToolResult, TemplateComponent, TemplateParameter } from "../whatsapp/types";
import { WhatsAppClient } from "../whatsapp/client";
import { withErrorHandling } from "../utils/errors";
import {
  sendTemplateSchema,
  createTemplateSchema,
  listTemplatesSchema,
  deleteTemplateSchema,
  getTemplateStatusSchema,
} from "../whatsapp/validators";

function success(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const templateToolDefinitions = [
  {
    name: "send_template_message",
    description:
      "Send an approved template message. Required for initiating conversations outside the 24h window. Supports text parameters, media headers, and buttons.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        template_name: { type: "string", description: "Name of the approved template" },
        language_code: { type: "string", description: "Language code (e.g. en_US, es_MX)", default: "en_US" },
        header_params: { type: "array", items: { type: "string" }, description: "Header text parameters" },
        body_params: { type: "array", items: { type: "string" }, description: "Body text parameters ({{1}}, {{2}}, etc.)" },
        header_image: { type: "object", properties: { link: { type: "string" } }, description: "Header image URL" },
        header_video: { type: "object", properties: { link: { type: "string" } }, description: "Header video URL" },
        header_document: {
          type: "object",
          properties: { link: { type: "string" }, filename: { type: "string" } },
          description: "Header document URL",
        },
        button_params: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sub_type: { type: "string", enum: ["quick_reply", "url"] },
              index: { type: "number" },
              text: { type: "string" },
              payload: { type: "string" },
            },
          },
          description: "Button parameters",
        },
      },
      required: ["to", "template_name"],
    },
  },
  {
    name: "list_templates",
    description: "List all message templates for this WhatsApp Business Account. Filter by status or search by name/content.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max templates to return (1-100)", default: 20 },
        status: { type: "string", enum: ["APPROVED", "PENDING", "REJECTED"], description: "Filter by status" },
        name_or_content: { type: "string", description: "Search by name or content" },
      },
    },
  },
  {
    name: "create_template",
    description:
      "Create a new message template. Must be approved by Meta before use. Use {{1}}, {{2}} for dynamic parameters.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Template name (lowercase, underscores only)" },
        category: { type: "string", enum: ["MARKETING", "UTILITY", "AUTHENTICATION"] },
        language: { type: "string", description: "Language code (e.g. en_US)" },
        header: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["TEXT", "IMAGE", "VIDEO", "DOCUMENT"] },
            text: { type: "string" },
          },
        },
        body: { type: "string", description: "Template body text. Use {{1}}, {{2}} for parameters." },
        footer: { type: "string", description: "Footer text (max 60 chars)" },
        buttons: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["QUICK_REPLY", "URL", "PHONE_NUMBER"] },
              text: { type: "string" },
              url: { type: "string" },
              phone_number: { type: "string" },
            },
            required: ["type", "text"],
          },
        },
      },
      required: ["name", "category", "language", "body"],
    },
  },
  {
    name: "delete_template",
    description: "Delete a message template by name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        template_name: { type: "string", description: "Template name to delete" },
      },
      required: ["template_name"],
    },
  },
  {
    name: "get_template_status",
    description: "Get the current approval status of a template.",
    inputSchema: {
      type: "object" as const,
      properties: {
        template_name: { type: "string", description: "Template name to check" },
      },
      required: ["template_name"],
    },
  },
];

/**
 * Build template components from user-friendly params
 */
function buildTemplateComponents(params: {
  header_params?: string[];
  body_params?: string[];
  header_image?: { link: string };
  header_video?: { link: string };
  header_document?: { link: string; filename?: string };
  button_params?: Array<{
    sub_type: "quick_reply" | "url";
    index: number;
    text?: string;
    payload?: string;
  }>;
}): TemplateComponent[] | undefined {
  const components: TemplateComponent[] = [];

  // Header with media
  if (params.header_image) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: params.header_image.link } }],
    });
  } else if (params.header_video) {
    components.push({
      type: "header",
      parameters: [{ type: "video", video: { link: params.header_video.link } }],
    });
  } else if (params.header_document) {
    components.push({
      type: "header",
      parameters: [{
        type: "document",
        document: { link: params.header_document.link, filename: params.header_document.filename },
      }],
    });
  } else if (params.header_params?.length) {
    components.push({
      type: "header",
      parameters: params.header_params.map((t) => ({ type: "text" as const, text: t })),
    });
  }

  // Body
  if (params.body_params?.length) {
    components.push({
      type: "body",
      parameters: params.body_params.map((t) => ({ type: "text" as const, text: t })),
    });
  }

  // Buttons
  if (params.button_params?.length) {
    for (const btn of params.button_params) {
      components.push({
        type: "button",
        sub_type: btn.sub_type,
        index: btn.index,
        parameters: [{ type: "text", text: btn.text || btn.payload || "" }],
      });
    }
  }

  return components.length > 0 ? components : undefined;
}

export async function handleTemplateTool(
  toolName: string,
  args: Record<string, unknown>,
  client: WhatsAppClient
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (toolName) {
      case "send_template_message": {
        const p = sendTemplateSchema.parse(args);
        const components = buildTemplateComponents(p);
        const result = await client.sendTemplateMessage(
          p.to, p.template_name, p.language_code, components
        );
        return success({ message: "Template message sent", ...result });
      }

      case "list_templates": {
        const p = listTemplatesSchema.parse(args);
        const result = await client.listTemplates(p.limit, p.status, p.name_or_content);
        return success({
          message: `Found ${result.data.length} templates`,
          templates: result.data.map((t) => ({
            name: t.name,
            status: t.status,
            category: t.category,
            language: t.language,
            id: t.id,
          })),
        });
      }

      case "create_template": {
        const p = createTemplateSchema.parse(args);
        const components: any[] = [];

        if (p.header) {
          components.push({
            type: "HEADER",
            format: p.header.type || "TEXT",
            text: p.header.text,
          });
        }

        components.push({ type: "BODY", text: p.body });

        if (p.footer) {
          components.push({ type: "FOOTER", text: p.footer });
        }

        if (p.buttons?.length) {
          components.push({
            type: "BUTTONS",
            buttons: p.buttons,
          });
        }

        const result = await client.createTemplate({
          name: p.name,
          category: p.category,
          language: p.language,
          components,
        });
        return success({
          message: "Template created. It needs Meta approval before it can be used.",
          ...result,
        });
      }

      case "delete_template": {
        const p = deleteTemplateSchema.parse(args);
        const result = await client.deleteTemplate(p.template_name);
        return success({ message: `Template '${p.template_name}' deleted`, ...result });
      }

      case "get_template_status": {
        const p = getTemplateStatusSchema.parse(args);
        const template = await client.getTemplateByName(p.template_name);
        if (!template) {
          return success({ message: `Template '${p.template_name}' not found` });
        }
        return success({
          name: template.name,
          status: template.status,
          category: template.category,
          language: template.language,
          id: template.id,
        });
      }

      default:
        return { content: [{ type: "text", text: `Unknown template tool: ${toolName}` }], isError: true };
    }
  });
}
