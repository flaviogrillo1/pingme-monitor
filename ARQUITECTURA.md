# PingMe - Arquitectura del Sistema

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│  Landing (/)          │  Dashboard (/app)                   │
│  - Hero               │  - Lista de monitores               │
│  - Features           │  - Crear monitor                    │
│  - Pricing            │  - Ver detalle                      │
│  - FAQ                │  - Test manual                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Middleware                       │
│  - Protege rutas /app/*                                     │
│  - Verifica sesión de Supabase                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
├─────────────────────────────────────────────────────────────┤
│  /api/monitors              │  /api/stripe                  │
│  - GET (list)               │  - checkout                   │
│  - POST (create)            │  - portal                     │
│  - GET/PATCH/DELETE (by id) │  - webhook                   │
│  - test-now (manual check)  │                               │
├─────────────────────────────┼───────────────────────────────┤
│  /api/cron/run              │                               │
│  - Scheduled checks         │                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────┬──────────────────────┬──────────────────┐
│   Supabase       │      Stripe          │     Resend       │
├──────────────────┼──────────────────────┼──────────────────┤
│  Auth (magic     │  - Billing           │  - Email alerts  │
│   link)          │  - Checkout          │  - HTML templates│
│  Postgres + RLS  │  - Portal            │                  │
│  - monitors      │  - Webhooks          │                  │
│  - conditions    │                      │                  │
│  - snapshots     │                      │                  │
│  - checks        │                      │                  │
│  - events        │                      │                  │
│  - subscriptions│                      │                  │
└──────────────────┴──────────────────────┴──────────────────┘
```

## 🔐 Seguridad

### Capas de Protección

1. **Middleware (Next.js)**
   - Intercepta requests a `/app/*`
   - Verifica cookie de sesión
   - Redirect a `/` si no autenticado

2. **API Route Handlers**
   - Verifican `user.id` en cada request
   - Return 401 si no hay sesión válida

3. **Row Level Security (RLS)**
   - Políticas a nivel de BD
   - `user_id = auth.uid()` en todos los SELECTs
   - Service role bypass para cron

4. **Rate Limiting**
   - `/api/monitors/[id]/test-now`: 5 req/hora
   - Store en memoria con cleanup automático
   - Headers: `X-RateLimit-*`

5. **Plan Enforcement**
   - Backend valida contra `subscription_state`
   - No confía en el frontend

### endpoints Protegidos

| Endpoint | Protección | Detalles |
|----------|-----------|----------|
| `/app/*` | Middleware | Requiere sesión válida |
| `/api/monitors` | Auth + RLS | Verifica user.id |
| `/api/monitors/[id]` | Auth + RLS | Owner check |
| `/api/monitors/[id]/test-now` | Auth + Rate Limit | 5/hora |
| `/api/stripe/*` | Auth | Solo usuarios logueados |
| `/api/stripe/webhook` | Signature | Stripe verify |
| `/api/cron/run` | Secret Header | CRON_SECRET |

## 🔄 Checking Engine (Core)

```
┌──────────────────────┐
│  Trigger: Cron Job   │
│  (Vercel: */10 min)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Get Due Monitors    │
│  next_check_at <= now│
│  Limit: 50           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  For Each Monitor:   │
│  1. Fetch URL        │
│  2. Parse HTML       │
│  3. Extract Data     │
│  4. Eval Conditions  │
│  5. Save Snapshot    │
│  6. Send Email (if)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Update next_check_at│
│  + last_check_at     │
└──────────────────────┘
```

### Tipos de Condiciones

**1. STATUS_CHANGE**
- Detecta transiciones: PENDING → APPROVED
- Selector opcional (CSS)
- Modos: `match_any` o `detect_transition`

**2. TEXT_MATCH**
- Alerta cuando texto aparece/desaparece
- Modos: `exact`, `contains`, `regex`
- Trigger: `appears`, `disappears`, `both`

**3. SELECTOR_CHANGE** (Pro)
- Monitorea elemento específico via CSS selector
- Trigger: `any_change` o `transition`

### Evaluación de Condiciones

```
Previous Snapshot          Current Content
     │                           │
     ├─ extracted_status        ├─ selectorText
     ├─ extracted_selector      ├─ plainText
     └─ plain_text_preview      └─ content hash
               │                   │
               └─────────┬─────────┘
                         │
                 ┌───────▼────────┐
                 │   Compare      │
                 │   Evaluate     │
                 │   Is Triggered?│
                 └───────┬────────┘
                         │
               ┌─────────▼─────────┐
               │  Check Cooldown   │
               │  (6h default)     │
               └─────────┬─────────┘
                         │
               ┌─────────▼─────────┐
               │  If No Recent     │
               │  Event: Trigger!  │
               │  - Create Event   │
               │  - Send Email     │
               └───────────────────┘
```

## 💳 Stripe Billing Flow

```
User Clicks "Upgrade"
         │
         ▼
POST /api/stripe/checkout
         │
         ▼
Create Stripe Checkout Session
         │
         ▼
