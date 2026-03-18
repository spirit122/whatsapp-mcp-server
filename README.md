# WhatsApp Business MCP Server

The most complete MCP (Model Context Protocol) server for WhatsApp Business Cloud API. **35 tools** across **8 modules** — hosted on Cloudflare Workers.

**Built by [spirit122](https://github.com/spirit122)**

---

## Why This MCP Server?

| Feature | Others | **This Server** |
|---------|:------:|:---------------:|
| Send messages (text, media, templates) | Yes | Yes |
| Interactive messages (buttons, lists, products) | Partial | **Full** |
| **Receive messages (webhooks)** | No | **Yes** |
| **WhatsApp Flows (forms/surveys)** | No | **Yes** |
| **Analytics & quality monitoring** | No | **Yes** |
| **Multi-number support** | No | **Yes** |
| Hosted (zero installation) | No | **Yes** |
| Tier-based access control | No | **Yes** |
| Documentation in Spanish | No | **Yes** |

---

## Quick Start

### 1. Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Meta Business Account](https://business.facebook.com/)
- WhatsApp Business API access (via Meta Developer Portal)
- Node.js 18+

### 2. Clone & Install

```bash
git clone https://github.com/spirit122/whatsapp-mcp-server.git
cd whatsapp-mcp-server
npm install
```

### 3. Configure Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create whatsapp-mcp-db

# Create KV namespace
wrangler kv namespace create CACHE

# Update wrangler.toml with the IDs from above
```

### 4. Set Secrets

```bash
wrangler secret put WHATSAPP_ACCESS_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER_ID
wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID
wrangler secret put WHATSAPP_WEBHOOK_VERIFY_TOKEN
wrangler secret put META_APP_SECRET
```

### 5. Deploy

```bash
# Run database migrations
wrangler d1 execute whatsapp-mcp-db --file=./schemas/d1-schema.sql

# Deploy to Cloudflare
wrangler deploy
```

### 6. Connect to Claude

Add to your Claude MCP configuration:

```json
{
  "mcpServers": {
    "whatsapp": {
      "type": "sse",
      "url": "https://whatsapp-mcp-server.YOUR_SUBDOMAIN.workers.dev/mcp"
    }
  }
}
```

---

## All 35 Tools

### Module 1: Messages (10 tools)
| Tool | Description |
|------|------------|
| `send_text_message` | Send text with URL preview & reply support |
| `send_image_message` | Send image via URL or media ID |
| `send_video_message` | Send video (MP4, 3GPP) |
| `send_audio_message` | Send audio (AAC, MP3, OGG) |
| `send_document_message` | Send document (PDF, etc.) |
| `send_sticker_message` | Send sticker (WEBP) |
| `send_location_message` | Send location with coordinates |
| `send_contact_message` | Send contact cards |
| `send_reaction` | React with emoji |
| `mark_as_read` | Mark message as read |

### Module 2: Interactive Messages (5 tools) `PRO`
| Tool | Description |
|------|------------|
| `send_button_message` | Up to 3 reply buttons |
| `send_list_message` | Scrollable list with sections |
| `send_cta_url_button` | Call-to-action URL button |
| `send_product_message` | Single product from catalog |
| `send_product_list_message` | Multi-product catalog view |

### Module 3: Templates (5 tools)
| Tool | Description |
|------|------------|
| `send_template_message` | Send approved template with params |
| `list_templates` | List all templates |
| `create_template` | Create new template |
| `delete_template` | Delete template |
| `get_template_status` | Check approval status |

### Module 4: Media (3 tools)
| Tool | Description |
|------|------------|
| `upload_media` | Upload file to WhatsApp (max 100MB) |
| `get_media_url` | Get download URL (expires in 5min) |
| `delete_media` | Delete uploaded media |

### Module 5: Webhooks (3 tools) `PRO`
| Tool | Description |
|------|------------|
| `get_recent_messages` | Get received messages |
| `get_message_status_updates` | Track sent/delivered/read/failed |
| `search_conversations` | Search by text, phone, date |

### Module 6: Profile (3 tools)
| Tool | Description |
|------|------------|
| `get_business_profile` | Get business profile info |
| `update_business_profile` | Update profile fields |
| `get_phone_numbers` | List registered numbers |

### Module 7: WhatsApp Flows (2 tools) `PRO`
| Tool | Description |
|------|------------|
| `create_flow` | Create interactive form/survey |
| `send_flow_message` | Send flow to user |

### Module 8: Analytics (4 tools) `PRO`
| Tool | Description |
|------|------------|
| `get_conversation_analytics` | Conversation metrics |
| `get_phone_quality_rating` | Number quality (GREEN/YELLOW/RED) |
| `get_messaging_limits` | Current tier & limits |
| `get_delivery_stats` | Delivery statistics |

---

## Pricing Tiers

| | Free | Pro ($29/mo) | Enterprise ($99/mo) |
|---|:---:|:---:|:---:|
| Core messages (10 tools) | Yes | Yes | Yes |
| Templates (5 tools) | Yes | Yes | Yes |
| Media (3 tools) | Yes | Yes | Yes |
| Profile (3 tools) | Yes | Yes | Yes |
| Interactive (5 tools) | - | Yes | Yes |
| Webhooks (3 tools) | - | Yes | Yes |
| Flows (2 tools) | - | Yes | Yes |
| Analytics (4 tools) | - | Yes | Yes |
| Rate limit | 100/hr | 1,000/hr | 10,000/hr |
| Support | Community | Email | Priority |

---

## Webhook Setup

To receive incoming messages, configure your webhook URL in the Meta Developer Portal:

1. Go to your Meta App > WhatsApp > Configuration
2. Set Webhook URL: `https://whatsapp-mcp-server.YOUR_SUBDOMAIN.workers.dev/webhook`
3. Set Verify Token: (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
4. Subscribe to: `messages`

---

## Development

```bash
# Run locally
wrangler dev

# Run tests
npm test

# Type check
npm run typecheck
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/tools` | List all available tools |
| `POST` | `/mcp` | MCP JSON-RPC endpoint |
| `GET` | `/sse` | MCP SSE endpoint |
| `GET` | `/webhook` | Meta webhook verification |
| `POST` | `/webhook` | Meta webhook events |

---

## Architecture

```
Client (Claude/LLM) → Cloudflare Worker → WhatsApp Cloud API
                            ↓
                    Durable Objects (webhooks, sessions)
                            ↓
                    D1 (logs) + KV (cache)
```

---

## License

MIT - Built by [spirit122](https://github.com/spirit122)
