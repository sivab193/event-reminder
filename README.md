# Event Reminder

A multi-channel notification system for tracking personal events with timezone support, calendar sync, and automated reminders.

**Live at:** [er.siv19.dev](https://er.siv19.dev)

---

## 🏗️ Architecture

See **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** for detailed Firestore schemas, JSON payloads, and worker message flows.

| Component | Path | Stack | Deployment |
|---|---|---|---|
| **Frontend** | `ui/` | Next.js 16, Tailwind CSS, shadcn/ui, Firebase | Vercel |
| **Workers** | `python-workers/` | Python, Redis, Docker | Docker VM |
| **MCP Server** | `mcp-server/` | Node.js, Firebase Admin | Local |

## ✨ Features

- **Multi-Channel Reminders** — Email (SMTP / Google Workspace), Telegram, Discord with age/duration info
- **Timezone Intelligence** — Reminders dispatched relative to the event's timezone
- **Calendar Sync** — Dynamic `.ics` feeds for Apple/Google calendar subscriptions
- **Global Reminder Timing** — 6 preset timing options (midnight, 15m before/after, 1h, 6h, 10h)
- **Progressive Form** — Conditional fields based on event type (Birthday, Anniversary, Custom)
- **PWA Ready** — Installable web app with offline support

---

## 🚀 Quick Start

### 1. UI (Next.js)

```bash
cd ui
pnpm install
pnpm dev
```

### 2. Workers (Docker)

```bash
cd python-workers
docker-compose up -d
```

### 3. MCP Server

```bash
cd mcp-server
npm install
npm start
```

---

## 🔐 Environment Variables

### Vercel Dashboard (UI Deployment)

Set these in your [Vercel project settings](https://vercel.com/docs/environment-variables):

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | e.g. `your-project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `SMTP_HOST` | ❌ | SMTP server host (default: `smtp.gmail.com`) |
| `SMTP_PORT` | ❌ | SMTP port (default: `587`) |
| `SMTP_USER` | ✅ | SMTP login username (e.g. `sivab@siv19.dev`) |
| `SMTP_PASSWORD` | ✅ | SMTP login password or App Password |
| `SMTP_FROM` | ❌ | Sender email address (default: `SMTP_USER`, e.g. `no-reply@siv19.dev`) |
| `TELEGRAM_BOT_TOKEN` | ❌ | Telegram Bot API token (for test notifications) |
| `CRON_SECRET` | ❌ | Bearer token for `/api/cron/remind` authorization |

### Local Development (`ui/.env.local`)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sivab@siv19.dev
SMTP_PASSWORD=your_app_password
SMTP_FROM=no-reply@siv19.dev
TELEGRAM_BOT_TOKEN=123456:ABC-DEF
CRON_SECRET=your_secret_here
```

### Workers (`python-workers/.env`)

| Variable | Required | Used By |
|---|---|---|
| `REDIS_HOST` | ✅ | All workers |
| `FIREBASE_CREDENTIALS` | ✅ | Scheduler (path to `serviceAccountKey.json`) |
| `SMTP_HOST` | ❌ | Email worker (default: `smtp.gmail.com`) |
| `SMTP_PORT` | ❌ | Email worker (default: `587`) |
| `SMTP_USER` | ✅ | Email worker |
| `SMTP_PASSWORD` | ✅ | Email worker |
| `SMTP_FROM` | ❌ | Email worker (default: `SMTP_USER`) |
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram worker |

### MCP Server

| Variable | Required | Description |
|---|---|---|
| `FIREBASE_CREDENTIALS` | ✅ | Path to `serviceAccountKey.json` |

---

## 🧪 Testing

```bash
cd ui
pnpm test              # watch mode
pnpm test:coverage     # single run with coverage
```

**45 tests** across library utilities and components.

### CI/CD (GitHub Actions)

On every push/PR to `main`:
- Vitest unit/component tests with coverage
- Production build verification

---

## 🔒 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /birthdays/{birthdayId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

---

## 📤 Deploying to Vercel

1. Connect this repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `ui`
3. Framework preset: **Next.js** (auto-detected)
4. Add all environment variables from the table above
5. Deploy — Vercel handles build, CDN, SSL automatically

### Cron Job Setup

Add a Vercel Cron Job (in `vercel.json` or Vercel dashboard) to hit:
```
GET /api/cron/remind
Authorization: Bearer YOUR_CRON_SECRET
```
Run every 5 minutes for accurate reminder dispatch.

---

## 📦 Project Structure

```
├── ui/                         # Next.js frontend
│   ├── app/                    # Pages and API routes
│   │   ├── api/cron/remind/    # Reminder cron endpoint
│   │   ├── api/calendar/       # .ics calendar feed
│   │   ├── api/verify/         # Channel verification
│   │   └── dashboard/          # Dashboard page
│   ├── components/             # React components
│   ├── lib/                    # Firebase, auth, notifications
│   └── public/                 # Favicon, manifest, icons
├── python-workers/             # Docker-based notification workers
│   ├── scheduler/              # Firestore scanner → Redis
│   ├── email_worker/           # Email sender (SMTP)
│   ├── telegram_worker/        # Telegram bot sender
│   ├── discord_worker/         # Discord webhook sender
│   └── docker-compose.yml
├── mcp-server/                 # MCP server for AI agents
└── .github/workflows/          # CI/CD
```
