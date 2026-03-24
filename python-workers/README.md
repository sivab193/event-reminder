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

## Quick Start (using Makefile)

```bash
# 1. Edit your .env with actual values
# 2. Place your serviceAccountKey.json in this directory

# Build and start all services
make build

# View real-time logs
make logs

# Stop everything
make down
```

*See `Makefile` for more commands (`make ps`, `make restart`, `make prune`).*

## Environment Variables

Create a `.env` file in this directory:

```env
# Redis (auto-configured in Docker, set for local dev)
REDIS_HOST=localhost

# Firebase (required by scheduler)
# Mount your serviceAccountKey.json as a volume (see docker-compose.yml)
FIREBASE_CREDENTIALS=/app/serviceAccountKey.json

# Email Worker (SMTP / Google Workspace)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sivab@siv19.dev
SMTP_PASSWORD=your_app_password
SMTP_FROM=no-reply@siv19.dev

# Telegram Worker
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

## Workers

| Worker | Queue | Dependency | Description |
|---|---|---|---|
| **Scheduler** | — | Firebase, Redis | Scans Firestore for today's events, pushes to Redis queues |
| **Email** | `email_queue` | SMTP (smtplib) | Sends HTML emails with age/duration, portal link |
| **Telegram** | `telegram_queue` | Bot API | Sends Markdown messages via Telegram bot |
| **Discord** | `discord_queue` | Webhook | Sends rich embeds to Discord channels |

## Firebase Service Account

The scheduler needs a Firebase service account key:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `serviceAccountKey.json` in this directory
4. The `docker-compose.yml` mounts it as a read-only volume

> ⚠️ Never commit `serviceAccountKey.json` to git. It's already in `.gitignore`.
