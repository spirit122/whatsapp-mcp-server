// ─────────────────────────────────────────────
// Module 4: Media (3 tools)
// ─────────────────────────────────────────────

import type { McpToolResult } from "../whatsapp/types";
import { WhatsAppClient } from "../whatsapp/client";
import { withErrorHandling } from "../utils/errors";
import {
  uploadMediaSchema,
  getMediaUrlSchema,
  deleteMediaSchema,
} from "../whatsapp/validators";

function success(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const mediaToolDefinitions = [
  {
    name: "upload_media",
    description:
      "Upload a media file from a URL to WhatsApp servers. Returns a media ID that can be used in messages. Max 100MB.",
    inputSchema: {
      type: "object" as const,
      properties: {
        file_url: { type: "string", description: "Public URL of the file to upload" },
        mime_type: {
          type: "string",
          description: "MIME type (image/jpeg, image/png, video/mp4, audio/mpeg, application/pdf, etc.)",
        },
        filename: { type: "string", description: "Optional display filename" },
      },
      required: ["file_url", "mime_type"],
    },
  },
  {
    name: "get_media_url",
    description: "Get the download URL for an uploaded media file. URLs expire after 5 minutes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        media_id: { type: "string", description: "Media ID from upload or incoming message" },
      },
      required: ["media_id"],
    },
  },
  {
    name: "delete_media",
    description: "Delete a previously uploaded media file from WhatsApp servers.",
    inputSchema: {
      type: "object" as const,
      properties: {
        media_id: { type: "string", description: "Media ID to delete" },
      },
      required: ["media_id"],
    },
  },
];

export async function handleMediaTool(
  toolName: string,
  args: Record<string, unknown>,
  client: WhatsAppClient
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (toolName) {
      case "upload_media": {
        const p = uploadMediaSchema.parse(args);
        const result = await client.uploadMedia(p.file_url, p.mime_type, p.filename);
        return success({
          message: "Media uploaded successfully",
          media_id: result.id,
          hint: "Use this media_id in send_image_message, send_video_message, etc.",
        });
      }

      case "get_media_url": {
        const p = getMediaUrlSchema.parse(args);
        const result = await client.getMediaUrl(p.media_id);
        return success({
          media_id: result.id,
          url: result.url,
          mime_type: result.mime_type,
          file_size: result.file_size,
          note: "URL expires in 5 minutes. Download promptly.",
        });
      }

      case "delete_media": {
        const p = deleteMediaSchema.parse(args);
        const result = await client.deleteMedia(p.media_id);
        return success({ message: "Media deleted", ...result });
      }

      default:
        return { content: [{ type: "text", text: `Unknown media tool: ${toolName}` }], isError: true };
    }
  });
}
