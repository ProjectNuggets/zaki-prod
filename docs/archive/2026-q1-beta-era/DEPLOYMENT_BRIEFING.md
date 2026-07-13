# ZAKI Deployment Briefing

**For:** Development Engineer  
**Date:** January 31, 2025  
**Version:** MVP v1.1 + Security + Active Memory  
**Status:** Production-Ready

---

## 📋 PROJECT OVERVIEW

**ZAKI** is a memory-first AI assistant built on top of NOVA.TYP (open-source LLM platform). It adds persistent memory to conversations, allowing the AI to remember facts, preferences, and context across chats.

### Key Features
- Persistent memory with vector search (pgvector)
- Multi-workspace / space organization
- Real-time streaming chat
- File attachments & drag-drop
- Web search integration
- Share conversations via links

---

## 🏗 ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React 18 + TypeScript + Vite + Tailwind CSS + Zustand          │
│  Build output: /dist (static files)                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / WebSocket
┌──────────────────────────┴──────────────────────────────────────┐
│                      BACKEND (Node.js)                           │
│  Express + PostgreSQL + pgvector                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Security Layer                                          │    │
│  │  - Rate limiting (100 req/15min)                        │    │
│  │  - Zod input validation                                 │    │
│  │  - CORS protection                                      │    │
│  │  - Request size limits (10MB)                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Memory System                                           │    │
│  │  - Vector embeddings (384 dims)                        │    │
│  │  - Semantic search (cosine similarity)                 │    │
│  │  - LLM extraction (Qwen 2.5 7B)                        │    │
│  │  - Context injection into prompts                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  NOVA.TYP Proxy                                          │    │
│  │  - Routes: /login, /signup                             │    │
│  │  - Routes: /workspace/*, /thread/*                     │    │
│  │  - Intercepts /stream-chat for memory                │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────┴──────────────────────────────────────┐
│                    NOVA.TYP INSTANCE                             │
│  - Multi-user LLM platform                                      │
│  - Supports OpenAI, Anthropic, Together, etc.                  │
│  - Must be deployed SEPARATELY                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 CODE STRUCTURE

```
ZAKI/
├── backend/                      # Node.js Express server
│   ├── src/
│   │   ├── index.js             # Main server (all routes)
│   │   ├── db.js                # PostgreSQL connection
│   │   └── memory.js            # Memory system logic
│   ├── package.json
│   └── .env                     # Backend env vars (CREATE THIS)
│
├── src/                         # React frontend
│   ├── app/
│   │   ├── components/          # UI components
│   │   │   ├── Sidebar.tsx      # Navigation
│   │   │   ├── ChatArea.tsx     # Main chat
│   │   │   ├── InputArea.tsx    # Message input
│   │   │   └── memory/          # Memory viewer
│   │   ├── App.tsx              # Root component
│   │   └── routes.tsx           # React Router
│   ├── lib/
│   │   └── api.ts               # API client
│   ├── stores/                  # Zustand state
│   └── styles/                  # Tailwind CSS
├── package.json                 # Frontend deps
└── .env                         # Frontend env vars (CREATE THIS)
```

---

## 📦 DEPENDENCIES

### Backend (`backend/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.19.2 | Web server |
| cors | 2.8.5 | Cross-origin requests |
| pg | 8.13.1 | PostgreSQL client |
| bcryptjs | 2.4.3 | Password hashing |
| nodemailer | 6.9.13 | Email sending |
| dotenv | 16.4.5 | Environment variables |
| express-rate-limit | ^8.2.1 | API rate limiting |
| zod | ^4.3.6 | Input validation |

### Frontend (`package.json`)

| Category | Key Packages |
|----------|-------------|
| **Core** | react 18.3.1, react-dom 18.3.1 |
| **Build** | vite 6.3.5, typescript ^5.9.3 |
| **Styling** | tailwindcss 4.1.12, @tailwindcss/vite |
| **State** | zustand ^5.0.10, @tanstack/react-query |
| **UI** | @radix-ui/* (30+ components), lucide-react |
| **Routing** | react-router-dom ^7.13.0 |
| **Markdown** | react-markdown, rehype-highlight, remark-gfm |

---

## 🔧 ENVIRONMENT VARIABLES

### Backend (`backend/.env`)

```bash
# REQUIRED - Server
PORT=8787
NODE_ENV=production

# REQUIRED - Database (PostgreSQL with pgvector)
DATABASE_URL=postgresql://user:password@host:5432/zaki

# REQUIRED - NOVA.TYP Integration
NOVA_TYP_BASE_URL=https://nova.example.com/api
NOVA_TYP_API_KEY=your_nova_admin_api_key

# REQUIRED for auth proxy to work
ZAKI_PUBLIC_URL=https://zaki-backend.example.com
ZAKI_APP_URL=https://zaki.example.com

# Email Configuration (choose one)
# Option 1: SMTP
ZAKI_EMAIL_MODE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password

# Option 2: Resend
ZAKI_EMAIL_MODE=resend
RESEND_API_KEY=re_xxxxxxxx

# Option 3: Console (dev only)
ZAKI_EMAIL_MODE=console

# Optional - Security
ZAKI_ALLOWED_ORIGINS=https://zaki.example.com,https://app.zaki.example.com
```

### Frontend (`.env`)

```bash
# Backend API URL
VITE_ZAKI_BACKEND_URL=https://zaki-backend.example.com

# Or for local dev:
# VITE_ZAKI_BACKEND_URL=http://localhost:8787
```

---

## ☁️ CLOUD DEPLOYMENT OPTIONS

### Option 1: Railway (Recommended - Easiest)

**Pros:** PostgreSQL included, auto-deploy from Git, free tier

**Backend:**
```bash
# 1. Create project on railway.app
# 2. Add PostgreSQL plugin (creates DATABASE_URL automatically)
# 3. Connect GitHub repo
# 4. Set environment variables in Railway dashboard
# 5. Deploy
```

**Frontend:**
```bash
# 1. Create new service on Railway
# 2. Build command: npm install && npm run build
# 3. Start command: npx serve dist
# 4. Set VITE_ZAKI_BACKEND_URL env var
# 5. Deploy
```

---

### Option 2: Render

**Backend:**
```yaml
# render.yaml
services:
  - type: web
    name: zaki-backend
    env: node
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: zaki-db
          property: connectionString
```

**Frontend:**
- Create Static Site
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

---

### Option 3: DigitalOcean App Platform

```yaml
# .do/app.yaml
name: zaki
services:
  - name: backend
    source_dir: /backend
    github:
      repo: your-org/zaki
      branch: main
    build_command: npm install
    run_command: npm start
    envs:
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
      - key: NOVA_TYP_BASE_URL
        value: https://nova.yourdomain.com/api
    
  - name: frontend
    source_dir: /
    github:
      repo: your-org/zaki
      branch: main
    build_command: npm install && npm run build
    output_dir: dist
    envs:
      - key: VITE_ZAKI_BACKEND_URL
        value: https://backend-yourapp.ondigitalocean.app

databases:
  - name: db
    engine: PG
    version: "15"
```

---

### Option 4: Docker (Self-Hosted)

**Dockerfile (Backend):**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/src ./src
EXPOSE 8787
CMD ["node", "src/index.js"]
```

**Dockerfile (Frontend):**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_USER: zaki
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: zaki
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      - DATABASE_URL=postgresql://zaki:${DB_PASSWORD}@postgres:5432/zaki
      - NOVA_TYP_BASE_URL=${NOVA_TYP_BASE_URL}
      - NOVA_TYP_API_KEY=${NOVA_TYP_API_KEY}
      - PORT=8787
    depends_on:
      - postgres
    ports:
      - "8787:8787"

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"

volumes:
  postgres_data:
```

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Prerequisites
1. Node.js 20+ installed locally
2. Git repository with code pushed
3. PostgreSQL 15+ with pgvector extension
4. NOVA.TYP instance running (separate deployment)

### Step 1: Database Setup

```bash
# Connect to PostgreSQL
psql -U postgres -h your-db-host

# Create database
CREATE DATABASE zaki;

# Enable pgvector (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

# Tables auto-created on first backend start
```

### Step 2: Backend Deployment

```bash
# Clone repo
git clone https://github.com/your-org/zaki.git
cd zaki/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your values

# Start server
npm start

# Or with Docker:
docker build -t zaki-backend .
docker run -p 8787:8787 --env-file .env zaki-backend
```

### Step 3: Frontend Deployment

```bash
# From project root
cd zaki

# Install dependencies
npm install

# Create environment file
echo "VITE_ZAKI_BACKEND_URL=https://your-backend-url.com" > .env

# Build
npm run build

# Deploy /dist folder to static hosting
# - Vercel: vercel --prod
# - Netlify: netlify deploy --prod --dir=dist
# - S3: aws s3 sync dist/ s3://your-bucket
```

### Step 4: Verify Deployment

```bash
# Test backend health
curl https://your-backend.com/health
# Should return: {"ok":true,"database":"connected"}

# Test login page loads
open https://your-frontend.com

# Test auth
curl -X POST https://your-backend.com/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
# Should return validation error (not 500)
```

---

## 🔒 SECURITY CHECKLIST

Before going live:

- [ ] `NODE_ENV=production` set
- [ ] `ZAKI_ALLOWED_ORIGINS` restricted to frontend domain(s)
- [ ] NOVA_TYP_API_KEY is admin key (not user key)
- [ ] Rate limiting active (100 req/15min default)
- [ ] HTTPS enabled (no http:// in production)
- [ ] Database credentials secure (not in code)
- [ ] Email sending configured (not console mode)
- [ ] CORS properly configured
- [ ] Request size limits set (10MB)

---

## 📊 MONITORING & LOGS

### Backend Logging
```bash
# View logs on Railway/Render
tail -f /var/log/zaki/app.log

# Key log patterns to watch:
grep "\[Chat\]" app.log          # Chat requests
grep "\[Memory\]" app.log        # Memory operations
grep "\[Auth\]" app.log          # Authentication
grep "ERROR" app.log             # Errors
```

### Health Endpoint
```bash
curl https://your-backend.com/health

# Expected response:
{
  "ok": true,
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-31T12:00:00.000Z"
}
```

---

## 🔧 TROUBLESHOOTING

### Issue: "Unable to load chat history" toast
**Cause:** Frontend can't reach backend or auth expired  
**Fix:** Check `VITE_ZAKI_BACKEND_URL` matches deployed backend URL

### Issue: "Cannot delete space" (401 error)
**Cause:** User doesn't have admin permissions in NOVA  
**Workaround:** Use NOVA admin panel to delete, or ensure NOVA_TYP_API_KEY has workspace delete permissions

### Issue: Memory not working (no facts extracted)
**Cause:** Qwen 2.5 model not available in NOVA  
**Fix:** Add Qwen 2.5 7B model to NOVA, or modify memory.js to use available model

### Issue: Rate limiting blocking legitimate requests
**Cause:** Shared IP (behind NAT/proxy)  
**Fix:** Configure rate limit to use `keyGenerator: (req) => req.user?.id || req.ip`

---

## 📞 SUPPORT

**Critical Files:**
- `backend/src/index.js` - All server logic (single file ~1500 lines)
- `backend/src/memory.js` - Memory system implementation
- `src/app/components/ChatArea.tsx` - Main chat interface
- `src/lib/api.ts` - API client

**Key Decisions Documented In:**
- `README_MVP_SECURITY_MEMORY.md` - Full feature documentation
- `memory/` folder - Daily development logs

---

## 🎯 QUICK START FOR DEV ENGINEER

```bash
# 1. Clone and setup
git clone <repo>
cd zaki

# 2. Backend (terminal 1)
cd backend
cp .env.example .env  # Fill in values
npm install
npm run dev            # Starts on :8787

# 3. Frontend (terminal 2)
cd ..
npm install
cp .env.example .env  # VITE_ZAKI_BACKEND_URL=http://localhost:8787
npm run dev            # Starts on :5173

# 4. Set up NOVA.TYP locally or connect to existing instance
# Update backend .env with NOVA_TYP_BASE_URL and NOVA_TYP_API_KEY

# 5. Open http://localhost:5173
```

---

**Questions?** Check commit history for context: `git log --oneline -20`

**Status:** ✅ MVP + Security + Active Memory COMPLETE
