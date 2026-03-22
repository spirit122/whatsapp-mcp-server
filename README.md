<p align="center">
  <h1 align="center">WA MCP Server</h1>
  <p align="center">
    <strong>The most complete MCP Server for WhatsApp Business Cloud API</strong>
  </p>
  <p align="center">
    <a href="https://spirit122.github.io/whatsapp-mcp-server/">Website</a> &middot;
    <a href="https://spirit122.github.io/whatsapp-mcp-server/getting-started.html">Getting Started</a> &middot;
    <a href="https://spirit122.github.io/whatsapp-mcp-server/tools.html">All Tools</a> &middot;
    <a href="https://spirit122.github.io/whatsapp-mcp-server/pricing.html">Pricing</a> &middot;
    <a href="https://spirit122.github.io/whatsapp-mcp-server/dashboard.html">Dashboard</a>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/tools-43-25D366?style=for-the-badge" alt="43 Tools" />
    <img src="https://img.shields.io/badge/modules-10-0088cc?style=for-the-badge" alt="10 Modules" />
    <img src="https://img.shields.io/badge/tests-72%20passing-brightgreen?style=for-the-badge" alt="72 Tests" />
    <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Cloudflare%20Workers-deployed-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare" />
    <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT License" />
  </p>
</p>

---

## Overview

WA MCP Server connects AI assistants like **Claude** with the **WhatsApp Business API**. Send messages, receive replies, manage templates, set up AI chatbots, track analytics, and protect against spam — all through natural language.

```
You: "Send a message to +56 9 1234 5678 saying the order is ready"
Claude: Message sent! ID: wamid.HBgL...
```

### Why this server?

| Feature | Other MCP Servers | **WA MCP Server** |
|---------|:-----------------:|:-----------------:|
| Send messages (text, media, templates) | Yes | Yes |
| Interactive messages (buttons, lists, products) | Partial | **Full** |
| **Receive messages (webhooks)** | No | **Yes** |
| **AI auto-reply chatbot (5 providers)** | No | **Yes** |
| **WhatsApp Flows (forms/surveys)** | No | **Yes** |
| **Analytics & quality monitoring** | No | **Yes** |
| **Anti-spam protection** | No | **Yes** |
| **Multi-tenant (each client uses own WhatsApp)** | No | **Yes** |
| Hosted (zero installation) | No | **Yes** |

---

## Quick Start

### 1. Add to Claude Desktop

**Free tier** (7 tools, no API key):
```json
{
  "mcpServers": {
    "whatsapp": {
      "type": "url",
      "url": "https://whatsapp-mcp-server.eosspirit.workers.dev/mcp"
    }
  }
}
```

**Pro / Enterprise** (with API key):
```json
{
  "mcpServers": {
    "whatsapp": {
      "type": "url",
      "url": "https://whatsapp-mcp-server.eosspirit.workers.dev/mcp",
      "headers": {
        "X-API-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

> **Config file location:**
> - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
> - **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### 2. Restart Claude Desktop

### 3. Start messaging

```
"Send a text to +1234567890 saying hello"
"Show me my message templates"
"What's my phone quality rating?"
"Configure auto-reply with Groq"
```

---

## Plans & Pricing

| | Free | Pro | Enterprise |
|---|:---:|:---:|:---:|
| **Price** | $0 | $29 USD/mo | $99 USD/mo |
| **Tools** | 7 | 27 | 43 |
| Messages (text, image, video, audio, docs) | 5 tools | 10 tools | 10 tools |
| Safety tools (allowlist, spam config) | 2 tools | 2 tools | 5 tools |
| Templates | - | 5 tools | 5 tools |
| Media | - | 3 tools | 3 tools |
| Interactive (buttons, lists, products) | - | 5 tools | 5 tools |
| Webhooks (receive messages) | - | 3 tools | 3 tools |
| Business profile | - | 3 tools | 3 tools |
| WhatsApp Flows | - | - | 2 tools |
| Analytics & quality | - | - | 4 tools |
| AI auto-reply chatbot | - | - | 3 tools |
| Enterprise safety (audit, reports) | - | - | 3 tools |
| Rate limit | 100/hr | 1,000/hr | 10,000/hr |
| Support | Community | Email | Priority + SLA |

<p align="center">
  <a href="https://spirit122.lemonsqueezy.com/checkout/buy/af231967-2bc4-4342-8d2e-e88cdd70ae42"><strong>Get Pro - $29/mo</strong></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://spirit122.lemonsqueezy.com/checkout/buy/5ec0efcf-f1b2-46bd-a1dc-6bd5a9a504b1"><strong>Get Enterprise - $99/mo</strong></a>
</p>

---

## All 43 Tools

### Messages (10 tools)
`send_text_message` `send_image_message` `send_video_message` `send_audio_message` `send_document_message` `send_sticker_message` `send_location_message` `send_contact_message` `send_reaction` `mark_as_read`

### Interactive Messages (5 tools) `PRO`
`send_button_message` `send_list_message` `send_cta_url_button` `send_product_message` `send_product_list_message`

### Templates (5 tools) `PRO`
`send_template_message` `list_templates` `create_template` `delete_template` `get_template_status`

### Media (3 tools) `PRO`
`upload_media` `get_media_url` `delete_media`

### Webhooks (3 tools) `PRO`
`get_recent_messages` `get_message_status_updates` `search_conversations`

### Business Profile (3 tools) `PRO`
`get_business_profile` `update_business_profile` `get_phone_numbers`

### WhatsApp Flows (2 tools) `ENTERPRISE`
`create_flow` `send_flow_message`

### Analytics (4 tools) `ENTERPRISE`
`get_conversation_analytics` `get_phone_quality_rating` `get_messaging_limits` `get_delivery_stats`

### Safety Tools (2 tools)
`manage_allowlist` `get_messaging_safety_status`

### Enterprise Safety (3 tools) `ENTERPRISE`
`get_message_audit_log` `set_custom_rate_limits` `export_safety_report`

### AI Auto-Reply (3 tools) `ENTERPRISE`
`configure_auto_reply` `get_auto_reply_status` `clear_conversation_history`

> See [full tool reference](https://spirit122.github.io/whatsapp-mcp-server/tools.html) with usage examples.

---

## AI Auto-Reply Chatbot

Enterprise customers can enable AI-powered automatic replies. When a customer messages you on WhatsApp, the server calls an AI provider and sends the response back automatically.

**5 supported providers:**

| Provider | Free tier? |
|----------|:----------:|
| **Groq** (Llama 3.3 70B) | Yes |
| **OpenAI** (GPT-4o) | No |
| **Claude** (Anthropic) | No |
| **Gemini** (Google) | Limited |
| **DeepSeek** | No |

Each client uses **their own AI API key** — no AI costs on our side.

```
Customer: "Hola, cuanto cuesta?"
Bot: "Hola! Tenemos planes Free, Pro ($29/mes) y Enterprise ($99/mes).
      Visita https://mysite.com para mas detalles."

