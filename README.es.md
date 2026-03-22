# WhatsApp Business MCP Server

> El servidor MCP mas completo para WhatsApp Business Cloud API.
> **43 herramientas** | **8 modulos** | **Hospedado en Cloudflare Workers** | **Sin instalar nada**

Creado por [spirit122](https://github.com/spirit122)

---

## Que es esto?

Este servidor MCP te permite controlar WhatsApp Business directamente desde **Claude AI**. Envia mensajes, recibe respuestas, gestiona plantillas, revisa analiticas — todo con lenguaje natural.

**Ejemplo:** Solo dile a Claude *"Envia un mensaje al +56 9 1234 5678 diciendo que el pedido esta listo"* y lo hace.

---

## Empieza en 3 Pasos

### Paso 1: Elige tu Plan

| | Gratis | Pro | Enterprise |
|---|:---:|:---:|:---:|
| **Precio** | $0 | $27,000 CLP/mes | $92,000 CLP/mes |
| Mensajes core (texto, imagen, video, audio, docs) | 10 tools | 10 tools | 10 tools |
| Plantillas (enviar, crear, listar, eliminar) | 5 tools | 5 tools | 5 tools |
| Media (subir, descargar, eliminar) | 3 tools | 3 tools | 3 tools |
| Perfil de negocio | 3 tools | 3 tools | 3 tools |
| **Mensajes interactivos** (botones, listas, productos) | - | **5 tools** | **5 tools** |
| **Webhooks** (recibir mensajes, buscar conversaciones) | - | **3 tools** | **3 tools** |
| **WhatsApp Flows** (formularios, encuestas en chat) | - | **2 tools** | **2 tools** |
| **Analiticas** (metricas, calidad, stats de entrega) | - | **4 tools** | **4 tools** |
| Limite de requests | 100/hr | 1,000/hr | 10,000/hr |
| Soporte | Comunidad | Email | Prioritario + SLA |
| **Total herramientas** | **21** | **35** | **35** |

**Comprar Pro:** [Haz clic aqui para suscribirte](https://spirit122.lemonsqueezy.com/checkout/buy/af231967-2bc4-4342-8d2e-e88cdd70ae42)

**Comprar Enterprise:** [Haz clic aqui para suscribirte](https://spirit122.lemonsqueezy.com/checkout/buy/5ec0efcf-f1b2-46bd-a1dc-6bd5a9a504b1)

### Paso 2: Obtener tu API Key

Despues de comprar, recibiras una **license key** por email de Lemonsqueezy. Esa es tu API key.

Tambien puedes recuperarla en cualquier momento:
```
GET https://whatsapp-mcp-server.eosspirit.workers.dev/billing/api-key?email=TU_EMAIL
```

### Paso 3: Conectar a Claude Desktop

1. Abre **Claude Desktop**
2. Haz clic en el **icono de engranaje** (Settings) > **Developer** > **Edit Config**
3. Se abre el archivo `claude_desktop_config.json`. Pega la configuracion de abajo.
4. **Reinicia Claude Desktop**

> **Ubicacion del archivo de config:**
> - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
> - **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Tier gratuito** (sin API key):
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

**Pro / Enterprise** (con API key):
```json
{
  "mcpServers": {
    "whatsapp": {
      "type": "url",
      "url": "https://whatsapp-mcp-server.eosspirit.workers.dev/mcp",
      "headers": {
        "X-API-Key": "TU_API_KEY_AQUI"
      }
    }
  }
}
```

Listo! Ahora solo pidele a Claude que envie mensajes, revise analiticas, o lo que necesites.

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
| `send_reaction` | Reaccionar a un mensaje con emoji |
| `mark_as_read` | Marcar mensaje como leido (palomitas azules) |

### Modulo 2: Mensajes Interactivos (5 herramientas) `PRO`
| Herramienta | Descripcion |
|-------------|-------------|
| `send_button_message` | Hasta 3 botones de respuesta rapida |
| `send_list_message` | Lista con secciones desplazable |
| `send_cta_url_button` | Boton con enlace URL |
| `send_product_message` | Producto de tu catalogo |
| `send_product_list_message` | Vista multi-producto del catalogo |

### Modulo 3: Plantillas (5 herramientas)
| Herramienta | Descripcion |
|-------------|-------------|
| `send_template_message` | Enviar plantilla aprobada con parametros dinamicos |
| `list_templates` | Listar todas tus plantillas |
| `create_template` | Crear nueva plantilla (requiere aprobacion de Meta) |
| `delete_template` | Eliminar plantilla por nombre |
| `get_template_status` | Ver si esta aprobada, pendiente o rechazada |

### Modulo 4: Media (3 herramientas)
| Herramienta | Descripcion |
|-------------|-------------|
| `upload_media` | Subir archivo a WhatsApp (max 100MB) |
| `get_media_url` | Obtener URL de descarga (expira en 5 min) |
| `delete_media` | Eliminar media subido |

### Modulo 5: Webhooks (3 herramientas) `PRO`
| Herramienta | Descripcion |
|-------------|-------------|
| `get_recent_messages` | Obtener mensajes recibidos de clientes |
| `get_message_status_updates` | Rastrear enviado / entregado / leido / fallido |
| `search_conversations` | Buscar mensajes por texto, telefono o fecha |

### Modulo 6: Perfil de Negocio (3 herramientas)
| Herramienta | Descripcion |
|-------------|-------------|
| `get_business_profile` | Obtener info del perfil (about, direccion, email) |
| `update_business_profile` | Actualizar cualquier campo del perfil |
| `get_phone_numbers` | Listar numeros registrados con rating de calidad |

### Modulo 7: WhatsApp Flows (2 herramientas) `PRO`
| Herramienta | Descripcion |
|-------------|-------------|
| `create_flow` | Crear formularios/encuestas interactivas en WhatsApp |
| `send_flow_message` | Enviar un Flow a un cliente |

### Modulo 8: Analiticas (4 herramientas) `PRO`
| Herramienta | Descripcion |
|-------------|-------------|
| `get_conversation_analytics` | Metricas de conversaciones por periodo |
| `get_phone_quality_rating` | Calidad del numero: VERDE / AMARILLO / ROJO |
| `get_messaging_limits` | Tier actual y limites de contactos diarios |
| `get_delivery_stats` | Estadisticas de entrega por rango de fechas |

---

## Por que este Server y no otros?

| Caracteristica | Otros MCP Servers | **Este Server** |
|----------------|:-----------------:|:---------------:|
| Enviar mensajes (texto, media, plantillas) | Si | Si |
| Mensajes interactivos (botones, listas, productos) | Parcial | **Completo** |
| **Recibir mensajes (webhooks)** | No | **Si** |
| **WhatsApp Flows (formularios/encuestas)** | No | **Si** |
| **Analiticas y monitoreo de calidad** | No | **Si** |
| **Multi-numero** | No | **Si** |
| Hospedado (sin instalar nada) | No | **Si** |
| Control de acceso por tiers | No | **Si** |
| Soporte pagado | No | **Si** |

---

## Self-Hosting (Avanzado)

Si quieres hospedar tu propia instancia en vez de usar la version hospedada:

### Requisitos
- [Cuenta de Cloudflare](https://dash.cloudflare.com/sign-up)
- [Meta Business Account](https://business.facebook.com/)
- Acceso a WhatsApp Business API
- Node.js 18+

### Configuracion

```bash
# Clonar el repositorio
git clone https://github.com/spirit122/whatsapp-mcp-server.git
cd whatsapp-mcp-server
npm install

# Crear recursos en Cloudflare
wrangler d1 create whatsapp-mcp-db
wrangler kv namespace create CACHE
# Actualizar wrangler.toml con los IDs generados

# Configurar secrets de WhatsApp
wrangler secret put WHATSAPP_ACCESS_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER_ID
wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID
wrangler secret put WHATSAPP_WEBHOOK_VERIFY_TOKEN
wrangler secret put META_APP_SECRET

# Ejecutar migraciones de base de datos
wrangler d1 execute whatsapp-mcp-db --remote --file=./schemas/d1-schema.sql

# Desplegar
wrangler deploy
```

### Desarrollo

```bash
wrangler dev          # Ejecutar localmente
npm test              # Ejecutar tests (72 tests)
npm run typecheck     # Verificar TypeScript
```

---

## Preguntas Frecuentes

**P: Necesito mi propia cuenta de WhatsApp Business API?**
R: Para la version hospedada, tu API key te da acceso al entorno de pruebas compartido. Para produccion con tu propio numero, necesitas una Meta Business Account.

**P: Como obtengo mi API key despues de comprar?**
R: La recibes por email de Lemonsqueezy. Tambien puedes recuperarla en:
`https://whatsapp-mcp-server.eosspirit.workers.dev/billing/api-key?email=TU_EMAIL`

**P: Puedo cancelar mi suscripcion?**
R: Si, en cualquier momento a traves de Lemonsqueezy. Tu API key se desactivara al final del periodo de facturacion.

**P: Hay un tier gratuito?**
R: Si! 5 herramientas basicas estan disponibles gratis sin necesidad de API key.

**P: Puedo self-hostear esto?**
R: Si, el codigo es open source (MIT). Ve la seccion de Self-Hosting arriba.

---

## Soporte

- **Tier gratuito:** [GitHub Issues](https://github.com/spirit122/whatsapp-mcp-server/issues)
- **Pro:** Soporte por email (incluido con la suscripcion)
- **Enterprise:** Soporte prioritario con SLA

---

## Licencia

MIT - Creado por [spirit122](https://github.com/spirit122)
