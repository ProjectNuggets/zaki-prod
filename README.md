# ZAKI - Memory-First AI Assistant

> **The AI that knows you better every day.**

ZAKI is a personal AI assistant with persistent memory that learns from your conversations and provides personalized, context-aware responses. Unlike ChatGPT or Claude, ZAKI remembers what you tell it and gets smarter with every interaction.

---

## 🎯 **Key Features (MVP v1.0)**

### **🧠 Persistent Memory System**
- Automatic fact extraction from conversations
- Vector-based semantic search (pgvector)
- Real-time context injection into responses
- Conversation summarization at session end

### **📊 Beautiful Memory Dashboard**
- View all memories in timeline format
- Search and filter by type (Facts, Preferences, Context, Episodes)
- Stats dashboard showing memory breakdown
- Export memories as JSON
- Delete individual memories for privacy

### **🔒 Privacy-First Design**
- User-scoped memory isolation
- Full data export capability
- Granular deletion controls
- Transparent memory storage

### **⚡ Production-Ready**
- PostgreSQL with pgvector for scalable storage
- React + TypeScript frontend
- Express.js backend
- Beautiful, polished UI matching design system

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL 17 with pgvector extension
- NOVA.TYP instance (or API access)

### **Backend Setup**

1. **Install PostgreSQL with pgvector:**
```bash
brew install postgresql@17 pgvector
brew services start postgresql@17
```

2. **Create database:**
```bash
createdb zaki
psql -d zaki -c "CREATE EXTENSION vector;"
```

3. **Configure environment:**
```bash
cd backend
cp .env.example .env
# Edit .env with your settings
```

4. **Install & run:**
```bash
npm install
npm run dev
```

Backend runs on `http://localhost:8787`

### **Frontend Setup**

1. **Install dependencies:**
```bash
npm install
```

2. **Run development server:**
```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 📁 **Project Structure**

```
ZAKI/
├── backend/
│   ├── src/
│   │   ├── index.js          # Main server & routes
│   │   ├── memory.js         # Memory system logic
│   │   └── db.js             # Database utilities
│   └── .env                  # Environment configuration
│
├── src/
│   ├── app/
│   │   └── components/
│   │       ├── memory/
│   │       │   └── MemoryViewer.tsx  # Memory UI component
│   │       ├── Sidebar.tsx           # Main sidebar (memory integration)
│   │       └── LoginScreen.tsx       # Authentication
│   ├── stores/               # Zustand state management
│   ├── queries/              # Data fetching hooks
│   └── styles/               # Design system & tokens
│
└── README.md
```

---

## 🔧 **Environment Variables**

### **Backend (.env)**

```bash
# Database
DATABASE_URL=postgres://user:password@localhost:5432/zaki
PGSSLMODE=prefer

# NOVA.TYP Integration
NOVA_TYP_BASE_URL=https://your-novatyp-instance.com
NOVA_TYP_API_KEY=your_api_key_here

# Together.ai (Fallback for embeddings)
TOGETHER_API_KEY=your_together_api_key

# CORS & URLs
ZAKI_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
ZAKI_PUBLIC_URL=http://localhost:8787
ZAKI_APP_URL=http://localhost:5173

# Email Configuration
ZAKI_EMAIL_MODE=none  # Options: none, console, smtp, resend
RESEND_API_KEY=your_resend_api_key  # If using Resend
RESEND_FROM="ZAKI <hello@yourdomain.com>"

