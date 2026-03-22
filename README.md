# 🐛 JiraGenie — AI-Powered Bug Report Enhancer

> Drop screenshots & videos → AI generates a structured bug report → Jira ticket created automatically.

![Built with TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Powered by Groq](https://img.shields.io/badge/Groq-LLaMA%20Scout-orange?style=flat)
![Jira Integration](https://img.shields.io/badge/Jira-Cloud-blue?style=flat&logo=jira)

---

## ✨ Features

- 📸 **Multi-file drag & drop** — screenshots and videos (PNG, JPG, WebP, MP4, MOV, WebM)
- 🤖 **AI bug report generation** — Groq LLaMA Scout vision model analyzes your screenshot and generates a structured bug report
- 🎫 **Automatic Jira ticket creation** — creates a well-formatted ticket with all file attachments
- ⚙️ **Settings page** — configure Jira & Groq API keys with connection testing
- 🌙 **Premium dark UI** — glassmorphism design, fully responsive

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js · Express · TypeScript |
| AI Vision | Groq — `meta-llama/llama-4-scout-17b-16e-instruct` |
| Jira API | Atlassian REST API v3 · ADF format |
| Frontend | Vanilla HTML · CSS · TypeScript |

---

## 🚀 Getting Started

### 1. Clone and install
```bash
git clone https://github.com/ugupta0005/JiraGenie.git
cd JiraGenie
npm install
```

### 2. Build frontend TypeScript
```bash
npx tsc -p tsconfig.frontend.json
```

### 3. Start the server
```bash
npx ts-node src/server.ts
```

Open **http://localhost:3000** in Chrome.

---

## ⚙️ Configuration

Go to **Settings** in the app and fill in:

| Field | Where to get it |
|-------|----------------|
| Jira URL | `https://yourcompany.atlassian.net` |
| Jira Email | Your Atlassian account email |
| Jira API Key | [id.atlassian.com → Security → API tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| Jira Project Key | Prefix of your Jira issues (e.g. `DEV` from `DEV-123`) |
| Groq API Key | [console.groq.com](https://console.groq.com) |

> ⚠️ Settings are saved locally in `settings.json` (gitignored). Never commit API keys.

---

## 📁 Project Structure

```
├── src/
│   ├── server.ts              # Express entry point
│   ├── routes/
│   │   ├── analyze.ts         # POST /api/analyze
│   │   ├── settings.ts        # GET/POST /api/settings
│   │   └── testConnection.ts  # POST /api/test/jira|groq
│   ├── services/
│   │   ├── groqService.ts     # Groq LLaMA Scout vision
│   │   └── jiraService.ts     # Jira REST API + attachments
│   └── types/index.ts
├── src-frontend/
│   ├── main.ts                # Main page logic
│   └── settings.ts            # Settings page logic
├── public/
│   ├── index.html
│   ├── settings.html
│   ├── css/style.css
│   └── js/                    # Compiled frontend JS
└── vercel.json
```

---

## 📄 License

MIT
