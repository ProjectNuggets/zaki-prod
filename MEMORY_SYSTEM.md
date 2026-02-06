# ZAKI Memory System v0.9-Beta
## Production Documentation

---

## Overview

ZAKI's memory system provides **persistent, cross-thread memory** with two modes:
- **Auto-Save (Default)**: Extracts and saves memories immediately with 3-second undo window
- **Manual**: Stages memories for user confirmation before storing

### Key Features

| Feature | Description |
|---------|-------------|
| Dual Mode | Auto-save with undo OR manual confirmation |
| Cross-Thread | Memories persist across all conversation threads |
| Context Injection | Retrieves relevant memories during chat |
| Security | User authorization on all operations |
| Deduplication | SHA-256 hash prevents duplicate memories |
| Graceful Degradation | Works without embeddings API |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│   PostgreSQL    │
│   (ChatArea)    │     │   (Express)      │     │   + pgvector    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                          │
         ▼                       ▼                          ▼
   AutoSaveToast          Memory Routes               memories
   MemoryModeToggle       Operations                 memory_confirmations
   MemoryViewer           Context Builder            (triggers, notifications)
```

### File Structure

```
backend/src/memory/
├── operations.js      # Core CRUD operations
├── routes.js          # 13 API endpoints
├── auto-save.js       # 3s undo buffer logic
├── index.js           # Clean exports
└── extraction.js      # LLM + pattern fallback

frontend/src/app/components/memory/
├── MemoryModeToggle.tsx         # Auto/Manual selector
├── AutoSaveToast.tsx            # 3s undo toast
├── MemoryConfirmationPanel.tsx  # Full memory management
└── MemoryViewer.tsx             # Memory display
```

---

## API Reference

### 13 Endpoints

#### Health
```
GET /api/memory/health
Response: { ok: true, storage: "pgvector" }
```

#### Core Memory Operations

**Store Memory (Manual)**
```
POST /api/memory
Body: { userId, content, type, sourceThreadId?, importanceScore? }
Response: { id, stored: true }
```

**List Memories**
```
GET /api/memory/list/:userId
Response: { memories: [...] }
```

**Delete Memory**
```
DELETE /api/memory/:id
Body: { userId }
Response: { deleted: true }
```

**Search Memories**
```
POST /api/memory/search
Body: { userId, query, limit? }
Response: { results: [...] }
```

#### Auto-Save Mode

**Auto-Save with Extract**
```
POST /api/memory/autosave
Body: { userId, message, threadId? }
Response: { saved: [...], duplicates: [...] }
```

**Undo (3s window)**
```
POST /api/memory/undo/:id
Body: { userId }
Response: { success: true } | { error: "Expired or not found" }
```

#### Manual Mode

**Preview Memories**
```
POST /api/memory/preview
Body: { userId, message, threadId? }
Response: { pending: [...], duplicates: [...] }
```

**Get Pending Confirmations**
```
GET /api/memory/confirmations/:userId
Response: { confirmations: [...] }
```

**Confirm Memory**
```
POST /api/memory/confirmations/:id/confirm
Body: { userId }
Response: { success: true }
```

**Reject Memory**
```
POST /api/memory/confirmations/:id/reject
Body: { userId }
Response: { success: true }
```

#### Context Retrieval

**Build Context (POST)**
```
POST /api/memory/context
Body: { userId, query, maxChars? }
Response: { context: "About this person:\n- ...", sources: [...] }
```

**Build Context (GET)**
```
GET /api/memory/context/:userId?q=query&max=2000
Response: { context: "...", sources: [...] }
```

---

## Database Schema

### memories
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- fact, preference, emotion, event, goal, relationship, struggle
  embedding vector(1536), -- optional, graceful degradation
  embedding_provider TEXT,
  importance_score FLOAT DEFAULT 0.5,
  confidence_score FLOAT DEFAULT 0.8,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  decay_rate FLOAT DEFAULT 0.0,
  user_verified BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  source_thread_id TEXT,
  source_message_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### memory_confirmations (Manual Mode)
```sql
CREATE TABLE memory_confirmations (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  source_thread_id TEXT,
  source_message_id TEXT,
  confidence_score FLOAT,
  status TEXT DEFAULT 'pending', -- pending, confirmed, rejected
  memory_id UUID REFERENCES memories(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## User Flow

### Auto-Save Mode (Default)

```
1. User sends: "My name is Alex and I love coffee"
         ↓
2. Frontend calls POST /api/memory/autosave
         ↓
3. Backend extracts facts:
   - "Name is Alex" (fact)
   - "Loves coffee" (preference)
         ↓
4. Memories stored to DB
         ↓
5. AutoSaveToast shows:
   "2 memories saved - Undo (3s)"
         ↓
6a. User clicks UNDO → DELETE /api/memory/:id
6b. No action → Memories kept after 3s
```

### Manual Mode

```
1. User toggles to "Manual" in Memory Panel
         ↓
2. User sends: "I prefer tea over coffee"
         ↓
3. Frontend calls POST /api/memory/preview
         ↓
4. Memory staged in memory_confirmations
         ↓
5. MemoryConfirmationPanel shows pending
         ↓
6. User reviews and clicks Confirm/Reject
         ↓
7. Memory moved to memories or deleted
```

### Context Retrieval in Chat

```
1. User asks: "What's my name?"
         ↓
2. Backend receives query
         ↓
3. Retrieves context:
   POST /api/memory/context
   { userId, query: "What's my name?" }
         ↓
4. Returns: { context: "About this person:\n- Name is Alex\n" }
         ↓
5. Context prepended to LLM prompt
         ↓
6. ZAKI responds: "Your name is Alex!"
```

---

## Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/zaki_db

# Embeddings (optional - graceful degradation)
NOVA_TYP_KEY=your_key
NOVA_TYP_BASE_URL=https://api.openai.com/v1

# Server
PORT=8787
```

### Frontend Mode Toggle
- Stored in `localStorage` key: `zaki-memory-mode`
- Values: `"autosave"` | `"manual"`
- Default: `"autosave"`

---

## Testing

### Quick Validation
```bash
# Health
curl http://localhost:8787/api/memory/health

# Auto-save
curl -X POST http://localhost:8787/api/memory/autosave \
  -H "Content-Type: application/json" \
  -d '{"userId":"test@test.com","message":"My name is Test"}'

# Check memories
curl http://localhost:8787/api/memory/list/test@test.com

# Context
curl -X POST http://localhost:8787/api/memory/context \
  -H "Content-Type: application/json" \
  -d '{"userId":"test@test.com","query":"name"}'
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Memories not saving | `authUser.email` vs `authUser.username` | Check user field mapping |
| Toggle not showing | MemoryModeToggle import missing | Verify import in MemoryConfirmationPanel |
| Context not injecting | buildContext not called | Check chat message handler |
| Port 8787 in use | Zombie process | `pkill -9 node` and restart |
| Undo not working | Buffer expired | Must click within 3 seconds |

---

## Security Notes

- ✅ All mutations require `userId` in body
- ✅ Database queries parameterized (`$1`, `$2`)
- ✅ Undo validates `bufferEntry.userId === userId`
- ✅ Delete uses `WHERE id=$1 AND user_id=$2`
- ✅ No raw SQL concatenation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v0.9-Beta | 2026-02-04 | Initial production release - dual mode, 3s undo, context injection |

---

*Document locked: 2026-02-04*
*Do not modify without approval*