# Server
PORT=8787
```

---

## 🧠 **How Memory Works**

### **1. Automatic Extraction**
When you chat with ZAKI, the system automatically:
- Detects facts, preferences, and context
- Generates semantic embeddings (384-dimensional vectors)
- Stores in PostgreSQL with pgvector

### **2. Smart Retrieval**
Before responding, ZAKI:
- Searches relevant memories using vector similarity
- Ranks by relevance score
- Injects top memories into conversation context

### **3. Conversation Summarization**
When you leave a conversation:
- Entire thread is analyzed by Claude/Gemma
- Key facts and insights are extracted
- Stored as long-term memories (episodes)

### **4. User Control**
You can:
- View all memories (Profile → Memory)
- Search and filter
- Delete unwanted memories
- Export everything as JSON

---

## 🎨 **Memory Types**

| Type | Icon | Description | Example |
|------|------|-------------|---------|
| **Fact** | 💡 | Factual information | "My name is Alaa" |
| **Preference** | ⚙️ | User preferences | "I prefer TypeScript" |
| **Context** | 💬 | Conversational context | "Working on ZAKI project" |
| **Episode** | 📖 | Conversation summaries | Meeting notes |

---

## 🏗️ **Architecture**

### **Tech Stack**

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Zustand (state management)
- React Router (routing)

**Backend:**
- Node.js + Express
- PostgreSQL 17
- pgvector (vector similarity)
- bcrypt (password hashing)
- Nodemailer / Resend (email)

**AI/ML:**
- NOVA.TYP (embeddings + chat)
- Together.ai (fallback embeddings)
- Vector similarity search

### **Database Schema**

```sql
-- Users
CREATE TABLE zaki_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  nova_user_id BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Memories
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  type TEXT DEFAULT 'context',
  embedding vector(384),
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Shared Conversations
CREATE TABLE shared_conversations (
  id UUID PRIMARY KEY,
  token TEXT UNIQUE,
  user_id BIGINT REFERENCES zaki_users(id),
  conversation_snapshot JSONB,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0
);
```

---

## 📊 **API Endpoints**

### **Authentication**
- `POST /signup` - Create account
- `POST /login` - Sign in
- `POST /password-reset/request` - Request reset
- `POST /password-reset/confirm` - Confirm reset

### **Memory System**
- `GET /api/memory/list/:userId` - List all memories
- `POST /api/memory/search` - Semantic search
- `POST /api/memory/store` - Store memory
- `DELETE /api/memory/:id` - Delete memory
- `POST /api/memory/context` - Build context for chat
- `POST /api/memory/summarize` - Summarize conversation
- `GET /api/memory/health` - System health check

### **Workspaces**
- `GET /workspaces` - List user workspaces
- `POST /zaki/workspaces` - Create workspace
- `GET /workspace/:slug/threads` - List threads

### **Sharing**
- `POST /api/share/create` - Create share link
- `GET /api/share/:token` - Get shared conversation
- `POST /api/share/:token/view` - View shared conversation
- `DELETE /api/share/:token` - Delete share link

---

## 🔐 **Security Features**

- ✅ Password hashing (bcrypt)
- ✅ Email verification (optional)
- ✅ User-scoped data isolation
- ✅ CORS protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting (TODO for production)
- ✅ HTTPS required for production

---

## 🚀 **Deployment**

See `ZAKI_PRODUCTION_DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

### **Quick Deploy (Railway)**

1. **Backend:**
```bash
cd backend
railway init
railway add postgresql
railway up
```

2. **Frontend:**
```bash
vercel --prod
```

### **Environment Setup**

For production:
- Change `ZAKI_EMAIL_MODE` to `resend`
- Update `ZAKI_ALLOWED_ORIGINS` to production domains
- Set `PGSSLMODE=require`
- Enable HTTPS

---

## 🧪 **Testing**

### **Run Tests**
```bash
# Backend
cd backend
npm test

# Frontend
npm test
```

### **Manual Testing**
1. Sign up with new account
2. Have conversations mentioning facts/preferences
3. Check Profile → Memory to see extracted memories
4. Test search, filter, delete, export

---

## 📈 **Roadmap**

### **V1.0 - MVP (Current)** ✅
- Core memory system
- Beautiful memory UI
- Production-ready code

### **V2.0 - Intelligent Memory (Q2 2025)**
- Proactive suggestions
- Knowledge graph
- Temporal queries
- Memory conflict resolution

### **V3.0 - Viral Features (Q3 2025)**
- Memory sharing
- Template marketplace
- Team workspaces
- API access

See `ZAKI_MEMORY_ROADMAP.md` for detailed roadmap.

---

## 🤝 **Contributing**

This is a private project. For team members:

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Create pull request
5. Get review approval
6. Merge to main

---

## 📄 **License**

Proprietary - All Rights Reserved

---

## 🆘 **Support**

### **Common Issues**

**Issue:** Database connection failed  
**Fix:** Check PostgreSQL is running and DATABASE_URL is correct

**Issue:** pgvector not found  
**Fix:** Run `CREATE EXTENSION vector;` in your database

**Issue:** CORS errors  
**Fix:** Add your frontend URL to `ZAKI_ALLOWED_ORIGINS`

**Issue:** Login fails  
**Fix:** Check user is verified (set `ZAKI_EMAIL_MODE=none` for dev)

### **Documentation**
- `/clawd/ZAKI_PRODUCTION_DEPLOYMENT_GUIDE.md` - Deployment
- `/clawd/ZAKI_MEMORY_ROADMAP.md` - Feature roadmap
- `/clawd/ZAKI_S_TIER_MASTER_PLAN.md` - Business strategy

---

## 🎯 **Why ZAKI?**

**Problem:** ChatGPT and Claude forget everything. Every conversation starts fresh.

**Solution:** ZAKI builds a persistent understanding of you. The more you use it, the better it gets.

**Result:** Personalized AI that actually knows you, not generic responses.

---

## ⭐ **Key Differentiators**

| Feature | ChatGPT | Claude | Mem.ai | ZAKI |
|---------|---------|--------|--------|------|
| Persistent Memory | ❌ | ❌ | ✅ | ✅ |
| Auto-Extraction | ❌ | ❌ | ✅ | ✅ |
| Memory Viewer | ❌ | ❌ | ✅ | ✅ |
| Beautiful UI | ⚠️ | ⚠️ | ⚠️ | ✅ |
| Privacy Controls | ❌ | ❌ | ⚠️ | ✅ |
| Affordable | ✅ | ⚠️ | ❌ | ✅ |

---

## 📞 **Contact**

For questions or support, contact the ZAKI team.

---

**Built with 🧠 by the ZAKI Team**

*Version 1.0.0 - MVP Release*
