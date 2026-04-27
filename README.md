# Shivver — Personal AI Assistant

> Inspired by JARVIS and OpenClaw. A serverless-ready, multi-modal AI that lives on your computer or in the cloud, with 3D brain visualization, voice, computer control, and seamless mode switching.

![Shivver Banner](/public/og.png?height=400&width=1200&text=Shivver%20AI)

---

## ✨ Features

### 🧠 **Living 3D Brain**
- Real-time **interactive 3D graph** of your cognitive model
- Tracks concepts, tools, actions, people, places, time
- Nodes grow & glow based on importance & recent activation
- Built with Three.js + React Three Fiber

### 💬 **Multimodal Chat**
- Text chat with streaming responses
- **Voice mode**: push-to-talk speech-to-text → LLM → text-to-speech
- Supports multiple LLM providers (OpenAI, Anthropic, Gemini, Groq, Ollama)
- Tool calling: web search, fetch URL, code execution, computer control

### 🖥️ **Computer Control**
- **Browser automation**: click, scroll, type, keypress within the web app
- **Desktop automation** (requires external worker): control any application
- Vision-powered: GPT-4o analyzes screen and suggests actions
- App-specific scripts: Blender (Python), DaVinci Resolve (Fusion scripting)

### 📊 **Behavior Tracking & Analytics**
- Every interaction logged: messages, tool usage, voice, computer actions
- **Stats dashboard**: sessions, token usage, costs, message volume
- **3D brain** visualizes how you work
- Export/import backups (JSON + Google Drive)

### 🌐 **Dual Deployment Modes**
- **Local Mode** — all data on your machine: SQLite/PostgreSQL + filesystem
- **Cloud Mode** — hosted on Vercel with Supabase
- Switch anytime from Settings

### 🔌 **Extensible Skills System**
- Modular architecture for adding new capabilities
- Built-in skills: web-search, code-exec, memory, computer-control, voice

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (local or Supabase) — connection string in `.env.local`
- OpenAI API key (required for intelligence)
- Optional: ElevenLabs (voice), Exa (search), Google (Drive backup)

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd shivver
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

**Minimum required:**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/shivver
OPENAI_API_KEY=sk-...
```

**(Optional) Cloud mode:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Run Database Migrations
```bash
# Using Drizzle (requires DATABASE_URL)
npx drizzle-kit push
```

Or manually run SQL in `supabase-schema.sql` on your Postgres instance.

### 4. Start Dev Server
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Use Shivver
- Type messages in chat
- Click 🎤 to toggle voice mode (requires ElevenLabs key)
- Visit `/brain` to see your 3D cognitive model
- Visit `/settings` to configure mode, env vars, Google Drive
- Visit `/stats` for usage analytics

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel / Local                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐              ┌───────────────────────────┐ │
│  │   Next.js App   │  API Routes  │   PostgreSQL / Supabase   │ │
│  │   (React)       │◄────────────►│   (sessions, messages,    │ │
│  │                 │              │    agents, brain, etc.)   │ │
│  └────────┬────────┘              └───────────────────────────┘ │
│           │                                                       │
│  ┌────────▼────────┐                                            │
│  │  Client UI      │ — Chat, Brain 3D, Stats, Settings          │
│  │  (Tailwind,     │ — Sound-reactive AI sphere avatar           │
│  │   Framer Motion)│ — Voice controls, Audio player               │
│  └─────────────────┘                                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Optional: Desktop Agent (external worker)               │ │
│  │  — Full OS control (mouse, keyboard, screenshots)        │ │
│  │  — Blender & DaVinci automation                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/agent-engine.ts` | LLM orchestration, tool execution, crew coordination |
| `src/lib/computer-tool.ts` | Hybrid browser/desktop actions abstraction |
| `src/lib/vision.ts` | GPT-4o-powered screen analysis & task planning |
| `src/lib/user-brain.ts` | 3D cognitive graph builder + behavior profiling |
| `src/lib/platform.ts` | Local vs Cloud mode abstraction (filesystem vs Supabase) |
| `src/lib/tracker.ts` | Auto-logging of all user interactions for brain |

### Database Schema

```
users → sessions → messages
      └─→ agent_executions → tool_executions
agents (templates)
tools (definitions)
knowledge (vector memory)
budget (cost tracking)
projects & tasks (CrewAI style)
user_brains (aggregated profile)
brain_nodes + brain_connections (3D graph)
brain_clusters (visual grouping)
user_actions (immutable event stream)
```

*(See `supabase-schema.sql` for full DDL)*

---

## 🔧 Configuration

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|:--------:|
| `DATABASE_URL` | PostgreSQL connection (local Supabase) | ✅ |
| `OPENAI_API_KEY` | LLM intelligence | ✅ |
| `OPENAI_MODEL` | Model name (default: gpt-4o-mini) | ❌ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (cloud mode) | ❌ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ❌ |
| `ELEVENLABS_API_KEY` | Text-to-speech | ❌ |
| `ELEVENLABS_VOICE_ID` | Voice ID (default: Rachel) | ❌ |
| `EXA_API_KEY` | Web search (neural) | ❌ |
| `GOOGLE_CLIENT_ID` | OAuth2 for Drive sync | ❌ |
| `GOOGLE_CLIENT_SECRET` | OAuth2 secret | ❌ |
| `SHIVVER_MODE` | `local` or `cloud` (default: local) | ❌ |

