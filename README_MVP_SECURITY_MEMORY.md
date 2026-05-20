# ZAKI - MVP + Security + Active Memory

**Version:** MVP v1.1  
**Commit:** `648ff31`  
**Date:** January 31, 2025  
**Status:** Production-Ready 🚀

---

## 🎯 What's In This Release

This release combines three major milestones:

1. **MVP Foundation** - Complete chat app with NOVA.TYP integration
2. **Security Hardening** - Production-grade protection against attacks
3. **Active Memory** - AI that remembers and learns from conversations

---

## ✨ Features

### Core Chat
- ✅ Real-time streaming chat with NOVA.TYP
- ✅ Multi-workspace/space organization
- ✅ Thread-based conversations
- ✅ File attachments and drag-drop
- ✅ Web search integration
- ✅ Share conversations via links

### Security (NEW)
- ✅ **Rate Limiting** - 100 req/15min general, 10 req/hour auth
- ✅ **Input Validation** - Zod schemas for all endpoints
- ✅ **Request Size Limits** - 10MB max prevents memory exhaustion
- ✅ **CORS Protection** - Production-strict origin checking
- ✅ **Error Boundaries** - Graceful crash recovery
- ✅ **Health Checks** - Database connection monitoring

### Active Memory (NEW)
- ✅ **Core Fact Injection** - Always remembers your preferences
- ✅ **Semantic Search** - Vector-based memory retrieval
- ✅ **LLM Extraction** - Qwen 2.5 7B extracts facts from conversations
- ✅ **Cross-Space Memory** - User-level (not workspace-specific)
- ✅ **Memory Viewer** - Beautiful UI to browse/delete memories
- ✅ **Auto-Summarization** - Conversations become memories automatically

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- NOVA.TYP instance (local or remote)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Environment variables
cp .env.example .env
# Edit .env with your settings:
# - DATABASE_URL
# - NOVA_TYP_BASE_URL
# - NOVA_TYP_API_KEY
# - SMTP or RESEND credentials

# Initialize database
npm run dev
# Creates tables automatically
```

### Frontend Setup

```bash
# In project root
npm install

# Environment variables
cp .env.example .env
# Edit .env:
# - VITE_ZAKI_BACKEND_URL=http://localhost:8787

# Development
npm run dev

