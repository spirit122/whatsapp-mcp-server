import { z } from "zod";

// ── Phone number validation ──

export const phoneNumberSchema = z
  .string()
  .min(10)
  .max(15)
  .regex(/^\d+$/, "Phone number must contain only digits (no +, spaces, or dashes)");

// ── Text message ──

export const sendTextSchema = z.object({
  to: phoneNumberSchema,
  body: z.string().min(1).max(4096),
  preview_url: z.boolean().optional().default(false),
  reply_to: z.string().optional(),
});

// ── Media messages ──

const mediaSourceSchema = z
  .object({
    id: z.string().optional(),
    link: z.string().url().optional(),
    caption: z.string().max(1024).optional(),
  })
  .refine((data) => data.id || data.link, {
    message: "Either 'id' (media ID) or 'link' (URL) must be provided",
  });

export const sendImageSchema = z.object({
  to: phoneNumberSchema,
  image: mediaSourceSchema,
  reply_to: z.string().optional(),
});

export const sendVideoSchema = z.object({
  to: phoneNumberSchema,
  video: mediaSourceSchema,
  reply_to: z.string().optional(),
});

export const sendAudioSchema = z.object({
  to: phoneNumberSchema,
  audio: z.object({
    id: z.string().optional(),
    link: z.string().url().optional(),
  }).refine((data) => data.id || data.link, {
    message: "Either 'id' or 'link' must be provided",
  }),
  reply_to: z.string().optional(),
});

export const sendDocumentSchema = z.object({
  to: phoneNumberSchema,
  document: mediaSourceSchema.and(
    z.object({ filename: z.string().optional() })
  ),
  reply_to: z.string().optional(),
});

export const sendStickerSchema = z.object({
  to: phoneNumberSchema,
  sticker: z.object({
    id: z.string().optional(),
    link: z.string().url().optional(),
  }).refine((data) => data.id || data.link, {
    message: "Either 'id' or 'link' must be provided",
  }),
  reply_to: z.string().optional(),
});

// ── Location message ──

export const sendLocationSchema = z.object({
  to: phoneNumberSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  reply_to: z.string().optional(),
});

// ── Contact message ──

export const sendContactSchema = z.object({
  to: phoneNumberSchema,
  contacts: z.array(
    z.object({
      name: z.object({
        formatted_name: z.string(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
      }),
      phones: z.array(
        z.object({
          phone: z.string(),
          type: z.enum(["CELL", "MAIN", "IPHONE", "HOME", "WORK"]).optional(),
        })
      ).optional(),
      emails: z.array(
        z.object({
          email: z.string().email(),
          type: z.enum(["HOME", "WORK"]).optional(),
        })
      ).optional(),
    })
  ).min(1),
  reply_to: z.string().optional(),
});

// ── Reaction ──

export const sendReactionSchema = z.object({
  to: phoneNumberSchema,
  message_id: z.string(),
  emoji: z.string().min(1).max(10),
});

// ── Mark as read ──

export const markAsReadSchema = z.object({
  message_id: z.string(),
});

// ── Interactive: Buttons ──

export const sendButtonMessageSchema = z.object({
  to: phoneNumberSchema,
  body: z.string().min(1).max(1024),
  buttons: z.array(
    z.object({
      id: z.string().max(256),
      title: z.string().max(20),
    })
  ).min(1).max(3),
  header: z.string().max(60).optional(),
  footer: z.string().max(60).optional(),
  reply_to: z.string().optional(),
});

// ── Interactive: List ──

export const sendListMessageSchema = z.object({
  to: phoneNumberSchema,
  body: z.string().min(1).max(1024),
  button_text: z.string().max(20),
  sections: z.array(
    z.object({
      title: z.string().max(24).optional(),
      rows: z.array(
        z.object({
          id: z.string().max(200),
          title: z.string().max(24),
          description: z.string().max(72).optional(),
        })
      ).min(1).max(10),
    })
  ).min(1).max(10),
  header: z.string().max(60).optional(),
  footer: z.string().max(60).optional(),
  reply_to: z.string().optional(),
});

// ── Interactive: CTA URL ──

export const sendCtaUrlSchema = z.object({
  to: phoneNumberSchema,
  body: z.string().min(1).max(1024),
  button_text: z.string().max(20),
  url: z.string().url(),
  header: z.string().max(60).optional(),
  footer: z.string().max(60).optional(),
  reply_to: z.string().optional(),
});

// ── Product messages ──

export const sendProductSchema = z.object({
  to: phoneNumberSchema,
  catalog_id: z.string(),
  product_retailer_id: z.string(),
  body: z.string().max(1024).optional(),
  footer: z.string().max(60).optional(),
  reply_to: z.string().optional(),
});

export const sendProductListSchema = z.object({
  to: phoneNumberSchema,
  catalog_id: z.string(),
  header: z.string().max(60),
  body: z.string().min(1).max(1024),
  sections: z.array(
    z.object({
      title: z.string().max(24),
      product_items: z.array(
        z.object({
          product_retailer_id: z.string(),
        })
      ).min(1),
    })
  ).min(1).max(10),
  footer: z.string().max(60).optional(),
  reply_to: z.string().optional(),
});

// ── Templates ──

export const sendTemplateSchema = z.object({
  to: phoneNumberSchema,
  template_name: z.string(),
  language_code: z.string().default("en_US"),
  header_params: z.array(z.string()).optional(),
  body_params: z.array(z.string()).optional(),
  header_image: z.object({ link: z.string().url() }).optional(),
  header_video: z.object({ link: z.string().url() }).optional(),
  header_document: z.object({
    link: z.string().url(),
    filename: z.string().optional(),
  }).optional(),
  button_params: z.array(
    z.object({
      sub_type: z.enum(["quick_reply", "url"]),
      index: z.number(),
      text: z.string().optional(),
      payload: z.string().optional(),
    })
  ).optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().regex(/^[a-z0-9_]+$/, "Template name must be lowercase alphanumeric with underscores"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  language: z.string(),
  header: z.object({
    type: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]).optional(),
    text: z.string().optional(),
  }).optional(),
  body: z.string().min(1),
  footer: z.string().max(60).optional(),
  buttons: z.array(
    z.object({
      type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER"]),
      text: z.string(),
      url: z.string().optional(),
      phone_number: z.string().optional(),
    })
  ).max(10).optional(),
});

