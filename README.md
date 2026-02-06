# ZAKI 🤖💭

[![BETA](https://img.shields.io/badge/status-BETA-orange)](https://github.com/yourusername/zaki)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **The AI that actually remembers you.**

ZAKI is a **memory-first AI assistant** that persists context, preferences, and facts across conversations. Built on [NOVA.TYP](https://github.com/TimPietrusky/anything-llm) with a beautiful, modern interface.

![ZAKI Interface](https://placehold.co/1200x600/d24430/ffffff?text=ZAKI+Interface+Preview)

---

## ✨ Why ZAKI?

Most AI assistants treat every conversation like it's the first time. **ZAKI remembers:**

- 🧠 **Your preferences** - "I prefer TypeScript over Python"
- 🧠 **Your context** - "I run a marketing agency"
- 🧠 **Your history** - "We discussed this pricing strategy yesterday"
- 🧠 **Your facts** - "My company has 12 employees"

**The result?** More relevant, personalized, and genuinely helpful AI conversations.

---

## 🚀 Features

### Core Chat
- ✅ **Real-time streaming** - Fast, responsive chat with typing indicators
- ✅ **Multi-workspace** - Organize conversations into spaces
- ✅ **Thread-based** - Multiple conversations per workspace
- ✅ **File attachments** - Drag & drop support
- ✅ **Web search** - Optional web grounding
- ✅ **Share links** - Share conversations with one click

### Active Memory System (BETA)
- ✅ **Vector embeddings** - 384-dimension semantic search
- ✅ **Automatic extraction** - LLM extracts facts from every conversation
- ✅ **Context injection** - Relevant memories prepended to prompts
- ✅ **Memory viewer** - Browse, search, delete memories
- ✅ **Cross-space memory** - Memories follow you, not the workspace

### Security & Performance
- ✅ **Rate limiting** - 100 req/15min general, 10 req/hour auth
- ✅ **Input validation** - Zod schemas for all endpoints
- ✅ **Request limits** - 10MB max prevents abuse
- ✅ **CORS protection** - Production-strict origin checking
- ✅ **Health monitoring** - Database status endpoint

---

## 🏗 Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   User      │──────│  ZAKI       │──────│   ZAKI      │──────│   NOVA.TYP  │
│   Browser   │      │  Frontend   │      │   Backend   │      │   Instance  │
└─────────────┘      └──────┬──────┘      └──────┬──────┘      └─────────────┘
                            │                     │
                            │  React 18           │  Node.js      ┌──────────┐
                            │  TypeScript         │  Express      │ OpenAI   │
                            │  Tailwind CSS       │  PostgreSQL   │ Claude   │
                            │  Vite               │  pgvector     │ Together │
                            │                     │               └──────────┘
                            └─────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite, Zustand |
| **Backend** | Node.js, Express, PostgreSQL, pgvector |
| **AI/LLM** | NOVA.TYP (proxy to OpenAI, Anthropic, etc.) |
| **Memory** | Qwen 2.5 7B for extraction, vector similarity search |
| **Security** | Rate limiting, Zod validation, CORS, JWT |

---

## 🛠 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ with [pgvector](https://github.com/pgvector/pgvector)
- NOVA.TYP instance (local or remote)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/zaki.git
cd zaki

# Backend
cd backend
npm install

# Frontend
cd ..
npm install
```

### 2. Environment Setup

**Backend** (`backend/.env`):
```bash
PORT=8787
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/zaki
NOVA_TYP_BASE_URL=http://localhost:3000/api
NOVA_TYP_API_KEY=your_nova_admin_key
ZAKI_EMAIL_MODE=console
```

**Frontend** (`.env`):
```bash
VITE_ZAKI_BACKEND_URL=http://localhost:8787
```

### 3. Run Development

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd ..
npm run dev
```

Visit `http://localhost:5173` 🎉

---

## 🚀 Deployment

See [DEPLOYMENT_BRIEFING.md](./DEPLOYMENT_BRIEFING.md) for detailed cloud deployment options.

**Quick Deploy (Railway):**
```bash
# 1. Push to GitHub
# 2. Connect Railway to repo
# 3. Add PostgreSQL plugin
# 4. Set environment variables
# 5. Deploy!
```

---

## 🎯 Current Status: BETA

ZAKI is in **BETA** - functional but actively being improved.

### What's Working ✅
- Core chat with streaming
- Memory system (extraction, storage, injection)
- Multi-workspace/space organization
- File attachments
- Security hardening
- Web search integration

### Known Issues ⚠️
- Space deletion requires NOVA admin permissions (workaround in progress)
- No test coverage yet
- Limited offline support

---

## 🌟 Roadmap: From BETA to S-TIER

### Phase 1: Foundation (Current - BETA)
- [x] Core chat functionality
- [x] Basic memory system
- [x] Security hardening
- [x] Multi-workspace support

### Phase 2: Polish (Next 2-4 weeks) - Target: v1.0
- [ ] **Comprehensive test suite** (unit, integration, e2e)
- [ ] **Error boundaries & recovery** throughout app
- [ ] **Loading states & skeletons** for better UX
- [ ] **Empty states** for all zero-data scenarios
- [ ] **Better delete confirmation** (show item counts, type to confirm)
- [ ] **Request logging** for production debugging
- [ ] **Rate limit feedback** (toast when throttled)

### Phase 3: Memory v2 (1-2 months) - Target: v1.5
- [ ] **Proactive memory** - Auto-suggest memories before user asks
- [ ] **Memory confidence scores** - Show extraction certainty
- [ ] **Memory categories** - Better organization (work, personal, projects)
- [ ] **Memory export/import** - JSON/CSV data portability
- [ ] **Memory insights** - "You mentioned X 5 times this week"
- [ ] **Collaborative memory** - Share memories across team members

### Phase 4: Intelligence (2-3 months) - Target: v2.0
- [ ] **Agent mode** - Let ZAI take actions on your behalf
- [ ] **Multi-modal memory** - Remember images, documents, code
- [ ] **Smart summarization** - Auto-summarize long conversations
- [ ] **Context decay** - Forget old/irrelevant memories automatically
- [ ] **Memory search API** - Query your memory programmatically

### Phase 5: Differentiation (3-6 months) - Target: v3.0 - S-TIER
- [ ] **Browser extension** - ZAKI follows you across the web
- [ ] **Mobile app** - React Native companion
- [ ] **Third-party integrations** - Slack, Notion, GitHub
- [ ] **Voice mode** - Talk to ZAKI, not just type
- [ ] **Custom memory models** - Train on your specific domain
- [ ] **Federated learning** - Improve models without sharing data

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Good first issues:**
- Add loading skeletons
- Improve error messages
- Write tests
- Add i18n support

---

## 📚 Documentation

- **[DEPLOYMENT_BRIEFING.md](./DEPLOYMENT_BRIEFING.md)** - Complete deployment guide
- **[Architecture Overview](./docs/ARCHITECTURE.md)** - System design
- **[API Reference](./docs/API.md)** - Backend endpoints
- **[Memory System](./docs/MEMORY.md)** - How memory works

---

## 🧠 Memory System Deep Dive

### How It Works

1. **User sends message** → Stored in conversation
2. **LLM extracts facts** → Qwen 2.5 parses for key info
3. **Vector embedding** → 384-dimension semantic representation
4. **Store in PostgreSQL** → pgvector for similarity search
5. **Next conversation** → Relevant memories auto-injected

### Memory Types

| Type | Example | Priority |
|------|---------|----------|
| **Fact** | "I run a marketing agency" | High |
| **Preference** | "I prefer dark mode" | High |
| **Episode** | "We discussed pricing yesterday" | Medium |
| **Action** | "Follow up on proposal" | Medium |
| **Context** | "This is a React project" | Low |

---

## 🔒 Security

- Rate limiting: 100 requests/15min, 10 auth attempts/hour
- Input validation with Zod schemas
- CORS strict mode in production
- 10MB request size limits
- No secrets in client-side code
- Database connection pooling

---

## 📊 Performance

| Metric | Target | Current |
|--------|--------|---------|
| First message latency | <500ms | ~300ms |
| Streaming chunk delay | <100ms | ~50ms |
| Memory search | <200ms | ~100ms |
| Extraction (async) | <5s | ~2s |

---

## 💡 What Makes an App "S-Tier"?

**Our Definition:**

1. **Reliability** - Never loses data, handles errors gracefully
2. **Speed** - Feels instant, even on slow connections
3. **Delight** - Surprises users with thoughtful details
4. **Privacy** - User data is sacred and protected
5. **Extensibility** - Easy to customize and extend
6. **Community** - Active open-source contributors
7. **Vision** - Clear roadmap that excites users

**Current Grade: B+** → **Target: S**

---

## 🏆 Acknowledgments

- **[NOVA.TYP](https://github.com/TimPietrusky/anything-llm)** - Core LLM infrastructure
- **[Qwen 2.5](https://github.com/QwenLM/Qwen)** - Memory extraction model
- **[pgvector](https://github.com/pgvector/pgvector)** - Vector similarity search
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

## 🙋 FAQ

**Q: How is this different from ChatGPT / Claude?**
A: ZAKI remembers across conversations. GPT/Claude have limited context windows. ZAKI has persistent, searchable memory.

**Q: Do you store my conversations?**
A: Yes, locally in your PostgreSQL database. No data sent to us. Open-source, self-hostable.

**Q: Can I use my own LLM?**
A: Yes! Configure NOVA.TYP with any OpenAI-compatible API.

**Q: Is mobile support coming?**
A: Yes! React Native app is on the roadmap (Phase 5).

---

## 📞 Support

- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Q&A and ideas
- **Discord** - [Join our community](https://discord.gg/zaki)

---

**Built with ❤️ by the ZAKI team**

*Remember: Great AI doesn't just answer questions. It remembers why you asked.* 🧠✨