### Local Mode
- Stores SQLite at `~/.shivver/shivver.db`
- Files at `~/.shivver/storage/`
- Config at `~/.shivver/config.json`

### Cloud Mode
- All data in Supabase Postgres
- Files in Supabase Storage bucket `shivver-assets`
- Config stored in DB (settings table)

---

## 🎯 Using Shivver

### Chat
Just type! Messages stream in real-time. Use `/` for commands (coming soon).

### Voice
- Click the 🎤 button (or press Space) to toggle voice mode
- While listening, speak — audio sent to Whisper → text → LLM → speech
- Response plays automatically

### Computer Control (Experimental)
Shivver can control your computer when you describe a task:

> "Create a red cube in Blender"
> "Edit the timeline in DaVinci Resolve — cut at 00:15"
> "Scroll down and click the Submit button"

**How it works**:
1. LLM decides to use `blender_automate` / `computer_click` etc.
2. `vision.ts` takes screenshot, analyzes UI
3. Actions executed via browser automation (in-web) or desktop worker
4. You watch it happen

**Desktop agent setup** (for full OS control):
```bash
cd desktop-agent
npm install
# Configure which apps you want to automate
npm start  # listens on http://localhost:8090
```
Then set `DESKTOP_AGENT_URL=http://localhost:8090` in `.env.local`.

### Brain Visualization
Visit `/brain` to see an interactive 3D force-directed graph of your mental model:
- **Drag** to rotate
- **Scroll** to zoom
- **Click** a node to see details
- **Watch** as new connections form as you use Shivver

### Settings
`/settings` lets you:
- Switch deployment mode (Local ↔ Cloud)
- Edit environment variables (Local mode only)
- Connect Google Drive for backups
- Export/import full data JSON
- View app version & info

### Stats
`/stats` shows:
- Total messages, sessions, tool runs, tokens, cost
- Messages per day chart
- Top tools usage bar chart
- Recent sessions table with duration

---

## 🛠️ Development

### Scripts
```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Production build
npm start          # Start production server
npm run lint       # ESLint
npx drizzle-kit push   # Apply DB migrations
```

### Database Migrations
Migrations live in `migrations/`. Apply with:
```bash
npx drizzle-kit push
```

Or use Supabase SQL Editor to run `supabase-schema.sql`.

### Adding a New Tool
1. Define in `src/lib/agent-engine.ts` `executeTool` switch
2. Add to `tools` table via seed or manually
3. (Optional) Add to `COMPUTER_TOOLS` if it's a computer action

### Extending the Brain
Brain tracking is automatic via `trackUserAction()` calls in API routes and hooks. To track something new:
```ts
import { trackUserAction } from '@/lib/brain-tracker';
trackUserAction({
  type: 'custom_event',
  // custom fields...
  timestamp: new Date(),
});
```

---

## 📦 Deployment

### Vercel (Cloud Mode)
1. Push code to GitHub
2. Import project in Vercel
3. Set env vars: `DATABASE_URL`, `OPENAI_API_KEY`, (optional Supabase, etc.)
4. Deploy
5. (Optional) Set up Vercel Cron for agent polling if you want proactive agents

### Self-Hosted (Local Mode)
```bash
# On your server/machine
git clone <repo>
cd shivver
npm ci --production
npm run build
NODE_OPTIONS="--max-old-space-size=4096" npm start
# Or use PM2: pm2 start npm --name "shivver" -- start
```

Expose via reverse proxy (nginx) or Cloudflare Tunnel.

---

## 🔐 Security Notes

- **No authentication** by default (personal use)
- In cloud mode, enable Row Level Security (RLS) on Postgres tables
- Environment variables stored in `.env.local` — never commit
- API routes are public; protect with a firewall if exposed publicly
- Desktop agent listens only on localhost (`127.0.0.1:8090`) — never expose to internet

---

## 🤝 Contributing

Pull requests welcome! Please:
1. Follow existing code style (Prettier + ESLint)
2. Add tests for new features
3. Update README for user-facing changes
4. Keep build green (`npm run build`)

---

## 📜 License

MIT — see LICENSE file.

---

## 🙏 Acknowledgments

Shivver stands on the shoulders of giants:
- **OpenClaw** — architecture, agent model, skills system
- **LangGraph** — durable execution patterns
- **CrewAI** — multi-agent delegation
- **Open Interpreter** — computer control vision
- **Paperclip** — BYO-agent orchestration
- **React Three Fiber** — 3D in the browser
- **Next.js** — full-stack React framework
- **Drizzle ORM** — type-safe SQL
- **Supabase** — Postgres + Storage
- **OpenAI** — intelligence behind the curtain

---

**"A personal AI that knows you better than you know yourself."**

Made with 🤍 by the OpenClaw community.
