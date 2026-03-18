# WhatsApp Business MCP Server

El servidor MCP (Model Context Protocol) mas completo para WhatsApp Business Cloud API. **35 herramientas** en **8 modulos** — hospedado en Cloudflare Workers.

**Creado por [spirit122](https://github.com/spirit122)**

---

## Por que este MCP Server?

| Caracteristica | Otros | **Este Server** |
|----------------|:-----:|:---------------:|
| Enviar mensajes (texto, media, plantillas) | Si | Si |
| Mensajes interactivos (botones, listas, productos) | Parcial | **Completo** |
| **Recibir mensajes (webhooks)** | No | **Si** |
| **WhatsApp Flows (formularios/encuestas)** | No | **Si** |
| **Analytics y monitoreo de calidad** | No | **Si** |
| **Multi-numero** | No | **Si** |
| Hospedado (sin instalar nada) | No | **Si** |
| Control de acceso por tiers | No | **Si** |
| Documentacion en espanol | No | **Si** |

---

## Inicio Rapido

### 1. Requisitos

- [Cuenta de Cloudflare](https://dash.cloudflare.com/sign-up)
- [Meta Business Account](https://business.facebook.com/)
- Acceso a WhatsApp Business API (via Meta Developer Portal)
- Node.js 18+

### 2. Clonar e Instalar

```bash
git clone https://github.com/spirit122/whatsapp-mcp-server.git
cd whatsapp-mcp-server
npm install
```

### 3. Configurar Recursos en Cloudflare

```bash
# Crear base de datos D1
wrangler d1 create whatsapp-mcp-db

# Crear namespace KV
wrangler kv namespace create CACHE

# Actualizar wrangler.toml con los IDs generados
```

### 4. Configurar Secrets

```bash
wrangler secret put WHATSAPP_ACCESS_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER_ID
wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID
wrangler secret put WHATSAPP_WEBHOOK_VERIFY_TOKEN
wrangler secret put META_APP_SECRET
```

### 5. Desplegar

```bash
# Ejecutar migraciones de base de datos
wrangler d1 execute whatsapp-mcp-db --file=./schemas/d1-schema.sql

# Desplegar a Cloudflare
wrangler deploy
```

### 6. Conectar a Claude

Agregar a tu configuracion MCP de Claude:

```json
{
  "mcpServers": {
    "whatsapp": {
      "type": "sse",
      "url": "https://whatsapp-mcp-server.TU_SUBDOMINIO.workers.dev/mcp"
    }
  }
}
```

---

## Las 35 Herramientas

### Modulo 1: Mensajes (10 herramientas)
| Herramienta | Descripcion |
|-------------|-------------|
| `send_text_message` | Enviar texto con preview de URL y respuesta |
| `send_image_message` | Enviar imagen por URL o media ID |
| `send_video_message` | Enviar video (MP4, 3GPP) |
| `send_audio_message` | Enviar audio (AAC, MP3, OGG) |
| `send_document_message` | Enviar documento (PDF, etc.) |
| `send_sticker_message` | Enviar sticker (WEBP) |
| `send_location_message` | Enviar ubicacion con coordenadas |
| `send_contact_message` | Enviar tarjetas de contacto |
| `send_reaction` | Reaccionar con emoji |
| `mark_as_read` | Marcar mensaje como leido |

### Modulo 2: Mensajes Interactivos (5 herramientas) `PRO`
| Herramienta | Descripcion |
|-------------|-------------|
| `send_button_message` | Hasta 3 botones de respuesta rapida |
| `send_list_message` | Lista con secciones desplazable |
| `send_cta_url_button` | Boton con enlace URL |
| `send_product_message` | Producto del catalogo |
| `send_product_list_message` | Lista de productos del catalogo |

### Modulo 3: Plantillas (5 herramientas)
| Herramienta | Descripcion |
|-------------|-------------|
| `send_template_message` | Enviar plantilla aprobada con parametros |
| `list_templates` | Listar todas las plantillas |
| `create_template` | Crear nueva plantilla |
| `delete_template` | Eliminar plantilla |
| `get_template_status` | Verificar estado de aprobacion |

### Modulo 4: Media (3 herramientas)
| Herramienta | Descripcion |
|-------------|-------------|
| `upload_media` | Subir archivo a WhatsApp (max 100MB) |
| `get_media_url` | Obtener URL de descarga (expira en 5min) |
| `delete_media` | Eliminar media subido |

### Modulo 5: Webhooks (3 herramientas) `PRO`
| Herramienta | Descripcion |
|-------------|-------------|
| `get_recent_messages` | Obtener mensajes recibidos |
| `get_message_status_updates` | Rastrear enviado/entregado/leido/fallido |
| `search_conversations` | Buscar por texto, telefono, fecha |

### Modulo 6: Perfil (3 herramientas)
| Herramienta | Descripcion |
|-------------|-------------|
| `get_business_profile` | Obtener info del perfil |
| `update_business_profile` | Actualizar campos del perfil |
| `get_phone_numbers` | Listar numeros registrados |

### Modulo 7: WhatsApp Flows (2 herramientas) `PRO`
| Herramienta | Descripcion |
|-------------|-------------|
| `create_flow` | Crear formulario/encuesta interactiva |
| `send_flow_message` | Enviar flow a usuario |

### Modulo 8: Analytics (4 herramientas) `PRO`
| Herramienta | Descripcion |
|-------------|-------------|
| `get_conversation_analytics` | Metricas de conversaciones |
| `get_phone_quality_rating` | Calidad del numero (VERDE/AMARILLO/ROJO) |
| `get_messaging_limits` | Tier y limites actuales |
| `get_delivery_stats` | Estadisticas de entrega |

---

## Precios

| | Gratis | Pro ($29/mes) | Enterprise ($99/mes) |
|---|:---:|:---:|:---:|
| Mensajes core (10 tools) | Si | Si | Si |
| Plantillas (5 tools) | Si | Si | Si |
| Media (3 tools) | Si | Si | Si |
| Perfil (3 tools) | Si | Si | Si |
| Interactivos (5 tools) | - | Si | Si |
| Webhooks (3 tools) | - | Si | Si |
| Flows (2 tools) | - | Si | Si |
| Analytics (4 tools) | - | Si | Si |
| Rate limit | 100/hr | 1,000/hr | 10,000/hr |
| Soporte | Comunidad | Email | Prioritario |

---

## Configurar Webhooks

Para recibir mensajes entrantes, configura la URL de webhook en el Meta Developer Portal:

1. Ir a tu Meta App > WhatsApp > Configuracion
2. URL del Webhook: `https://whatsapp-mcp-server.TU_SUBDOMINIO.workers.dev/webhook`
3. Token de verificacion: (el mismo que `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
4. Suscribirse a: `messages`

---

## Desarrollo

```bash
# Ejecutar localmente
wrangler dev

# Ejecutar tests
npm test

# Verificar tipos
npm run typecheck
```

---

## Licencia

MIT - Creado por [spirit122](https://github.com/spirit122)