Redirect to Stripe Checkout Page
         │
         ▼
User Completes Payment
         │
         ▼
Stripe Webhook → /api/stripe/webhook
         │
         ├─ checkout.session.completed
         │  └─ Update subscription_state
         │     plan: PRO
         │     status: active
         │
         ├─ customer.subscription.updated
         │  └─ Sync status changes
         │
         └─ customer.subscription.deleted
            └─ Downgrade to FREE
```

## 📧 Email Flow

```
Condition Triggered
         │
         ▼
Check Cooldown
(Has recent event?)
         │
    No   │   Yes
    ├────┴────┐
    │         │
    ▼         ▼
Send Email  Skip
    │
    ▼
Resend API
    │
    ▼
User Receives:
- Subject: [PingMe] Change detected
- Monitor name
- URL
- Condition triggered
- Before/After diff
- Link to monitor detail
```

## 🗄️ Database Schema

### Tablas Principales

```sql
monitors
├─ id (UUID, PK)
├─ user_id (FK → auth.users)
├─ name, url
├─ is_active
├─ plan_snapshot (FREE/PRO)
├─ check_interval_minutes
├─ next_check_at
├─ last_check_at
├─ last_status (OK/TRIGGERED/ERROR)
└─ cooldown_minutes

monitor_conditions
├─ id (UUID, PK)
├─ monitor_id (FK → monitors)
├─ type (STATUS_CHANGE/TEXT_MATCH/SELECTOR_CHANGE)
└─ config (JSONB)

monitor_snapshots
├─ id (UUID, PK)
├─ monitor_id (FK → monitors)
├─ observed_at
├─ content_hash
├─ extracted_status
├─ extracted_selector_text
└─ extracted_plain_text_preview

monitor_checks
├─ id (UUID, PK)
├─ monitor_id (FK → monitors)
├─ checked_at
├─ result (OK/TRIGGERED/ERROR)
└─ details (JSONB)

monitor_events
├─ id (UUID, PK)
├─ monitor_id (FK → monitors)
├─ event_at
├─ type (TRIGGERED/PAUSED/RESUMED/DELETED/ERROR)
├─ reason
└─ payload (JSONB)

subscription_state
├─ user_id (UUID, PK, FK → auth.users)
├─ plan (FREE/PRO)
├─ status (active/canceled/past_due)
├─ stripe_customer_id
├─ stripe_subscription_id
└─ current_period_end
```

### Row Level Security

Todas las tablas tienen políticas RLS:
- `monitors`: `user_id = auth.uid()`
- `conditions/events/checks/snapshots`: Join con `monitors.user_id`
- `subscription_state`: `user_id = auth.uid()`

Excepción: Service role puede bypass para cron.

## 🚀 Deployment Flow

```
1. Setup
   ├─ Supabase project
   ├─ Stripe products + webhook
   ├─ Resend domain verification
   └─ Vercel project

2. Database
   ├─ Run migrations 001 & 002
   ├─ Configure auth redirect URLs
   └─ Verify RLS policies

3. Environment Variables
   ├─ NEXT_PUBLIC_SUPABASE_*
   ├─ SUPABASE_SERVICE_ROLE_KEY
   ├─ STRIPE_*
   └─ RESEND_API_KEY

4. Deploy
   ├─ git push
   ├─ Vercel auto-deploy
   └─ Configure Vercel Cron

5. Post-Deploy
   ├─ Update Stripe webhook URL
   ├─ Test full user journey
   └─ Monitor logs
```

## 📊 Plan Limits (Enforced in Backend)

| Feature | FREE | PRO |
|---------|------|-----|
| Monitors | 2 | 20 |
| Min Interval | 360 min (6h) | 30 min |
| Conditions/Monitor | 1 | 2 |
| Regex | ❌ | ✅ |
| Selector Monitoring | ❌ | ✅ |
| Custom Cooldown | ❌ | ✅ |
| History | 7 days | 30 days |

## 🔑 Key Files

```
src/
├── middleware.ts                 # Route protection
├── app/
│   ├── api/
│   │   ├── cron/run/route.ts   # Checking engine
│   │   ├── monitors/           # Monitor CRUD
│   │   └── stripe/             # Billing
│   └── app/                    # Dashboard pages
├── lib/
│   ├── db/
│   │   ├── supabase.ts         # DB client + types
│   │   ├── stripe.ts           # Stripe client
│   │   └── resend.ts           # Email templates
│   ├── utils/
│   │   └── checking-engine.ts  # Core logic
│   ├── validators/
│   │   └── monitors.ts         # Zod + limits
│   ├── rate-limit.ts           # Rate limiting
│   ├── supabase-server.ts      # Auth helpers
│   └── api-middleware.ts       # API wrappers
supabase/
└── migrations/                 # SQL schema
```

## 🧪 Testing

```bash
# Unit tests
pnpm test:run

# Coverage
- Plan limits enforcement
- Checking engine logic
- Condition evaluators
- Hash generation
```

---

**Built with ❤️ by Spencer**
