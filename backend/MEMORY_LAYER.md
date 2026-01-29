# ZAKI Memory Layer

Semantic memory storage and retrieval for the ZAKI AI chatbot.

## How It Works (User Experience)

### The Magic ✨

ZAKI now **remembers things about you** across conversations:

1. **You chat normally** - no special commands needed
2. **ZAKI learns** - when you mention preferences, facts about yourself, or ask it to remember something
3. **ZAKI recalls** - in future conversations, relevant memories are automatically injected

### Examples

| You say | ZAKI remembers |
|---------|---------------|
| "I prefer dark mode" | Preference: dark mode |
| "I work at a tech startup" | Fact: works at startup |
| "Remember that my dog's name is Max" | Fact: dog named Max |
| "I'm interested in machine learning" | Context: interested in ML |

### What Gets Remembered

- **Preferences**: "I prefer...", "I like...", "I don't like..."
- **Facts**: "My name is...", "I work at...", "I live in..."
- **Explicit requests**: "Remember that...", "Don't forget..."

### How Recall Works

When you send a message:
1. ZAKI searches your memories for relevant context
2. Matching memories are injected into the conversation
3. The AI uses this to personalize its response

**Example flow:**
```
You: "What editor should I use?"
↓
ZAKI finds: "User prefers vim for coding" (stored earlier)
↓
ZAKI responds with vim-aware recommendations
```

### Privacy

- Memories are stored per-user (email)
- Only you can access your memories
- Memories persist across sessions (with pgvector) or until server restart (in-memory)

## Quick Start

```bash
# Development
npm run dev

# Production (Docker)
docker build -t zaki-backend:latest .
docker run -p 8787:8787 --env-file .env zaki-backend:latest
```

## Configuration

Add to `.env`:

```env
# Required - NOVA.TYP (primary embedding provider)
NOVA_TYP_BASE_URL=https://typ.novanuggets.com
NOVA_TYP_API_KEY=your_api_key

# Optional - Together.ai (fallback if NOVA.TYP unavailable)
TOGETHER_API_KEY=tgp_v1_xxx
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memory/health` | Health check with provider status |
| POST | `/api/memory/store` | Store a memory fragment |
| POST | `/api/memory/search` | Semantic search |
| POST | `/api/memory/context` | Build LLM context injection |
| GET | `/api/memory/list/:userId` | List all memories for user |
| DELETE | `/api/memory/:id` | Delete a memory |

### Store Memory

```bash
curl -X POST http://localhost:8787/api/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "content": "User prefers dark mode",
    "type": "preference"
  }'
```

Memory types: `fact`, `preference`, `context`

### Search Memories

```bash
curl -X POST http://localhost:8787/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "query": "What are the user preferences?",
    "limit": 5,
    "minScore": 0.3
  }'
```

### Build Context for LLM

```bash
curl -X POST http://localhost:8787/api/memory/context \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "query": "Tell me about the user",
    "maxChars": 2000
  }'
```

Returns formatted context ready for system prompt injection.

## Embedding Providers

| Provider | Model | Dimensions | Priority |
|----------|-------|------------|----------|
| NOVA.TYP | all-MiniLM-L6-v2 | 384 | Primary |
| Together.ai | m2-bert-80M-8k-retrieval | 768 | Fallback |

The system automatically falls back to Together.ai if NOVA.TYP is unavailable.

⚠️ **Dimension Mismatch**: If you switch providers after storing memories, existing memories with different dimensions will be skipped during search. For production, stick with one provider.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Frontend  │────▶│   Backend    │────▶│   NOVA.TYP    │
│   (React)   │     │  (Express)   │     │  (embeddings) │
└─────────────┘     └──────────────┘     └───────────────┘
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐     ┌───────────────┐
                    │ Memory Store │     │  Together.ai  │
                    │  (in-memory) │     │  (fallback)   │
                    └──────────────┘     └───────────────┘
```

## Current Limitations

1. **In-Memory Storage**: Memories are lost on restart. For production, replace `memoryStore` Map with PostgreSQL + pgvector.

2. **No Auth on Memory Endpoints**: Currently uses `userId` from request body. Should validate against session token.

3. **No Rate Limiting**: Memory endpoints don't have rate limiting.

4. **Single Instance**: In-memory store doesn't sync across multiple instances.

## Production Checklist

- [ ] Replace in-memory store with PostgreSQL + pgvector
- [ ] Add authentication middleware to memory endpoints
- [ ] Add rate limiting
- [ ] Add memory expiry/TTL
- [ ] Integrate context injection into chat completions
- [ ] Add memory analytics/dashboard

## Testing

```bash
node test-memory.js
```

## Files

- `src/memory.js` - Memory layer implementation
- `src/index.js` - Express app with routes
- `src/db.js` - PostgreSQL connection (for users, not memories yet)
- `.env` - Configuration
- `Dockerfile` - Production build
