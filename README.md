# PingMe - Status + Text Change Monitor

Stop refreshing pages. We'll ping you when it changes.

A SaaS that monitors URLs and alerts you when:
- Status changes (e.g., PENDING → APPROVED)
- Text appears/disappears
- Selector text changes (Pro)

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend**: Next.js API Routes + Supabase (PostgreSQL)
- **Auth**: Supabase Auth (magic link by email)
- **Billing**: Stripe (monthly + yearly subscriptions)
- **Email**: Resend
- **Scheduler**: Vercel Cron
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

## Features

### Free Plan
- 2 monitors
- Minimum interval: 6 hours
- Email notifications
- 1 condition per monitor

### Pro Plan
- 20 monitors
- Minimum interval: 30 minutes
- Email + history
- 2 conditions per monitor
- Regex matching
- Custom cooldown
- Selector monitoring

## Local Development

### Prerequisites

- Node.js 18+
- pnpm: `npm install -g pnpm`
- Supabase account
- Stripe account
- Resend account

### 1. Clone and Install

```bash
git clone https://github.com/flaviogrillo1/pingme-monitor.git
cd pingme-monitor
pnpm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → run all migrations from `/supabase/migrations/` in order
3. Enable Email Auth in Authentication → Providers → Email
4. Add redirect URL: `http://localhost:3000/auth/callback`
5. Get your credentials:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key (secret!) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Stripe Setup

1. Create products in Stripe Dashboard:
   - **Pro Monthly**: `price_xxx` (recurring monthly)
   - **Pro Yearly**: `price_yyy` (recurring yearly, 20% discount)
2. Create webhook endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Get your keys:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
   - Webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### 4. Resend Setup

1. Create account at [resend.com](https://resend.com)
2. Verify your sender domain
3. Get API key → `RESEND_API_KEY`

### 5. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values.

### 6. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests once
pnpm test:run
```

## Building for Production

```bash
pnpm build
pnpm start
```

## Deployment to Vercel

### 1. Deploy to Vercel

```bash
vercel link
vercel --prod
```

### 2. Configure Vercel Cron

In `vercel.json` (or Vercel Dashboard):

```json
{
  "crons": [{
    "path": "/api/cron/run",
    "schedule": "*/10 * * * *"
  }]
}
```

Add `CRON_SECRET` to Vercel environment variables.

### 3. Update Environment Variables in Vercel

- Change `NEXT_PUBLIC_APP_URL` to your production domain
- Add all other variables from `.env.example`

### 4. Update Supabase Redirect URLs

Add your production URL to Supabase Auth → Redirect URLs

### 5. Update Stripe Webhook URL

Change webhook endpoint to your production domain in Stripe Dashboard.

## Database Schema

### Tables

- **monitors** - URL monitors with configuration
- **monitor_conditions** - Alert conditions per monitor
- **monitor_snapshots** - Content snapshots for comparison
- **monitor_checks** - Check execution history
- **monitor_events** - Triggered events
- **subscription_state** - User subscription status

### Row Level Security (RLS)

All tables have RLS policies:
- Users can only access their own data
- Service role can bypass RLS for cron jobs

## API Routes

- `POST /api/monitors` - Create monitor
- `GET /api/monitors` - List monitors
- `GET /api/monitors/[id]` - Get monitor details
- `PATCH /api/monitors/[id]` - Update monitor
- `DELETE /api/monitors/[id]` - Delete monitor
- `POST /api/monitors/[id]/test-now` - Manual check
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Customer portal
- `POST /api/stripe/webhook` - Stripe webhooks
- `POST /api/cron/run` - Cron job (protected)

## Security

- Plan limits enforced in backend (not just frontend)
- Cron endpoint protected with `CRON_SECRET`
- RLS policies on all database tables
- No raw HTML stored, only hashes and excerpts
- Rate limiting on manual checks
- Cooldown on notifications to prevent spam

## License

MIT

## Support

For issues or questions, open a GitHub issue.
