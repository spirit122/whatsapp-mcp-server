// ─────────────────────────────────────────────
// WhatsApp Business Cloud API — TypeScript Types
// API Version: v21.0
// ─────────────────────────────────────────────

// ── Environment Bindings ──

export interface Env {
  // Cloudflare Bindings
  CACHE: KVNamespace;
  DB: D1Database;
  WEBHOOK_RECEIVER: DurableObjectNamespace;
  SESSION_MANAGER: DurableObjectNamespace;

  // WhatsApp API Config
  WHATSAPP_API_VERSION: string;
  WHATSAPP_API_BASE_URL: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_BUSINESS_ACCOUNT_ID: string;
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: string;
  META_APP_SECRET: string;

  // MCP Config
  MCP_SERVER_NAME: string;
  MCP_SERVER_VERSION: string;
  LOG_LEVEL: string;

  // Billing (Lemonsqueezy)
  LEMONSQUEEZY_WEBHOOK_SECRET: string;
  PRO_VARIANT_IDS?: string;
  ENTERPRISE_VARIANT_IDS?: string;
}

// ── Message Types ──

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "location"
  | "contacts"
  | "interactive"
  | "template"
  | "reaction";

// ── Send Message Request ──

export interface SendMessageRequest {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  to: string;
  type: MessageType;
  text?: TextMessage;
  image?: MediaMessage;
  video?: MediaMessage;
  audio?: MediaMessage;
  document?: DocumentMessage;
  sticker?: MediaMessage;
  location?: LocationMessage;
  contacts?: ContactMessage[];
  interactive?: InteractiveMessage;
  template?: TemplateMessage;
  reaction?: ReactionMessage;
  context?: MessageContext;
}

export interface MessageContext {
  message_id: string;
}

// ── Text Message ──

export interface TextMessage {
  body: string;
  preview_url?: boolean;
}

// ── Media Messages ──

export interface MediaMessage {
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
}

export interface DocumentMessage extends MediaMessage {
  filename?: string;
}

// ── Location Message ──

export interface LocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

// ── Contact Message ──

export interface ContactMessage {
  addresses?: ContactAddress[];
  birthday?: string;
  emails?: ContactEmail[];
  name: ContactName;
  org?: ContactOrg;
  phones?: ContactPhone[];
  urls?: ContactUrl[];
}

export interface ContactName {
  formatted_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  prefix?: string;
  suffix?: string;
}

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  country_code?: string;
  type?: "HOME" | "WORK";
}

export interface ContactEmail {
  email: string;
  type?: "HOME" | "WORK";
}

export interface ContactOrg {
  company?: string;
  department?: string;
  title?: string;
}

export interface ContactPhone {
  phone: string;
  type?: "CELL" | "MAIN" | "IPHONE" | "HOME" | "WORK";
  wa_id?: string;
}

export interface ContactUrl {
  url: string;
  type?: "HOME" | "WORK";
}

// ── Interactive Messages ──

export interface InteractiveMessage {
  type: "button" | "list" | "cta_url" | "product" | "product_list";
  header?: InteractiveHeader;
  body: InteractiveBody;
  footer?: InteractiveFooter;
  action: InteractiveAction;
}

export interface InteractiveHeader {
  type: "text" | "image" | "video" | "document";
  text?: string;
  image?: MediaMessage;
  video?: MediaMessage;
  document?: DocumentMessage;
}

export interface InteractiveBody {
  text: string;
}

export interface InteractiveFooter {
  text: string;
}

export interface InteractiveAction {
  // For button type
  buttons?: InteractiveButton[];
  // For list type
  button?: string;
  sections?: InteractiveSection[];
  // For cta_url type
  name?: string;
  parameters?: CtaUrlParameters;
  // For product type
  catalog_id?: string;
  product_retailer_id?: string;
}

export interface InteractiveButton {
  type: "reply";
  reply: {
    id: string;
    title: string;
  };
}

export interface InteractiveSection {
  title?: string;
  rows: InteractiveSectionRow[];
}

export interface InteractiveSectionRow {
  id: string;
  title: string;
  description?: string;
}

export interface CtaUrlParameters {
  display_text: string;
  url: string;
}

// ── Template Messages ──

export interface TemplateMessage {
  name: string;
  language: {
    code: string;
  };
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: "quick_reply" | "url";
  index?: number;
  parameters?: TemplateParameter[];
}

export interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "video" | "document";
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: MediaMessage;
  video?: MediaMessage;
  document?: DocumentMessage;
}

// ── Reaction Message ──

export interface ReactionMessage {
  message_id: string;
  emoji: string;
}

// ── API Responses ──

export interface SendMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_data?: {
      messaging_product: string;
      details: string;
    };
  };
}

// ── Template Management ──

export interface TemplateInfo {
  name: string;
  components: TemplateComponentInfo[];
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  id: string;
}

export interface TemplateComponentInfo {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
}

export interface CreateTemplateRequest {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  components: TemplateComponentInfo[];
  allow_category_change?: boolean;
}

export interface ListTemplatesResponse {
  data: TemplateInfo[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

// ── Media Management ──

export interface UploadMediaResponse {
  id: string;
}

export interface GetMediaUrlResponse {
  id: string;
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  messaging_product: "whatsapp";
}

// ── Business Profile ──

export interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  websites?: string[];
  vertical?:
    | "UNDEFINED"
    | "OTHER"
    | "AUTO"
    | "BEAUTY"
    | "APPAREL"
    | "EDU"
    | "ENTERTAIN"
    | "EVENT_PLAN"
    | "FINANCE"
    | "GROCERY"
    | "GOVT"
    | "HOTEL"
    | "HEALTH"
    | "NONPROFIT"
    | "PROF_SERVICES"
    | "RETAIL"
    | "TRAVEL"
    | "RESTAURANT"
    | "NOT_A_BIZ";
}

export interface BusinessProfileResponse {
  data: BusinessProfile[];
}

// ── Phone Numbers ──

export interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: "GREEN" | "YELLOW" | "RED";
  status: string;
  name_status: string;
  code_verification_status: string;
  messaging_limit_tier?: string;
  platform_type?: string;
}

export interface PhoneNumbersResponse {
  data: PhoneNumberInfo[];
}

// ── Webhook Events ──

export interface WebhookPayload {
  object: "whatsapp_business_account";
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: "messages";
}

export interface WebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: IncomingMessage[];
  statuses?: MessageStatus[];
  errors?: WebhookError[];
}

export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: MessageType | "button" | "order" | "system" | "unknown";
  text?: { body: string };
  image?: IncomingMedia;
  video?: IncomingMedia;
  audio?: IncomingMedia;
  document?: IncomingMedia & { filename?: string };
  sticker?: IncomingMedia & { animated?: boolean };
  location?: LocationMessage;
  contacts?: ContactMessage[];
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { text: string; payload: string };
  context?: { from: string; id: string };
  errors?: WebhookError[];
}

export interface IncomingMedia {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

export interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: "business_initiated" | "user_initiated" | "referral_conversion";
    };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: "CBP";
    category:
      | "authentication"
      | "marketing"
      | "utility"
      | "service"
      | "referral_conversion";
  };
  errors?: WebhookError[];
}

export interface WebhookError {
  code: number;
  title: string;
  message: string;
  error_data?: {
    details: string;
  };
}

// ── WhatsApp Flows ──

export interface FlowInfo {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "DEPRECATED" | "BLOCKED" | "THROTTLED";
  categories: string[];
  validation_errors?: Array<{
    error: string;
    error_type: string;
    message: string;
    line_start?: number;
    line_end?: number;
    column_start?: number;
    column_end?: number;
  }>;
}

export interface CreateFlowRequest {
  name: string;
  categories: string[];
  clone_flow_id?: string;
}

export interface SendFlowMessage {
  type: "flow";
  header?: InteractiveHeader;
  body: InteractiveBody;
  footer?: InteractiveFooter;
  action: {
    name: "flow";
    parameters: {
      flow_message_version: "3";
      flow_token: string;
      flow_id: string;
      flow_cta: string;
      flow_action: "navigate" | "data_exchange";
      flow_action_payload?: {
        screen: string;
        data?: Record<string, unknown>;
      };
    };
  };
}

// ── Analytics ──

export interface ConversationAnalytics {
  data: Array<{
    data_points: Array<{
      start: number;
      end: number;
      sent: number;
      delivered: number;
      conversation: number;
      cost: number;
    }>;
  }>;
}

// ── MCP Tool Definitions ──

export interface McpToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}
