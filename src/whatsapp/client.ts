// ─────────────────────────────────────────────
// WhatsApp Business Cloud API Client
// Handles all HTTP communication with Meta's API
// ─────────────────────────────────────────────

import type {
  Env,
  SendMessageRequest,
  SendMessageResponse,
  ErrorResponse,
  TextMessage,
  MediaMessage,
  DocumentMessage,
  LocationMessage,
  ContactMessage,
  InteractiveMessage,
  TemplateMessage,
  ReactionMessage,
  MessageContext,
  TemplateInfo,
  ListTemplatesResponse,
  CreateTemplateRequest,
  UploadMediaResponse,
  GetMediaUrlResponse,
  BusinessProfile,
  BusinessProfileResponse,
  PhoneNumberInfo,
  PhoneNumbersResponse,
  FlowInfo,
  CreateFlowRequest,
  ConversationAnalytics,
  McpToolResult,
} from "./types";

export class WhatsAppClient {
  private baseUrl: string;
  private token: string;
  private phoneNumberId: string;
  private wabaId: string;

  constructor(env: Env) {
    this.baseUrl = `${env.WHATSAPP_API_BASE_URL}/${env.WHATSAPP_API_VERSION}`;
    this.token = env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    this.wabaId = env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  }

  // ── Private HTTP methods ──

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ErrorResponse;
      throw new WhatsAppApiError(
        error.error?.message || "Unknown API error",
        error.error?.code || response.status,
        error.error?.error_subcode,
        error.error?.fbtrace_id
      );
    }

    return data as T;
  }

  private async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = params
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    return this.request<T>(url, { method: "GET" });
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private async del<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // ════════════════════════════════════════════
  // MODULE 1: Core Messages
  // ════════════════════════════════════════════

  private buildMessagePayload(
    to: string,
    type: string,
    content: Record<string, unknown>,
    replyTo?: string
  ): SendMessageRequest {
    const payload: SendMessageRequest = {
      messaging_product: "whatsapp",
      to,
      type: type as SendMessageRequest["type"],
      ...content,
    };
    if (replyTo) {
      payload.context = { message_id: replyTo };
    }
    return payload;
  }

  async sendTextMessage(
    to: string,
    body: string,
    previewUrl = false,
    replyTo?: string
  ): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "text", {
        text: { body, preview_url: previewUrl } satisfies TextMessage,
      }, replyTo)
    );
  }

  async sendImageMessage(
    to: string,
    image: MediaMessage,
    replyTo?: string
  ): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "image", { image }, replyTo)
    );
  }

  async sendVideoMessage(
    to: string,
    video: MediaMessage,
    replyTo?: string
  ): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "video", { video }, replyTo)
    );
  }

  async sendAudioMessage(
    to: string,
    audio: { id?: string; link?: string },
    replyTo?: string
  ): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "audio", { audio }, replyTo)
    );
  }

  async sendDocumentMessage(
    to: string,
    document: DocumentMessage,
    replyTo?: string
  ): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "document", { document }, replyTo)
    );
  }

  async sendStickerMessage(
    to: string,
    sticker: { id?: string; link?: string },
    replyTo?: string
  ): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "sticker", { sticker }, replyTo)
    );
  }

  async sendLocationMessage(
    to: string,
    location: LocationMessage,
    replyTo?: string
  ): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "location", { location }, replyTo)
    );
  }

  async sendContactMessage(
    to: string,
    contacts: ContactMessage[],
    replyTo?: string
  ): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "contacts", { contacts }, replyTo)
    );
  }

  async sendReaction(
    to: string,
    messageId: string,
    emoji: string
  ): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "reaction", {
        reaction: { message_id: messageId, emoji } satisfies ReactionMessage,
      })
    );
  }

  async markAsRead(messageId: string): Promise<{ success: boolean }> {
    return this.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    });
  }

  // ════════════════════════════════════════════
  // MODULE 2: Interactive Messages
  // ════════════════════════════════════════════

  async sendButtonMessage(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    options?: { header?: string; footer?: string; replyTo?: string }
  ): Promise<SendMessageResponse> {
    const interactive: InteractiveMessage = {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply" as const,
          reply: { id: b.id, title: b.title },
        })),
      },
    };
    if (options?.header) {
      interactive.header = { type: "text", text: options.header };
    }
    if (options?.footer) {
      interactive.footer = { text: options.footer };
    }

    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "interactive", { interactive }, options?.replyTo)
    );
  }

  async sendListMessage(
    to: string,
    body: string,
    buttonText: string,
    sections: Array<{
      title?: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    options?: { header?: string; footer?: string; replyTo?: string }
  ): Promise<SendMessageResponse> {
    const interactive: InteractiveMessage = {
      type: "list",
      body: { text: body },
      action: {
        button: buttonText,
        sections,
      },
    };
    if (options?.header) {
      interactive.header = { type: "text", text: options.header };
    }
    if (options?.footer) {
      interactive.footer = { text: options.footer };
    }

    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "interactive", { interactive }, options?.replyTo)
    );
  }

  async sendCtaUrlButton(
    to: string,
    body: string,
    buttonText: string,
    url: string,
    options?: { header?: string; footer?: string; replyTo?: string }
  ): Promise<SendMessageResponse> {
    const interactive: InteractiveMessage = {
      type: "cta_url",
      body: { text: body },
      action: {
        name: "cta_url",
        parameters: { display_text: buttonText, url },
      },
    };
    if (options?.header) {
      interactive.header = { type: "text", text: options.header };
    }
    if (options?.footer) {
      interactive.footer = { text: options.footer };
    }

    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "interactive", { interactive }, options?.replyTo)
    );
  }

  async sendProductMessage(
    to: string,
    catalogId: string,
    productRetailerId: string,
    options?: { body?: string; footer?: string; replyTo?: string }
  ): Promise<SendMessageResponse> {
    const interactive: InteractiveMessage = {
      type: "product",
      body: { text: options?.body || "" },
      action: {
        catalog_id: catalogId,
        product_retailer_id: productRetailerId,
      },
    };
    if (options?.footer) {
      interactive.footer = { text: options.footer };
    }

    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "interactive", { interactive }, options?.replyTo)
    );
  }

  async sendProductListMessage(
    to: string,
    catalogId: string,
    header: string,
    body: string,
    sections: Array<{
      title: string;
      product_items: Array<{ product_retailer_id: string }>;
    }>,
    options?: { footer?: string; replyTo?: string }
  ): Promise<SendMessageResponse> {
    const interactive: InteractiveMessage = {
      type: "product_list",
      header: { type: "text", text: header },
      body: { text: body },
      action: {
        catalog_id: catalogId,
        sections: sections as any,
      },
    };
    if (options?.footer) {
      interactive.footer = { text: options.footer };
    }

    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "interactive", { interactive }, options?.replyTo)
    );
  }

  // ════════════════════════════════════════════
  // MODULE 3: Templates
  // ════════════════════════════════════════════

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: TemplateMessage["components"],
    replyTo?: string
  ): Promise<SendMessageResponse> {
    const template: TemplateMessage = {
      name: templateName,
      language: { code: languageCode },
      components,
    };

    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      this.buildMessagePayload(to, "template", { template }, replyTo)
    );
  }

  async listTemplates(
    limit = 20,
    status?: string,
    nameOrContent?: string
  ): Promise<ListTemplatesResponse> {
    const params: Record<string, string> = {
      limit: String(limit),
    };
    if (status) params.status = status;
    if (nameOrContent) params.name_or_content = nameOrContent;

    return this.get<ListTemplatesResponse>(
      `/${this.wabaId}/message_templates`,
      params
    );
  }

  async createTemplate(
    template: CreateTemplateRequest
  ): Promise<{ id: string; status: string; category: string }> {
    return this.post(`/${this.wabaId}/message_templates`, template);
  }

  async deleteTemplate(
    templateName: string
  ): Promise<{ success: boolean }> {
    return this.del(
      `/${this.wabaId}/message_templates?name=${templateName}`
    );
  }

  async getTemplateByName(
    templateName: string
  ): Promise<TemplateInfo | null> {
    const result = await this.listTemplates(1, undefined, templateName);
    return result.data.find((t) => t.name === templateName) || null;
  }

  // ════════════════════════════════════════════
  // MODULE 4: Media
  // ════════════════════════════════════════════

  async uploadMedia(
    fileUrl: string,
    mimeType: string,
    filename?: string
  ): Promise<UploadMediaResponse> {
    // Fetch the file first
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new WhatsAppApiError(`Failed to fetch file from URL: ${fileUrl}`, 400);
    }

    const fileBlob = await fileResponse.blob();
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", mimeType);
    formData.append("file", fileBlob, filename || "file");

    const url = `${this.baseUrl}/${this.phoneNumberId}/media`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      const error = data as ErrorResponse;
      throw new WhatsAppApiError(
        error.error?.message || "Media upload failed",
        error.error?.code || response.status
      );
    }

    return data as UploadMediaResponse;
  }

  async getMediaUrl(mediaId: string): Promise<GetMediaUrlResponse> {
    return this.get<GetMediaUrlResponse>(`/${mediaId}`);
  }

  async deleteMedia(mediaId: string): Promise<{ success: boolean }> {
    return this.del(`/${mediaId}`);
  }

  // ════════════════════════════════════════════
  // MODULE 6: Business Profile
  // ════════════════════════════════════════════

  async getBusinessProfile(): Promise<BusinessProfile> {
    const result = await this.get<BusinessProfileResponse>(
      `/${this.phoneNumberId}/whatsapp_business_profile`,
      { fields: "about,address,description,email,profile_picture_url,websites,vertical" }
    );
    return result.data[0] || {};
  }

  async updateBusinessProfile(
    profile: Partial<BusinessProfile>
  ): Promise<{ success: boolean }> {
    return this.post(`/${this.phoneNumberId}/whatsapp_business_profile`, {
      messaging_product: "whatsapp",
      ...profile,
    });
  }

  async getPhoneNumbers(): Promise<PhoneNumberInfo[]> {
    const result = await this.get<PhoneNumbersResponse>(
      `/${this.wabaId}/phone_numbers`
    );
    return result.data;
  }

  // ════════════════════════════════════════════
  // MODULE 7: WhatsApp Flows
  // ════════════════════════════════════════════

  async createFlow(
    request: CreateFlowRequest
  ): Promise<FlowInfo> {
    return this.post<FlowInfo>(`/${this.wabaId}/flows`, request);
  }

  async sendFlowMessage(
    to: string,
    flowId: string,
    flowToken: string,
    flowCta: string,
    flowAction: "navigate" | "data_exchange",
    body: string,
    options?: {
      screen?: string;
      data?: Record<string, unknown>;
      header?: string;
      footer?: string;
    }
  ): Promise<SendMessageResponse> {
    const interactive = {
      type: "flow",
      body: { text: body },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_token: flowToken,
          flow_id: flowId,
          flow_cta: flowCta,
          flow_action: flowAction,
          ...(options?.screen && {
            flow_action_payload: {
              screen: options.screen,
              ...(options.data && { data: options.data }),
            },
          }),
        },
      },
      ...(options?.header && { header: { type: "text", text: options.header } }),
      ...(options?.footer && { footer: { text: options.footer } }),
    };

    return this.post<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive,
      }
    );
  }

  // ════════════════════════════════════════════
  // MODULE 8: Analytics
  // ════════════════════════════════════════════

  async getConversationAnalytics(
    startDate: string,
    endDate: string,
    granularity: "HALF_HOUR" | "DAY" | "MONTH" = "DAY"
  ): Promise<ConversationAnalytics> {
    return this.get<ConversationAnalytics>(
      `/${this.wabaId}`,
      {
        fields: `analytics.start(${startDate}).end(${endDate}).granularity(${granularity})`,
      }
    );
  }

  async getPhoneQualityRating(): Promise<PhoneNumberInfo[]> {
    const phones = await this.getPhoneNumbers();
    return phones.map((p) => ({
      ...p,
      quality_rating: p.quality_rating,
    }));
  }

  async getMessagingLimits(): Promise<
    Array<{ phone_number: string; tier: string | undefined; quality: string }>
  > {
    const phones = await this.getPhoneNumbers();
    return phones.map((p) => ({
      phone_number: p.display_phone_number,
      tier: p.messaging_limit_tier,
      quality: p.quality_rating,
    }));
  }
}

// ── Custom Error Class ──

export class WhatsAppApiError extends Error {
  code: number;
  subcode?: number;
  fbtrace?: string;

  constructor(
    message: string,
    code: number,
    subcode?: number,
    fbtrace?: string
  ) {
    super(message);
    this.name = "WhatsAppApiError";
    this.code = code;
    this.subcode = subcode;
    this.fbtrace = fbtrace;
  }

  toMcpResult(): McpToolResult {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: true,
              message: this.message,
              code: this.code,
              subcode: this.subcode,
              fbtrace: this.fbtrace,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
