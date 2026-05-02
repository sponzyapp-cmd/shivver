# Shivver AGI Instructions

## Setup

1. Add `.env.local`:
```bash
GROQ_API_KEY=your_groq_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token  # optional, for 2-way chat
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=your_db_url
```

## Local Development

```bash
npm run dev         # Start dev server
npm run agi:start   # Start hourly AGI scheduler
npm run agi:once    # Run AGI scan once
```

## Deployment

- **Vercel**: Hourly cron via GitHub Actions (`.github/workflows/agi-hourly.yml`)
- **Local**: Use `node-cron` with `npm run agi:start`

## Telegram Integration

1. Create bot with @BotFather
2. Add `TELEGRAM_BOT_TOKEN` to `.env.local`
3. Set webhook:
```bash
curl "https://your-app.vercel.app/api/telegram/webhook?action=set-webhook&url=https://your-app.vercel.app/api/telegram/webhook"
```

Users can now chat with Shivver AGI via Telegram!