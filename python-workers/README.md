# Python Workers

Dockerized background workers for the Event Reminder notification system. Uses Redis as a message broker with a scheduler that scans Firestore for events and dispatches jobs to channel-specific workers.

## Architecture

```
┌────────────┐     ┌───────┐     ┌────────────────┐
│  Scheduler │────▶│ Redis │────▶│ Email Worker   │
│ (Firestore)│     │       │────▶│ Telegram Worker│
└────────────┘     │       │────▶│ Discord Worker │
                   └───────┘     └────────────────┘
```

## Quick Start

```bash
# Copy the env template
cp .env.example .env
# Edit .env with your actual values

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Environment Variables

Create a `.env` file in this directory:

```env
# Redis (auto-configured in Docker, set for local dev)
REDIS_HOST=localhost

# Firebase (required by scheduler)
# Mount your serviceAccountKey.json as a volume (see docker-compose.yml)
FIREBASE_CREDENTIALS=/app/serviceAccountKey.json

# Email Worker (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=reminders@yourdomain.com

# Telegram Worker
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

## Workers

| Worker | Queue | Dependency | Description |
|---|---|---|---|
| **Scheduler** | — | Firebase, Redis | Scans Firestore for today's events, pushes to Redis queues |
| **Email** | `email_queue` | Resend API | Sends HTML emails with age/duration, portal link |
| **Telegram** | `telegram_queue` | Bot API | Sends Markdown messages via Telegram bot |
| **Discord** | `discord_queue` | Webhook | Sends rich embeds to Discord channels |

## Firebase Service Account

The scheduler needs a Firebase service account key:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `serviceAccountKey.json` in this directory
4. The `docker-compose.yml` mounts it as a read-only volume

> ⚠️ Never commit `serviceAccountKey.json` to git. It's already in `.gitignore`.
