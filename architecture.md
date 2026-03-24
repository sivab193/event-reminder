# Event Reminder — Architecture

A multi-channel notification system for tracking events with timezone support, calendar sync, and automated reminders.

## 🏗️ System Overview

Modern serverless frontend + dockerized backend workers for reliable background tasks.

### 1. Frontend: Next.js + Tailwind CSS
- **Framework**: Next.js 16 (App Router)
- **Auth**: Firebase Auth (Email/Password + Google OAuth)
- **Database**: Cloud Firestore (NoSQL, real-time)
- **Styling**: Tailwind CSS, shadcn/ui, mobile-first, PWA ready
- **State**: React Context API (`AuthContext`, `ThemeContext`)

### 2. Backend: Python + Redis + Docker
- **Redis**: Message broker decoupling scheduler from workers
- **Scheduler**: Scans Firestore for upcoming events, dispatches jobs to Redis
- **Workers**: Independent containers (Email, Telegram, Discord) listening to Redis queues

### 3. Notification Channels
- **Email**: Resend API
- **Telegram**: Bot API direct messaging
- **Discord**: Webhook-based channel alerts
- **Calendar Sync**: Dynamic `.ics` feeds for mobile push notifications
- **WhatsApp**: Coming soon

## 📊 Data Flow

1. **User Action** → Adds event via Next.js UI
2. **Storage** → Firestore document created, stats counter incremented
3. **Calendar** → `/api/calendar/[userId]` endpoint updated automatically
4. **Reminder** → Scheduler finds event → pushes to Redis → Worker sends notification

## 📤 Import Sources (Coming Soon)

- **Facebook** → Export birthdays as `.ics` via Events → Birthdays
- **Contacts** → Export `.vcf` from iPhone/Android/Google Contacts
- **Calendars** → Export `.ics` or `.zip` from Google/Outlook/Apple Calendar

## 🚀 Deployment

### Frontend (UI)
- **Provider**: Vercel (native Next.js, edge functions, auto SSL/CDN)

### Backend (Workers)
- **Provider**: Railway, Render, or VPS via `docker-compose.yml`
- **Config**: `FIREBASE_CREDENTIALS` as mounted volume/secret, env vars for API keys