export const listTemplatesSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  status: z.enum(["APPROVED", "PENDING", "REJECTED"]).optional(),
  name_or_content: z.string().optional(),
});

export const deleteTemplateSchema = z.object({
  template_name: z.string(),
});

export const getTemplateStatusSchema = z.object({
  template_name: z.string(),
});

// ── Media management ──

export const uploadMediaSchema = z.object({
  file_url: z.string().url().refine((url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;
      const h = parsed.hostname;
      if (h === "localhost" || h === "127.0.0.1" || h.startsWith("10.") ||
          h.startsWith("192.168.") || h.startsWith("169.254.") ||
          h.endsWith(".internal") || h.endsWith(".local")) return false;
      return true;
    } catch { return false; }
  }, "URL must be a public HTTPS URL"),
  mime_type: z.string().regex(/^(image|video|audio|application)\//, "Invalid MIME type"),
  filename: z.string().max(255).optional(),
});

export const getMediaUrlSchema = z.object({
  media_id: z.string(),
});

export const deleteMediaSchema = z.object({
  media_id: z.string(),
});

// ── Business profile ──

export const updateBusinessProfileSchema = z.object({
  about: z.string().max(139).optional(),
  address: z.string().max(256).optional(),
  description: z.string().max(512).optional(),
  email: z.string().email().optional(),
  websites: z.array(z.string().url()).max(2).optional(),
  vertical: z.string().optional(),
});

// ── Webhooks / conversations ──

export const getRecentMessagesSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  phone_number: z.string().optional(),
  since: z.string().optional(),
});

export const getMessageStatusSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  status: z.enum(["sent", "delivered", "read", "failed"]).optional(),
});

export const searchConversationsSchema = z.object({
  query: z.string().min(1),
  phone_number: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  limit: z.number().min(1).max(50).optional().default(20),
});

// ── WhatsApp Flows ──

export const createFlowSchema = z.object({
  name: z.string().min(1),
  categories: z.array(z.string()).min(1),
});

export const sendFlowMessageSchema = z.object({
  to: phoneNumberSchema,
  flow_id: z.string(),
  flow_token: z.string(),
  flow_cta: z.string().max(20),
  flow_action: z.enum(["navigate", "data_exchange"]),
  screen: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  body: z.string().min(1).max(1024),
  header: z.string().max(60).optional(),
  footer: z.string().max(60).optional(),
});

// ── Analytics ──

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format");

export const getAnalyticsSchema = z.object({
  start_date: dateStringSchema,
  end_date: dateStringSchema,
  granularity: z.enum(["HALF_HOUR", "DAY", "MONTH"]).optional().default("DAY"),
});

export const getDeliveryStatsSchema = z.object({
  start_date: dateStringSchema,
  end_date: dateStringSchema,
});