# Production build
npm run build
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 + TypeScript + Tailwind CSS + Zustand             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Sidebar    │  │  ChatArea    │  │   Memory     │       │
│  │  (Spaces)    │  │ (Streaming)  │  │   Viewer     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │ API + WebSocket
┌────────────────────────┴────────────────────────────────────┐
│                       BACKEND (Node.js)                      │
│  Express + PostgreSQL + pgvector                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Security Layer                                      │   │
│  │  - Rate limiting (express-rate-limit)                │   │
│  │  - Input validation (Zod)                            │   │
│  │  - CORS protection                                   │   │
│  │  - Request size limits                               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Memory System                                       │   │
│  │  - Vector embeddings (384 dims)                      │   │
│  │  - Semantic search (cosine similarity)               │   │
│  │  - LLM extraction (Qwen 2.5 7B)                      │   │
│  │  - Context injection                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  NOVA.TYP Proxy                                      │   │
│  │  - Auth proxy (/login, /signup)                      │   │
│  │  - Workspace proxy (/workspace/*)                    │   │
│  │  - Thread proxy (/workspace/*/thread/*)              │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    NOVA.TYP INSTANCE                         │
│  - Multi-user mode                                         │
│  - LLM providers (OpenRouter, Together, etc.)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Features

### Rate Limiting
```javascript
// General API: 100 requests per 15 minutes
// Auth endpoints: 10 requests per hour
// Resets on successful login (no throttle for legit users)
```

### Input Validation
All endpoints validated with Zod:
- Email format validation
- Password length (min 8 chars)
- Date format (YYYY-MM-DD)
- Content length limits (10KB max)
- Type safety enforcement

### CORS
```javascript
// Development: Allow localhost, file://
// Production: Strict allowlist only
// Credentials: Enabled for authenticated requests
```

### Error Handling
- Error boundaries catch React crashes
- Graceful degradation on API failures
- No sensitive data in error messages
- Health endpoint for monitoring

---

## 🧠 Memory System

### How It Works

1. **Conversation Flow:**
   ```
   User sends message → ZAKI backend stores raw message
           ↓
   NOVA.TYP streams response → ZAKI captures assistant message
           ↓
   Conversation ends → ZAKI summarizes & extracts memories
           ↓
   Memories stored in pgvector with embeddings
   ```

2. **Context Injection:**
   ```
   New message → Get core facts (user preferences)
             → Semantic search (relevant past memories)
             → Build natural context
             → Inject into NOVA.TYP prompt
   ```

3. **Memory Types:**
   - **Facts** - "User is a business owner"
   - **Preferences** - "Prefers TypeScript"
   - **Episodes** - "Discussed project timeline"
   - **Actions** - "Task: Review proposal"

### Memory Viewer
Access via: Profile → Memory

Features:
- Search memories
- Filter by type
- Delete memories
- Export all data
- Stats dashboard

---

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Health check
curl http://localhost:8787/health

# Test validation
curl -X POST http://localhost:8787/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"bad","password":"123"}'
# Should return: validation errors

# Test rate limiting
curl -X POST http://localhost:8787/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
# Run 10+ times to trigger rate limit
```

### Frontend Tests
```bash
# Build test
npm run build

# Error boundary test
# Add `throw new Error('test')` in any component
# Should show error UI instead of white screen

# Focus styles test
# Press Tab key repeatedly
# Should see orange outline around focused elements
```

---

## 📁 Project Structure

```
ZAKI/
├── backend/
│   ├── src/
│   │   ├── index.js          # Main server + routes
│   │   ├── memory.js         # Memory system implementation
│   │   └── db.js             # Database connection
│   ├── package.json
│   └── .env
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx           # Workspace/thread navigation
│   │   │   ├── ChatArea.tsx          # Main chat interface
│   │   │   ├── LoginScreen.tsx       # Auth flows
│   │   │   ├── ErrorBoundary.tsx     # Error handling (NEW)
│   │   │   └── memory/
│   │   │       └── MemoryViewer.tsx  # Memory management (NEW)
│   │   ├── App.tsx
│   │   └── routes.tsx
│   ├── lib/
│   │   └── api.ts              # API client
│   ├── stores/
│   │   ├── authStore.ts        # Auth state
│   │   └── ...                 # Other stores
│   └── styles/
│       ├── index.css           # Global styles + focus states
│       └── tokens.css          # Design tokens
├── package.json
└── README.md
```

---

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/zaki
NOVA_TYP_BASE_URL=https://typ.yoursite.com
NOVA_TYP_API_KEY=your_api_key

# Optional
PORT=8787
ZAKI_EMAIL_MODE=smtp  # or 'resend' or 'console'
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@email.com
SMTP_PASS=your_password

# Security
NODE_ENV=production
ZAKI_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

**Frontend (.env):**
```bash
VITE_ZAKI_BACKEND_URL=http://localhost:8787
```

---

## 🚢 Deployment

### Backend
```bash
cd backend
npm install --production
npm start
```

**Docker:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src ./src
EXPOSE 8787
CMD ["node", "src/index.js"]
```

### Frontend
```bash
npm run build
# Deploy dist/ folder to static hosting
```

**Vercel/Railway/Render:**
- Connect GitHub repo
- Build command: `npm run build`
- Output directory: `dist`

---

## 📊 Monitoring

### Health Endpoint
```bash
curl https://yourapi.com/health
```

**Response:**
```json
{
  "ok": true,
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-31T12:00:00.000Z"
}
```

### Logs
```bash
# Backend logs
tail -f /var/log/zaki/app.log

# View errors
grep "ERROR" /var/log/zaki/app.log

# View memory operations
grep "\[Memory\]" /var/log/zaki/app.log
```

---

## 🐛 Known Issues

### Space Delete Requires Admin
**Problem:** Users see "401 Unauthorized" when deleting spaces  
**Workaround:** Delete spaces via NOVA.TYP admin panel  
**Fix:** Implement backend proxy (coming in v1.2)

### Rate Limiting in Development
**Problem:** 10 login attempts per hour can be limiting during dev  
**Workaround:** Restart backend to reset counters, or set `NODE_ENV=development`

---

## 🎯 What's Next

### P1 - High Impact, Low Effort
1. **Fix space delete** (30 min) - Backend admin proxy
2. **Add request logging** (10 min) - Debug production issues
3. **Rate limit feedback** (20 min) - Show toast when limited

### P2 - Medium Effort, High Value
4. **Test coverage** (4 hours) - Auth + memory tests
5. **Branding alignment** (2-4 hours) - Match design guidelines
6. **Performance optimization** (3 hours) - React Query, memoization

### P3 - Long-term
7. **V2 proactive memory** - Auto-suggest based on context
8. **Browser extension** - Differentiating feature
9. **Mobile app** - React Native

---

## 🙏 Credits

- **NOVA.TYP** - Core LLM infrastructure
- **Qwen 2.5 7B** - Memory extraction model
- **pgvector** - Vector similarity search
- **Zod** - Type-safe validation
- **express-rate-limit** - API protection

---

## 📜 License

ZAKI production is proprietary, private software. All rights reserved. No
open-source license is granted for this repository unless a separate written
license says otherwise.

Third-party components keep their own licenses and notices.

---

## 🆘 Support

**Issues:** GitHub Issues  
**Discord:** [Your Discord]  
**Email:** support@yourdomain.com

---

**Built with ❤️ by the ZAKI team**

*Remember: ZAKI remembers. Every conversation makes it smarter.* 🧠✨
