# ⚡ n8n Dashboard — React + TypeScript

> AI Automation Specialist | React frontend for n8n workflow management

Built by [evg3n](https://github.com/evg3n-user) — Senior Software Engineer & AI Automation Specialist.

---

## 🎯 What it does

A professional dark-themed dashboard that connects to **n8n workflow automation** platform via REST API:

- 📋 **View all workflows** — name, active/inactive status, tags, last updated
- ⚡ **Activate/Deactivate** — toggle workflows on/off with one click
- 📜 **Execution history** — see all runs with status, duration, mode
- 🔄 **Auto-refresh** — fetch latest data from n8n API

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| API | n8n REST API v1 |
| Connection | X-N8N-API-KEY auth |

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env with your n8n credentials
echo "VITE_N8N_API_KEY=your-api-key-here" >> .env
echo "VITE_N8N_BASE_URL=https://your-n8n-instance.com" >> .env

# 3. Run dev server
npm run dev
```

## 📸 Screenshots

*Dashboard showing workflow list, execution history, and real-time status*

## 🔌 API Endpoints Used

- `GET /api/v1/workflows` — list workflows
- `POST /api/v1/workflows/:id/activate` — activate workflow
- `POST /api/v1/workflows/:id/deactivate` — deactivate workflow
- `GET /api/v1/executions` — execution history

## 📄 License

MIT — free for any use (portfolio, commercial, learning).

---

*Part of portfolio for React + AI Automation specialist positioning.*