Customer: "Tienen envio gratis?"
Bot: "Si, envio gratuito en pedidos mayores a $50."
```

---

## Anti-Spam Protection

Every outbound message passes through **MessageGuard** before sending. No bad prompt can turn into spam.

| Protection | Free | Pro | Enterprise |
|------------|:----:|:---:|:----------:|
| Recipient allowlist | Yes | Yes | Yes |
| Messages per recipient/hr | 5 | 30 | 100 (custom) |
| Unique recipients/hr | 3 | 50 | 500 (custom) |
| Spam content detection | Yes | Yes | Yes |
| Audit logging | - | - | Yes |
| Compliance reports | - | - | Yes |

---

## Architecture

```
Claude / AI Assistant
       |
       v
+---------------------------------+
|   Cloudflare Worker (Edge)      |
|   - MCP Protocol (JSON-RPC)    |
|   - Auth + API Keys + Tiers    |
|   - Rate Limiting + Anti-Spam  |
|   - AI Auto-Reply Engine       |
|   - Billing (Lemonsqueezy)     |
+--------+----------+------------+
         |          |
    +----+----+  +--+-------------+
    | WhatsApp|  | Durable Objects |
    | Cloud   |  | (webhooks,      |
    | API     |  |  sessions)      |
    +---------+  +--+---------+----+
                    |         |
                +---+---+ +---+---+
                |  D1   | |  KV   |
                | logs  | | cache |
                +-------+ +-------+
```

**Tech stack:** TypeScript (strict) | Cloudflare Workers | D1 | KV | Durable Objects | Zod | Vitest

---

## Self-Hosting

```bash
git clone https://github.com/spirit122/whatsapp-mcp-server.git
cd whatsapp-mcp-server
npm install

# Create Cloudflare resources
wrangler d1 create whatsapp-mcp-db
wrangler kv namespace create CACHE

# Set secrets
wrangler secret put WHATSAPP_ACCESS_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER_ID
wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID
wrangler secret put WHATSAPP_WEBHOOK_VERIFY_TOKEN
wrangler secret put META_APP_SECRET

# Deploy
wrangler d1 execute whatsapp-mcp-db --remote --file=./schemas/d1-schema.sql
wrangler deploy
```

> Full self-hosting guide: [spirit122.github.io/whatsapp-mcp-server/self-hosting.html](https://spirit122.github.io/whatsapp-mcp-server/self-hosting.html)

---

## Development

```bash
wrangler dev          # Run locally
npm test              # Run 72 tests
npm run typecheck     # TypeScript strict check
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/tools` | List all tools |
| `POST` | `/mcp` | MCP JSON-RPC (Claude) |
| `GET/POST` | `/webhook` | WhatsApp webhooks |
| `POST` | `/billing/webhook` | Payment webhooks |

---

## Support

| Tier | Channel |
|------|---------|
| Free | [GitHub Issues](https://github.com/spirit122/whatsapp-mcp-server/issues) |
| Pro | Email support |
| Enterprise | Priority support with SLA |

---

## License

MIT - Built by [spirit122](https://github.com/spirit122) | [Website](https://spirit122.github.io/whatsapp-mcp-server/) | [Product Hunt](https://www.producthunt.com/products/wa-mcp-server)
