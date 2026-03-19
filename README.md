# WhatsApp Business MCP Server

> The most complete MCP Server for WhatsApp Business Cloud API.
> **38 tools** | **8 modules** | **Hosted on Cloudflare Workers** | **Zero installation**

Built by [spirit122](https://github.com/spirit122)

---

## What is this?

This MCP Server lets you control WhatsApp Business directly from **Claude AI**. Send messages, receive replies, manage templates, track analytics — all through natural language.

**Example:** Just tell Claude *"Send a message to +56 9 1234 5678 saying the order is ready"* and it does it.

---

## Get Started in 3 Steps

### Step 1: Choose Your Plan

| | Free | Pro | Enterprise |
|---|:---:|:---:|:---:|
| **Price** | $0 | $27,000 CLP/mo | $92,000 CLP/mo |
| Core messages (text, image, video, audio, docs) | 10 tools | 10 tools | 10 tools |
| Templates (send, create, list, delete) | 5 tools | 5 tools | 5 tools |
| Media (upload, download, delete) | 3 tools | 3 tools | 3 tools |
| Business profile | 3 tools | 3 tools | 3 tools |
| **Interactive messages** (buttons, lists, products) | - | **5 tools** | **5 tools** |
| **Webhooks** (receive messages, search conversations) | - | **3 tools** | **3 tools** |
| **WhatsApp Flows** (forms, surveys in chat) | - | **2 tools** | **2 tools** |
| **Analytics** (metrics, quality, delivery stats) | - | **4 tools** | **4 tools** |
| Support | Community | Email | Priority + SLA |
| **Safety tools** (allowlist, spam config) | 2 tools | 2 tools | **5 tools** |
| **Enterprise safety** (audit log, custom limits, reports) | - | - | **3 tools** |
| **Anti-spam protection** | Strict | Moderate | Fully customizable |
| Rate limit | 100/hr | 1,000/hr | 10,000/hr |
| **Total tools** | **5** | **25** | **38** |

**Buy Pro:** [Click here to subscribe](https://spirit122.lemonsqueezy.com/checkout/buy/e8a99ad7-b092-4902-9efd-1b26a16165ac)

**Buy Enterprise:** [Click here to subscribe](https://spirit122.lemonsqueezy.com/checkout/buy/1c83b498-baa7-41da-8500-601996487f86)

### Step 2: Get Your API Key

After purchasing, you will receive a **license key** via email from Lemonsqueezy. This is your API key.

You can also retrieve it at any time:
```
GET https://whatsapp-mcp-server.eosspirit.workers.dev/billing/api-key?email=YOUR_EMAIL
```

### Step 3: Connect to Claude Desktop

1. Open **Claude Desktop**
2. Click the **gear icon** (Settings) > **Developer** > **Edit Config**
3. This opens `claude_desktop_config.json`. Paste the config below.
4. **Restart Claude Desktop**

> **Config file location:**
> - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
> - **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Free tier** (no API key needed):
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
        "X-API-Key": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

That's it! Now just ask Claude to send messages, check analytics, or anything else.

---

## All 35 Tools

### Module 1: Messages (10 tools)
| Tool | Description |
|------|------------|
| `send_text_message` | Send text with URL preview and reply support |
| `send_image_message` | Send image via URL or media ID |
| `send_video_message` | Send video (MP4, 3GPP) |
| `send_audio_message` | Send audio (AAC, MP3, OGG) |
| `send_document_message` | Send document (PDF, etc.) |
| `send_sticker_message` | Send sticker (WEBP) |
| `send_location_message` | Send location with coordinates |
| `send_contact_message` | Send contact cards |
| `send_reaction` | React to a message with emoji |
| `mark_as_read` | Mark message as read (blue checkmarks) |

### Module 2: Interactive Messages (5 tools) `PRO`
| Tool | Description |
|------|------------|
| `send_button_message` | Up to 3 reply buttons for quick choices |
| `send_list_message` | Scrollable list with sections and rows |
| `send_cta_url_button` | Call-to-action URL button |
| `send_product_message` | Single product from your catalog |
| `send_product_list_message` | Multi-product catalog view |

### Module 3: Templates (5 tools)
| Tool | Description |
|------|------------|
| `send_template_message` | Send approved template with dynamic parameters |
| `list_templates` | List all your message templates |
| `create_template` | Create a new template (requires Meta approval) |
| `delete_template` | Delete a template by name |
| `get_template_status` | Check if a template is approved, pending, or rejected |

### Module 4: Media (3 tools)
| Tool | Description |
|------|------------|
| `upload_media` | Upload file to WhatsApp servers (max 100MB) |
| `get_media_url` | Get download URL for a media file (expires in 5 min) |
| `delete_media` | Delete uploaded media |

### Module 5: Webhooks (3 tools) `PRO`
| Tool | Description |
|------|------------|
| `get_recent_messages` | Get messages received from customers |
| `get_message_status_updates` | Track sent / delivered / read / failed |
| `search_conversations` | Search messages by text, phone number, or date |

### Module 6: Business Profile (3 tools)
| Tool | Description |
|------|------------|
| `get_business_profile` | Get your profile info (about, address, email) |
| `update_business_profile` | Update any profile field |
| `get_phone_numbers` | List registered numbers with quality rating |

### Module 7: WhatsApp Flows (2 tools) `PRO`
| Tool | Description |
|------|------------|
| `create_flow` | Create interactive forms/surveys inside WhatsApp |
| `send_flow_message` | Send a Flow to a customer |

### Module 8: Analytics (4 tools) `PRO`
| Tool | Description |
|------|------------|
| `get_conversation_analytics` | Conversation metrics by time period |
| `get_phone_quality_rating` | Phone quality: GREEN / YELLOW / RED |
| `get_messaging_limits` | Current tier and daily contact limits |
| `get_delivery_stats` | Delivery statistics for a date range |

### Safety Tools (2 tools — all tiers)
| Tool | Description |
|------|------------|
| `manage_allowlist` | Add/remove/list phone numbers on your recipient allowlist. Enable or disable the allowlist. |
| `get_messaging_safety_status` | View your current anti-spam config, rate limits, and usage this hour |

### Enterprise Safety Tools (3 tools) `ENTERPRISE`
| Tool | Description |
|------|------------|
| `get_message_audit_log` | Full audit log of all messages sent. Filter by recipient, status, date. Essential for compliance. |
| `set_custom_rate_limits` | Override default rate limits. Set per-recipient caps, restrict message types, add custom blocked patterns. |
| `export_safety_report` | Generate compliance report with volume stats, risk score, top recipients, blocked messages, and recommendations. |

---

## Anti-Spam Protection

Every outbound message is checked by the built-in **MessageGuard** before sending. No bad prompt can turn into spam.

### Protections by Tier

| Protection | Free | Pro | Enterprise |
|------------|:----:|:---:|:----------:|
| **Recipient allowlist** | Configurable | Configurable | Configurable |
| **Messages per recipient per hour** | 5 | 30 | 100 |
| **Unique recipients per hour** | 3 | 50 | 500 |
| **Spam content detection** | Yes | Yes | Yes |
| **Blocked patterns** | "buy now", "click here to claim", "congratulations you won", etc. | Same | Same |

### How It Works

1. **Allowlist** — Enable it with `manage_allowlist` to restrict who can receive messages. If enabled, only numbers on the list can be messaged.
2. **Per-recipient rate limit** — Max messages to the same number per hour. Prevents flooding a single contact.
3. **Unique recipient limit** — Max different numbers per hour. Prevents mass-messaging campaigns.
4. **Content filter** — Blocks messages matching known spam patterns (promotional language, chain messages).
5. **Duplicate detection** — Blocks sending the same message to the same number within a short window.

### Quick Example

```
You: "Send a message to +1234567890 saying hello"
Claude: ❌ Blocked — recipient not in allowlist. Use manage_allowlist to add them.

You: "Add +1234567890 to my allowlist"
Claude: ✅ Added. Allowlist now has 1 number.

You: "Send a message to +1234567890 saying hello"
Claude: ✅ Message sent!
```

---

## Why This Server vs Others?

| Feature | Other MCP Servers | **This Server** |
|---------|:-----------------:|:---------------:|
| Send messages (text, media, templates) | Yes | Yes |
| Interactive messages (buttons, lists, products) | Partial | **Full** |
| **Receive messages (webhooks)** | No | **Yes** |
| **WhatsApp Flows (forms/surveys)** | No | **Yes** |
| **Analytics & quality monitoring** | No | **Yes** |
| **Multi-number support** | No | **Yes** |
| Hosted (zero installation) | No | **Yes** |
| Tier-based access control | No | **Yes** |
| Paid support | No | **Yes** |

---

## Self-Hosting (Advanced)

If you want to host your own instance instead of using our hosted version:

### Prerequisites
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Meta Business Account](https://business.facebook.com/)
- WhatsApp Business API access
- Node.js 18+

### Setup

```bash
# Clone the repository
git clone https://github.com/spirit122/whatsapp-mcp-server.git
cd whatsapp-mcp-server
npm install

# Create Cloudflare resources
wrangler d1 create whatsapp-mcp-db
wrangler kv namespace create CACHE
# Update wrangler.toml with the generated IDs

# Set your WhatsApp API secrets
wrangler secret put WHATSAPP_ACCESS_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER_ID
wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID
wrangler secret put WHATSAPP_WEBHOOK_VERIFY_TOKEN
wrangler secret put META_APP_SECRET

# Run database migrations
wrangler d1 execute whatsapp-mcp-db --remote --file=./schemas/d1-schema.sql

# Deploy
wrangler deploy
```

### Webhook Setup (to receive messages)

1. Go to [Meta Developer Portal](https://developers.facebook.com) > Your App > WhatsApp > Configuration
2. Set Webhook URL: `https://YOUR-WORKER.workers.dev/webhook`
3. Set Verify Token: same value as your `WHATSAPP_WEBHOOK_VERIFY_TOKEN` secret
4. Subscribe to: `messages`

### Development

```bash
wrangler dev          # Run locally
npm test              # Run tests (72 tests)
npm run typecheck     # TypeScript check
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check — server status and tool count |
| `GET` | `/tools` | List all 38 tools with descriptions |
| `POST` | `/mcp` | MCP JSON-RPC endpoint (for Claude) |
| `POST` | `/jsonrpc` | MCP JSON-RPC endpoint (alternative) |
| `GET` | `/webhook` | Meta webhook verification |
| `POST` | `/webhook` | Meta webhook incoming events |
| `POST` | `/billing/webhook` | Lemonsqueezy payment webhooks |
| `GET` | `/billing/api-key?email=` | Retrieve your API key |

---

## Architecture

```
Claude / AI Assistant
       |
       v
┌──────────────────────────────┐
│  Cloudflare Worker (Edge)    │
│  - MCP Protocol (JSON-RPC)   │
│  - Auth + API Keys + Tiers   │
│  - Rate Limiting             │
│  - Billing (Lemonsqueezy)    │
└──────────┬───────────────────┘
           |
     ┌─────┴──────┐
     v            v
┌─────────┐  ┌──────────────┐
│ WhatsApp│  │ Durable      │
│ Cloud   │  │ Objects      │
│ API     │  │ (webhooks)   │
└─────────┘  └──────────────┘
                   |
            ┌──────┴──────┐
            v             v
        ┌──────┐     ┌──────┐
        │  D1  │     │  KV  │
        │ logs │     │cache │
        └──────┘     └──────┘
```

---

## FAQ

**Q: Do I need my own WhatsApp Business API account?**
A: For the hosted version, your API key gives you access to the shared test environment. For production with your own phone number, you'll need a Meta Business Account.

**Q: How do I get my API key after purchase?**
A: You receive it via email from Lemonsqueezy. You can also retrieve it anytime at:
`https://whatsapp-mcp-server.eosspirit.workers.dev/billing/api-key?email=YOUR_EMAIL`

**Q: Can I cancel my subscription?**
A: Yes, anytime through Lemonsqueezy. Your API key will be deactivated at the end of the billing period.

**Q: What happens if my API key stops working?**
A: Check that your subscription is active. If your payment failed, update your payment method in Lemonsqueezy.

**Q: Is there a free tier?**
A: Yes! 5 core tools are available for free with no API key needed. Just connect to the MCP endpoint.

**Q: How does anti-spam protection work?**
A: Every message goes through the MessageGuard which checks allowlists, per-recipient rate limits, unique recipient limits, and spam content patterns. Use `manage_allowlist` to control who can receive messages, and `get_messaging_safety_status` to check your current limits.

**Q: Can someone use a bad prompt to send spam?**
A: No. The free tier only allows 5 messages to 3 different numbers per hour. All tiers have spam pattern detection and per-recipient rate limiting. You can enable an allowlist so messages can only go to pre-approved numbers.

**Q: Can I self-host this?**
A: Yes, the code is open source (MIT). See the Self-Hosting section above.

---

## Support

- **Free tier:** [GitHub Issues](https://github.com/spirit122/whatsapp-mcp-server/issues)
- **Pro:** Email support (included with subscription)
- **Enterprise:** Priority support with SLA

---

## License

MIT - Built by [spirit122](https://github.com/spirit122)
