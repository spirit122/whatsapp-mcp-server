# Reddit Post for r/ClaudeAI

## Title:
I built the most complete WhatsApp Business MCP Server — 35 tools, send/receive messages directly from Claude

## Body:

Hey everyone! I built an MCP server that connects Claude with WhatsApp Business API. It has 35 tools across 8 modules — more than any other WhatsApp MCP server out there.

**What you can do:**
- Send messages (text, images, videos, documents, stickers, locations, contacts)
- Send interactive messages (reply buttons, list menus, product catalogs)
- Receive incoming messages via webhooks (no other MCP server does this!)
- Create and manage message templates
- Send WhatsApp Flows (interactive forms/surveys inside chat)
- Track analytics, phone quality rating, and delivery stats

**Example usage — just ask Claude:**
- "Send a message to +1234567890 saying the order is ready"
- "Show me messages from today"
- "What's my phone quality rating?"
- "Create a template for order confirmations"

**Tech stack:**
- Cloudflare Workers (hosted, zero installation)
- D1 database + KV cache + Durable Objects
- TypeScript, 72 tests passing
- Multi-tenant (each customer uses their own WhatsApp number)

**Free tier available** with 5 tools. Pro ($29/mo) gets 25 tools. Enterprise ($99/mo) gets all 35.

GitHub: https://github.com/spirit122/whatsapp-mcp-server
Docs: https://spirit122.github.io/whatsapp-mcp-server/
Live server: https://whatsapp-mcp-server.eosspirit.workers.dev

Would love feedback! What tools would you add?

---

# Reddit Post for r/SideProject

## Title:
I built a SaaS product in one day: WhatsApp Business MCP Server with 35 tools and a subscription model

## Body:

Today I built and launched a complete SaaS product from scratch:

**What:** MCP Server that connects AI assistants (Claude) with WhatsApp Business
**35 tools** in 8 modules — messaging, templates, webhooks, analytics, WhatsApp Flows, etc.

**The stack:**
- Cloudflare Workers (hosting)
- Lemonsqueezy (payments - works from Chile!)
- GitHub Pages (docs/landing page)
- TypeScript + Zod + D1 + KV + Durable Objects

**Business model:**
- Free: 5 tools
- Pro: $29/mo — 25 tools
- Enterprise: $99/mo — 35 tools + multi-number

**What I learned:**
- MCP servers are a huge opportunity — the ecosystem is growing fast
- Cloudflare Workers free tier is incredibly generous
- Lemonsqueezy works great as Stripe alternative for LATAM

GitHub: https://github.com/spirit122/whatsapp-mcp-server

AMA!

---

# Twitter/X Post

## Tweet 1 (main):
I built the most complete WhatsApp Business MCP Server 🚀

35 tools. 8 modules. Zero installation.

Just tell Claude: "Send a message to +1234567890 saying the order is ready"

And it does it. For real.

Free tier available 👇
https://spirit122.github.io/whatsapp-mcp-server/

## Tweet 2 (thread):
What makes it different from other WhatsApp MCP servers?

✅ Receive messages (webhooks) — nobody else does this
✅ WhatsApp Flows (forms/surveys in chat)
✅ Analytics & quality monitoring
✅ Multi-tenant (your own number)
✅ Hosted on Cloudflare (zero install)

GitHub: https://github.com/spirit122/whatsapp-mcp-server

---

# LinkedIn Post

Just shipped something I'm really proud of 🚀

I built the most complete MCP Server for WhatsApp Business — connecting AI assistants like Claude directly with WhatsApp.

35 tools across 8 modules:
- Send any type of message
- Receive and search incoming messages
- Manage templates
- Interactive buttons, lists, product catalogs
- WhatsApp Flows (forms/surveys)
- Analytics and quality monitoring

Built with TypeScript on Cloudflare Workers. 72 tests passing. Multi-tenant with subscription billing.

The MCP (Model Context Protocol) ecosystem is growing fast, and WhatsApp Business integration is a massive opportunity — especially in LATAM where WhatsApp IS the business communication platform.

Free tier available. Check it out:
https://github.com/spirit122/whatsapp-mcp-server

#MCP #WhatsApp #AI #SaaS #CloudflareWorkers #TypeScript
