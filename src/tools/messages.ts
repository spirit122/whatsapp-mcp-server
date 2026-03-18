// ─────────────────────────────────────────────
// Module 1: Core Messages (10 tools)
// ─────────────────────────────────────────────

import type { McpToolResult } from "../whatsapp/types";
import { WhatsAppClient } from "../whatsapp/client";
import { withErrorHandling } from "../utils/errors";
import {
  sendTextSchema,
  sendImageSchema,
  sendVideoSchema,
  sendAudioSchema,
  sendDocumentSchema,
  sendStickerSchema,
  sendLocationSchema,
  sendContactSchema,
  sendReactionSchema,
  markAsReadSchema,
} from "../whatsapp/validators";

function success(data: unknown): McpToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

// ── Tool Definitions ──

export const messageToolDefinitions = [
  {
    name: "send_text_message",
    description:
      "Send a text message to a WhatsApp number. Supports URL preview and reply-to.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number (digits only, with country code, e.g. 5215512345678)" },
        body: { type: "string", description: "Message text (max 4096 characters)" },
        preview_url: { type: "boolean", description: "Enable URL preview in message", default: false },
        reply_to: { type: "string", description: "Message ID to reply to (optional)" },
      },
      required: ["to", "body"],
    },
  },
  {
    name: "send_image_message",
    description: "Send an image via URL or media ID. Supports caption.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        image: {
          type: "object",
          properties: {
            id: { type: "string", description: "Media ID (from upload_media)" },
            link: { type: "string", description: "Image URL (JPEG, PNG)" },
            caption: { type: "string", description: "Image caption" },
          },
        },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "image"],
    },
  },
  {
    name: "send_video_message",
    description: "Send a video via URL or media ID. Supports caption.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        video: {
          type: "object",
          properties: {
            id: { type: "string", description: "Media ID" },
            link: { type: "string", description: "Video URL (MP4, 3GPP)" },
            caption: { type: "string", description: "Video caption" },
          },
        },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "video"],
    },
  },
  {
    name: "send_audio_message",
    description: "Send an audio file via URL or media ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        audio: {
          type: "object",
          properties: {
            id: { type: "string", description: "Media ID" },
            link: { type: "string", description: "Audio URL (AAC, MP3, OGG, AMR)" },
          },
        },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "audio"],
    },
  },
  {
    name: "send_document_message",
    description: "Send a document (PDF, etc.) via URL or media ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        document: {
          type: "object",
          properties: {
            id: { type: "string", description: "Media ID" },
            link: { type: "string", description: "Document URL" },
            caption: { type: "string", description: "Document caption" },
            filename: { type: "string", description: "Display filename" },
          },
        },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "document"],
    },
  },
  {
    name: "send_sticker_message",
    description: "Send a sticker via URL or media ID (WEBP format).",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        sticker: {
          type: "object",
          properties: {
            id: { type: "string", description: "Media ID" },
            link: { type: "string", description: "Sticker URL (WEBP)" },
          },
        },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "sticker"],
    },
  },
  {
    name: "send_location_message",
    description: "Send a location with coordinates, name, and address.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        latitude: { type: "number", description: "Latitude (-90 to 90)" },
        longitude: { type: "number", description: "Longitude (-180 to 180)" },
        name: { type: "string", description: "Location name" },
        address: { type: "string", description: "Location address" },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "latitude", "longitude"],
    },
  },
  {
    name: "send_contact_message",
    description: "Send one or more contact cards.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        contacts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "object",
                properties: {
                  formatted_name: { type: "string" },
                  first_name: { type: "string" },
                  last_name: { type: "string" },
                },
                required: ["formatted_name"],
              },
              phones: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    phone: { type: "string" },
                    type: { type: "string", enum: ["CELL", "MAIN", "HOME", "WORK"] },
                  },
                },
              },
              emails: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    type: { type: "string", enum: ["HOME", "WORK"] },
                  },
                },
              },
            },
            required: ["name"],
          },
          description: "Array of contacts to send",
        },
        reply_to: { type: "string", description: "Message ID to reply to" },
      },
      required: ["to", "contacts"],
    },
  },
  {
    name: "send_reaction",
    description: "React to a message with an emoji.",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient phone number" },
        message_id: { type: "string", description: "ID of message to react to" },
        emoji: { type: "string", description: "Emoji to react with (e.g. 👍, ❤️, 😂)" },
      },
      required: ["to", "message_id", "emoji"],
    },
  },
  {
    name: "mark_as_read",
    description: "Mark a received message as read (shows blue checkmarks).",
    inputSchema: {
      type: "object" as const,
      properties: {
        message_id: { type: "string", description: "ID of message to mark as read" },
      },
      required: ["message_id"],
    },
  },
];

// ── Tool Handlers ──

export async function handleMessageTool(
  toolName: string,
  args: Record<string, unknown>,
  client: WhatsAppClient
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (toolName) {
      case "send_text_message": {
        const params = sendTextSchema.parse(args);
        const result = await client.sendTextMessage(
          params.to,
          params.body,
          params.preview_url,
          params.reply_to
        );
        return success({ message: "Text message sent", ...result });
      }

      case "send_image_message": {
        const params = sendImageSchema.parse(args);
        const result = await client.sendImageMessage(
          params.to,
          params.image,
          params.reply_to
        );
        return success({ message: "Image sent", ...result });
      }

      case "send_video_message": {
        const params = sendVideoSchema.parse(args);
        const result = await client.sendVideoMessage(
          params.to,
          params.video,
          params.reply_to
        );
        return success({ message: "Video sent", ...result });
      }

      case "send_audio_message": {
        const params = sendAudioSchema.parse(args);
        const result = await client.sendAudioMessage(
          params.to,
          params.audio,
          params.reply_to
        );
        return success({ message: "Audio sent", ...result });
      }

      case "send_document_message": {
        const params = sendDocumentSchema.parse(args);
        const result = await client.sendDocumentMessage(
          params.to,
          params.document,
          params.reply_to
        );
        return success({ message: "Document sent", ...result });
      }

      case "send_sticker_message": {
        const params = sendStickerSchema.parse(args);
        const result = await client.sendStickerMessage(
          params.to,
          params.sticker,
          params.reply_to
        );
        return success({ message: "Sticker sent", ...result });
      }

      case "send_location_message": {
        const params = sendLocationSchema.parse(args);
        const result = await client.sendLocationMessage(
          params.to,
          {
            latitude: params.latitude,
            longitude: params.longitude,
            name: params.name,
            address: params.address,
          },
          params.reply_to
        );
        return success({ message: "Location sent", ...result });
      }

      case "send_contact_message": {
        const params = sendContactSchema.parse(args);
        const result = await client.sendContactMessage(
          params.to,
          params.contacts,
          params.reply_to
        );
        return success({ message: "Contact(s) sent", ...result });
      }

      case "send_reaction": {
        const params = sendReactionSchema.parse(args);
        const result = await client.sendReaction(
          params.to,
          params.message_id,
          params.emoji
        );
        return success({ message: "Reaction sent", ...result });
      }

      case "mark_as_read": {
        const params = markAsReadSchema.parse(args);
        const result = await client.markAsRead(params.message_id);
        return success({ message: "Message marked as read", ...result });
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown message tool: ${toolName}` }],
          isError: true,
        };
    }
  });
}
