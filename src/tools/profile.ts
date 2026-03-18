// ─────────────────────────────────────────────
// Module 6: Business Profile & Config (3 tools)
// ─────────────────────────────────────────────

import type { McpToolResult } from "../whatsapp/types";
import { WhatsAppClient } from "../whatsapp/client";
import { withErrorHandling } from "../utils/errors";
import { updateBusinessProfileSchema } from "../whatsapp/validators";

function success(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const profileToolDefinitions = [
  {
    name: "get_business_profile",
    description: "Get your WhatsApp Business profile info (about, address, description, email, websites).",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "update_business_profile",
    description: "Update your WhatsApp Business profile. All fields are optional.",
    inputSchema: {
      type: "object" as const,
      properties: {
        about: { type: "string", description: "About text (max 139 chars)" },
        address: { type: "string", description: "Business address (max 256 chars)" },
        description: { type: "string", description: "Business description (max 512 chars)" },
        email: { type: "string", description: "Business email" },
        websites: { type: "array", items: { type: "string" }, description: "Up to 2 website URLs" },
        vertical: { type: "string", description: "Business category (AUTO, BEAUTY, EDU, FINANCE, HEALTH, RETAIL, etc.)" },
      },
    },
  },
  {
    name: "get_phone_numbers",
    description: "List all registered phone numbers with quality rating, status, and messaging limits.",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

export async function handleProfileTool(
  toolName: string,
  args: Record<string, unknown>,
  client: WhatsAppClient
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (toolName) {
      case "get_business_profile": {
        const profile = await client.getBusinessProfile();
        return success({ message: "Business profile retrieved", profile });
      }

      case "update_business_profile": {
        const p = updateBusinessProfileSchema.parse(args);
        const result = await client.updateBusinessProfile(p as any);
        return success({ message: "Business profile updated", ...result });
      }

      case "get_phone_numbers": {
        const phones = await client.getPhoneNumbers();
        return success({
          message: `Found ${phones.length} phone number(s)`,
          phone_numbers: phones.map((p) => ({
            id: p.id,
            number: p.display_phone_number,
            name: p.verified_name,
            quality: p.quality_rating,
            status: p.status,
            messaging_limit: p.messaging_limit_tier,
          })),
        });
      }

      default:
        return { content: [{ type: "text", text: `Unknown profile tool: ${toolName}` }], isError: true };
    }
  });
}
