# 🧠 ZAKI Memory Pipeline Audit Report

**Generated:** February 3, 2026  
**Auditor:** OpenClaw AI (GPT-OSS via Claude Opus 4.5)  
**Objective:** Build S-tier user retention through meaningful memory connections

---

## Executive Summary

ZAKI has a **solid B+ memory foundation** that handles basic extraction, storage, and retrieval. However, it's missing the **emotional depth**, **proactive intelligence**, and **reinforcement loops** that create the addictive "this AI actually knows me" experience that drives S-tier retention.

**Current State:** Reactive memory system → **Target State:** Proactive relationship engine

**Key Finding:** The gap isn't in the technology—it's in the *philosophy*. ZAKI treats memory as a lookup table. S-tier apps treat memory as a *relationship*.

---

## Table of Contents

1. [Current Pipeline Analysis](#1-current-pipeline-analysis)
2. [Critical Gaps](#2-critical-gaps)
3. [S-Tier Recommendations](#3-s-tier-recommendations)
4. [Implementation Priorities](#4-implementation-priorities)
5. [Technical Appendix](#5-technical-appendix)

---

## 1. Current Pipeline Analysis

### 1.1 Extraction Stage

**What It Does:**
```
User Message → LLM (Qwen 2.5-7B) → Extract {facts, preferences} → Store
```

**Current Implementation (memory.js:386-464):**
```javascript
const systemPrompt = `Extract facts and preferences from user messages. Be strict and precise.
Output JSON with this exact structure:
{
  "facts": ["fact 1", "fact 2"],
  "preferences": ["preference 1", "preference 2"]
}`;
```

**Strengths:**
- ✅ Uses proper LLM extraction (not just regex)
- ✅ Has pattern-matching fallback
- ✅ Validates against empty/incomplete statements
- ✅ Deduplication via content hash

**Weaknesses:**
- ❌ **Only extracts facts/preferences** — misses emotions, relationships, goals, fears
- ❌ **No confidence scoring** — treats all extractions equally
- ❌ **No source attribution** — can't trace back to original conversation
- ❌ **No temporal awareness** — "I'm learning React" should decay; "My birthday is May 15" shouldn't
- ❌ **No contradiction detection** — "I love TypeScript" + "I hate TypeScript" = both stored

**Example of What's Missed:**
```
User: "I've been so stressed about this product launch. My team is working 16-hour days."

Current extraction: 
  facts: ["Working on product launch"]
  
S-tier extraction:
  facts: ["Working on product launch", "Has a team"]
  emotions: ["Stressed", "Exhausted"]
  context: ["High-pressure period", "Deadline approaching"]
  relationship_signals: ["Values team", "Feels responsible for team welfare"]
```

### 1.2 Storage Stage

**What It Does:**
```
Memory → Vector Embedding (384/768 dims) → pgvector → Dedup Check → Store
```

**Current Schema (inferred from memory.js):**
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(16) NOT NULL,
  type VARCHAR(20) NOT NULL,  -- fact, preference, episode, context, action
  embedding VECTOR(384),
  embedding_provider VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP
);
```

**Strengths:**
- ✅ pgvector for semantic search (fast!)
- ✅ Content hash for dedup
- ✅ Metadata field for extensibility
- ✅ In-memory fallback for dev

**Weaknesses:**
- ❌ **No importance ranking** — "Name is Alaa" is as weighted as "Uses VS Code"
- ❌ **No decay mechanism** — old memories stay forever with same priority
- ❌ **No relationship graph** — can't connect related memories
- ❌ **No confidence score** — can't distinguish strong vs weak memories
- ❌ **No versioning** — "I work at Google" → "I work at Meta" doesn't update

**Missing Schema Fields:**
```sql
-- S-tier additions
importance_score FLOAT DEFAULT 0.5,    -- How important is this memory?
confidence_score FLOAT DEFAULT 0.8,    -- How sure are we about this?
last_accessed_at TIMESTAMP,            -- For reinforcement
access_count INT DEFAULT 0,            -- Usage frequency
source_thread_id VARCHAR,              -- Traceability
source_message_id VARCHAR,
parent_memory_id UUID,                 -- For relationships
decay_rate FLOAT DEFAULT 0.0,          -- Time-based decay (0 = never)
verified_by_user BOOLEAN DEFAULT FALSE -- User confirmation
```

### 1.3 Retrieval Stage

**What It Does:**
```
User Query → Embed → Cosine Similarity Search → Top K Results → Filter by minScore
```

**Current Implementation (memory.js:147-197):**
```javascript
async function searchMemories({ userId, query, limit = 5, minScore = 0.3 }) {
  const vectorStr = `[${queryEmb.join(",")}]`;
  const rows = await dbAll(
    `SELECT id, content, type, metadata, created_at,
            1 - (embedding <=> $1::vector) as score
     FROM memories
     WHERE user_id = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorStr, userId, limit * 2]
  );
  // ... filter by minScore
}
```

**Strengths:**
- ✅ Semantic search (not just keyword matching)
- ✅ Score filtering for relevance
- ✅ Over-fetches then filters (smart!)

**Weaknesses:**
- ❌ **Pure similarity-based** — no recency boost, no importance weighting
- ❌ **No hybrid search** — can't combine "exact match" + "semantic"
- ❌ **No context-aware retrieval** — doesn't know conversation flow
- ❌ **Fixed limit** — doesn't adapt based on available context window

**S-tier Retrieval Formula:**
```
final_score = (
  semantic_similarity * 0.4 +
  importance_score * 0.25 +
  recency_boost * 0.15 +      # Higher for recent memories
  access_frequency * 0.1 +    # Higher for frequently accessed
  user_verified * 0.1         # Higher if user confirmed
)
```

### 1.4 Usage Stage (Context Injection)

**What It Does:**
```
Retrieved Memories → Format as Context → Prepend to User Message → Send to LLM
```

**Current Implementation (memory.js:199-284 + index.js:541-603):**
```javascript
enrichedMessage = `[About this person — use naturally, don't quote verbatim]
${memoryResult.context}

---

${originalMessage}`;
```

**Context Format:**
```
You're chatting with Alaa.
Background: Works as software developer
Location: Based in Germany
Preferences: Prefers TypeScript over JavaScript

Use this context naturally. Be a friend who knows them, not a database.
```

**Strengths:**
- ✅ Human-readable format
- ✅ Clear instruction to use naturally
- ✅ Categorized by type (facts, prefs, location)

**Weaknesses:**
- ❌ **No emotional context** — doesn't include mood, recent struggles
- ❌ **No conversational memory** — only fact-based
- ❌ **No relationship depth indicators** — how long have we known each other?
- ❌ **No proactive prompts** — doesn't suggest follow-ups
- ❌ **Static format** — same format regardless of conversation type

---

## 2. Critical Gaps

### 2.1 🔴 Gap #1: No Emotional Memory (P0)

**Impact:** Massive retention loss

Users don't remember what you said. They remember **how you made them feel**.

**Current State:** Only stores facts and preferences.

**Missing:**
- Mood detection per conversation
- Emotional trajectory tracking
- Stress/excitement/frustration signals
- Life events (promotion, breakup, new baby)
- Win celebrations and failure support

**Evidence from code (memory.js:536-541):**
```javascript
mood: analysis.mood,  // Stored but NEVER used in retrieval or injection
```

The mood IS extracted during summarization, but it's buried in metadata and never surfaced.

**S-tier Example:**
```
User: "I got the job!"

ZAKI (current): "Congratulations on the new position!"

ZAKI (S-tier): "YES!! After all those interviews and that stressful 
waiting period, you DID IT! 🎉 I remember how nervous you were before 
that final round. How are you feeling right now?"
```

### 2.2 🔴 Gap #2: No Proactive Memory Usage (P0)

**Impact:** Missed engagement opportunities

The system **only uses memory when asked**. S-tier apps **surprise users** with remembered context.

**Current Flow:**
```
User speaks → ZAKI retrieves relevant memories → ZAKI responds
```

**S-tier Flow:**
```
User speaks → ZAKI retrieves + checks for proactive opportunities → ZAKI responds with surprises

// Proactive triggers:
- "It's been a week since you mentioned the presentation. How did it go?"
- "Hey, I noticed you haven't mentioned the React project. Still working on it?"
- "Remember when you said you wanted to learn Rust? I found a great tutorial..."
```

**Missing Code Path:**
There's NO scheduled check for:
- Upcoming events mentioned in past conversations
- Follow-ups on ongoing projects
- Birthday/anniversary reminders
- "It's been X days since we talked about Y"

### 2.3 🟠 Gap #3: No Memory Reinforcement Loops (P1)

**Impact:** Memories feel static, not alive

Users should feel like the relationship is **growing**, not just being recalled.

**Missing Mechanics:**
1. **Access tracking** — Which memories are actually useful?
2. **Feedback signals** — Did the user correct a memory?
3. **Confirmation prompts** — "Is it still true that you're at Google?"
4. **Memory decay** — Old, unused memories should fade
5. **Memory strengthening** — Frequently accessed memories should rise

**Current State:** Memories are written once, read many, never evolved.

### 2.4 🟠 Gap #4: No Memory Visualization (P1)

**Impact:** Users don't see the value of memory

Users can't see what ZAKI remembers. Memory is a **black box**.

**Current State (from README):**
> ✅ Memory viewer - Browse, search, delete memories

But this is just a list. S-tier visualization:
- **Memory timeline** — See how your relationship evolved
- **Memory graph** — See connections between memories
- **Memory insights** — "You've mentioned 'startup' 47 times"
- **Memory themes** — Cluster memories by topic
- **Memory gaps** — "I don't know much about your hobbies"

### 2.5 🟡 Gap #5: No Cross-Session Continuity (P2)

**Impact:** Conversations feel disconnected

**Current State (index.js:646-681):**
Session summarization exists but only stores episode summaries. There's no:
- "Last time we talked about..." opening
- Conversation resumption hints
- Thread-level memory (what was THIS conversation about?)

### 2.6 🟡 Gap #6: No Memory Relationships (P2)

**Impact:** Isolated facts don't build understanding

**Current:** Each memory is an island.

**S-tier:** Memories form a knowledge graph.

```
[Works at Google] ←── employed_by ──→ [Company: Google]
       ↓
   [Team: Search]
       ↓
   [Project: SGE]
       ↓
   [Stressed about deadline] ←── caused_by ──→ [Product launch Q4]
```

---

## 3. S-Tier Recommendations

### 3.1 🧠 Emotional Memory Layer

**Goal:** Remember feelings, not just facts.

**Implementation:**

```javascript
// New memory types
type MemoryType = 
  | 'fact'           // Existing
  | 'preference'     // Existing
  | 'episode'        // Existing
  | 'emotion'        // NEW: "User was stressed"
  | 'event'          // NEW: "User got promoted"
  | 'goal'           // NEW: "User wants to learn Rust"
  | 'relationship'   // NEW: "User has a sister named Mira"
  | 'struggle';      // NEW: "User is dealing with imposter syndrome"
```

**Extraction Prompt Enhancement:**
```javascript
const systemPrompt = `Extract memories from user messages. Be observant and empathetic.

Output JSON:
{
  "facts": ["objective statements about the user"],
  "preferences": ["likes, dislikes, opinions"],
  "emotions": ["feelings expressed or implied"],
  "events": ["life events mentioned (job change, move, etc)"],
  "goals": ["things they want to achieve"],
  "relationships": ["people mentioned and their relation"],
  "struggles": ["challenges or problems they're facing"],
  "tone": "excited|neutral|stressed|sad|frustrated"
}

Rules:
- Read between the lines. "I've been working late" implies stress.
- Note life events even if mentioned casually.
- Track goals explicitly and implicitly stated.
- Relationships include pets, projects, hobbies.
```

### 3.2 🔮 Proactive Memory Engine

**Goal:** Surface memories before the user asks.

**Implementation:**

```javascript
// New proactive triggers table
CREATE TABLE memory_triggers (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  memory_id UUID REFERENCES memories(id),
  trigger_type VARCHAR NOT NULL,  -- 'follow_up', 'anniversary', 'check_in', 'reminder'
  trigger_date TIMESTAMP,
  trigger_condition JSONB,        -- Custom conditions
  fired BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);

// Examples:
// - Follow up on "presentation next week" → 8 days later
// - Check in on "starting new job" → 2 weeks later
// - Anniversary of "started learning Python" → 1 year later
// - Reminder for "need to call mom more often" → 1 week later
```

**Proactive Check Function:**
```javascript
async function getProactiveOpportunities(userId) {
  const triggers = await db.query(`
    SELECT t.*, m.content 
    FROM memory_triggers t
    JOIN memories m ON m.id = t.memory_id
    WHERE t.user_id = $1 
    AND t.trigger_date <= NOW()
    AND t.fired = FALSE
    ORDER BY t.trigger_date
    LIMIT 3
  `, [userId]);
  
  return triggers.rows.map(t => ({
    type: t.trigger_type,
    memory: t.content,
    suggested_opener: generateOpener(t)
  }));
}

function generateOpener(trigger) {
  switch (trigger.trigger_type) {
    case 'follow_up':
      return `Hey! A while back you mentioned "${trigger.content.slice(0,50)}..." — how did that go?`;
    case 'check_in':
      return `I remember you were dealing with ${trigger.content}. How's that going?`;
    case 'anniversary':
      return `Fun fact: It's been a year since you started ${trigger.content}! 🎉`;
  }
}
```

### 3.3 ⚡ Memory Reinforcement System

**Goal:** Memories should strengthen with use and fade with time.

**Implementation:**

```sql
-- Add to memories table
ALTER TABLE memories ADD COLUMN importance_score FLOAT DEFAULT 0.5;
ALTER TABLE memories ADD COLUMN access_count INT DEFAULT 0;
ALTER TABLE memories ADD COLUMN last_accessed_at TIMESTAMP;
ALTER TABLE memories ADD COLUMN decay_rate FLOAT DEFAULT 0.01;
ALTER TABLE memories ADD COLUMN user_verified BOOLEAN DEFAULT FALSE;
```

```javascript
// On memory access
async function accessMemory(memoryId) {
  await db.query(`
    UPDATE memories 
    SET access_count = access_count + 1,
        last_accessed_at = NOW(),
        importance_score = LEAST(1.0, importance_score + 0.05)
    WHERE id = $1
  `, [memoryId]);
}

// Periodic decay (run daily)
async function decayMemories() {
  await db.query(`
    UPDATE memories 
    SET importance_score = GREATEST(0.1, importance_score * (1 - decay_rate))
    WHERE last_accessed_at < NOW() - INTERVAL '30 days'
    AND user_verified = FALSE
    AND type NOT IN ('fact', 'relationship')  -- Core identity doesn't decay
  `);
}

// S-tier retrieval with reinforcement
async function searchMemoriesEnhanced({ userId, query, limit = 10 }) {
  const { embeddings } = await getEmbeddings(query);
  const queryEmb = embeddings[0];
  const vectorStr = `[${queryEmb.join(",")}]`;
  
  const rows = await db.query(`
    SELECT 
      id, content, type, metadata, created_at, importance_score, access_count,
      1 - (embedding <=> $1::vector) as semantic_score,
      -- Composite scoring
      (
        (1 - (embedding <=> $1::vector)) * 0.4 +          -- Semantic similarity
        importance_score * 0.25 +                          -- Importance
        CASE WHEN last_accessed_at > NOW() - INTERVAL '7 days' 
             THEN 0.15 ELSE 0.05 END +                     -- Recency boost
        LEAST(0.1, access_count * 0.01) +                  -- Frequency (capped)
        CASE WHEN user_verified THEN 0.1 ELSE 0 END        -- User verified
      ) as final_score
    FROM memories
    WHERE user_id = $2
    ORDER BY final_score DESC
    LIMIT $3
  `, [vectorStr, userId, limit]);
  
  // Mark accessed memories
  for (const row of rows.rows) {
    await accessMemory(row.id);
  }
  
  return rows.rows;
}
```

### 3.4 📊 Memory Visualization API

**Goal:** Let users see their memory landscape.

**New Endpoints:**

```javascript
// GET /api/memory/insights/:userId
app.get("/api/memory/insights/:userId", async (req, res) => {
  const { userId } = req.params;
  
  const stats = await db.query(`
    SELECT 
      COUNT(*) as total_memories,
      COUNT(*) FILTER (WHERE type = 'fact') as facts,
      COUNT(*) FILTER (WHERE type = 'preference') as preferences,
      COUNT(*) FILTER (WHERE type = 'emotion') as emotions,
      COUNT(*) FILTER (WHERE type = 'goal') as goals,
      MIN(created_at) as first_memory,
      AVG(importance_score) as avg_importance,
      SUM(access_count) as total_accesses
    FROM memories 
    WHERE user_id = $1
  `, [userId]);
  
  const topTopics = await db.query(`
    SELECT 
      LOWER(word) as topic,
      COUNT(*) as mentions
    FROM memories, 
         LATERAL unnest(string_to_array(content, ' ')) AS word
    WHERE user_id = $1 
    AND LENGTH(word) > 4
    GROUP BY LOWER(word)
    ORDER BY mentions DESC
    LIMIT 10
  `, [userId]);
  
  const memoryGaps = identifyGaps(stats.rows[0]);
  
  res.json({
    stats: stats.rows[0],
    topTopics: topTopics.rows,
    gaps: memoryGaps,
    relationshipAge: daysSince(stats.rows[0].first_memory)
  });
});

function identifyGaps(stats) {
  const gaps = [];
  if (stats.goals < 2) gaps.push("I don't know much about your goals");
  if (stats.preferences < 3) gaps.push("Tell me more about your preferences");
  if (stats.emotions < 1) gaps.push("I'd love to understand how you're feeling");
  return gaps;
}
```

### 3.5 💬 Context-Aware Injection

**Goal:** Different conversations need different memory emphasis.

**Implementation:**

```javascript
async function buildContextEnhanced({ userId, query, conversationType }) {
  // Detect conversation type if not provided
  const type = conversationType || detectConversationType(query);
  
  // Adjust retrieval based on type
  const searchConfig = {
    'technical': { 
      types: ['fact', 'preference', 'context'],
      maxChars: 1500,
      style: 'concise'
    },
    'personal': {
      types: ['fact', 'preference', 'emotion', 'relationship', 'goal'],
      maxChars: 2000,
      style: 'warm'
    },
    'venting': {
      types: ['emotion', 'struggle', 'relationship'],
      maxChars: 1000,
      style: 'supportive'
    },
    'celebration': {
      types: ['event', 'goal', 'emotion'],
      maxChars: 1000,
      style: 'enthusiastic'
    }
  };
  
  const config = searchConfig[type] || searchConfig.personal;
  
  const memories = await searchMemoriesEnhanced({
    userId,
    query,
    types: config.types,
    limit: 15
  });
  
  return formatContextByStyle(memories, config.style);
}

function formatContextByStyle(memories, style) {
  switch (style) {
    case 'concise':
      return `[User context]\n${memories.map(m => `- ${m.content}`).join('\n')}`;
    
    case 'warm':
      const name = memories.find(m => /name/i.test(m.content));
      return `You're talking with ${name?.content || 'a friend'}. 
Here's what you know about them:
${memories.map(m => `• ${m.content}`).join('\n')}

Be warm and personal. Reference shared history naturally.`;
    
    case 'supportive':
      return `Your friend is going through something. Here's context:
${memories.filter(m => m.type === 'emotion' || m.type === 'struggle').map(m => `• ${m.content}`).join('\n')}

Be empathetic. Don't problem-solve unless asked. Listen first.`;
    
    case 'enthusiastic':
      return `Time to celebrate! Here's what you know:
${memories.map(m => `• ${m.content}`).join('\n')}

Be genuinely excited. Reference their journey if possible.`;
  }
}
```

### 3.6 🔄 Conversation Continuity

**Goal:** Every new conversation feels like resuming a friendship.

**Implementation:**

```javascript
// On conversation start, generate opening context
async function generateConversationOpener(userId, threadId) {
  const lastConvo = await db.query(`
    SELECT content, metadata FROM memories 
    WHERE user_id = $1 AND type = 'episode'
    ORDER BY created_at DESC LIMIT 1
  `, [userId]);
  
  const proactiveOpportunities = await getProactiveOpportunities(userId);
  const recentMood = await getRecentMood(userId);
  
  return {
    lastTopic: lastConvo.rows[0]?.content,
    proactive: proactiveOpportunities,
    mood: recentMood,
    suggestedGreeting: generateGreeting(lastConvo.rows[0], recentMood)
  };
}

function generateGreeting(lastConvo, mood) {
  if (mood === 'stressed') {
    return "Hey! How are you holding up?";
  }
  if (lastConvo?.metadata?.action_items?.length) {
    return `Hey! Last time we talked about ${lastConvo.content.slice(0, 30)}... any updates?`;
  }
  return "Hey! What's on your mind today?";
}
```

---

## 4. Implementation Priorities

### P0 - Critical (Week 1-2)

| Item | Effort | Impact | Description |
|------|--------|--------|-------------|
| Enhanced Extraction Types | 3 days | 🔥🔥🔥 | Add emotions, goals, struggles, events |
| Importance Scoring | 2 days | 🔥🔥🔥 | Rank memories by importance |
| Mood Surface in Context | 1 day | 🔥🔥 | Use already-extracted mood in injection |
| Access Tracking | 1 day | 🔥🔥 | Track which memories are useful |

### P1 - High (Week 3-4)

| Item | Effort | Impact | Description |
|------|--------|--------|-------------|
| Proactive Triggers Table | 3 days | 🔥🔥🔥 | Schedule follow-ups |
| Enhanced Retrieval Scoring | 2 days | 🔥🔥🔥 | Composite scoring formula |
| Memory Decay System | 2 days | 🔥🔥 | Fade unused memories |
| Context-Aware Injection | 3 days | 🔥🔥 | Different styles for different moods |

### P2 - Medium (Month 2)

| Item | Effort | Impact | Description |
|------|--------|--------|-------------|
| Memory Insights API | 3 days | 🔥🔥 | Stats, gaps, timeline |
| Memory Graph Relations | 5 days | 🔥🔥 | Connect related memories |
| Conversation Opener | 2 days | 🔥 | Smart greetings based on context |
| User Verification UI | 2 days | 🔥 | Let users confirm/correct memories |

### P3 - Nice to Have (Quarter 2)

| Item | Effort | Impact | Description |
|------|--------|--------|-------------|
| Memory Timeline View | 5 days | 🔥 | Visual journey of relationship |
| Cross-Conversation Search | 3 days | 🔥 | "What did we talk about last month?" |
| Memory Export/Import | 2 days | 🔥 | Data portability |
| Collaborative Memory | 10 days | 🔥 | Share memories across team |

---

## 5. Technical Appendix

### 5.1 Database Migration Script

```sql
-- Run this to upgrade the memory schema

BEGIN;

-- New columns for existing memories table
ALTER TABLE memories ADD COLUMN IF NOT EXISTS importance_score FLOAT DEFAULT 0.5;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0.8;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS access_count INT DEFAULT 0;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS decay_rate FLOAT DEFAULT 0.01;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS user_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_thread_id VARCHAR;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_message_id VARCHAR;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS parent_memory_id UUID;

-- Update type enum to include new types
-- (PostgreSQL doesn't easily alter enums, so we use a check constraint instead)
ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_type_check;
ALTER TABLE memories ADD CONSTRAINT memories_type_check 
  CHECK (type IN ('fact', 'preference', 'episode', 'context', 'action', 
                  'emotion', 'event', 'goal', 'relationship', 'struggle'));

-- New proactive triggers table
CREATE TABLE IF NOT EXISTS memory_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  trigger_type VARCHAR NOT NULL CHECK (trigger_type IN ('follow_up', 'anniversary', 'check_in', 'reminder')),
  trigger_date TIMESTAMP NOT NULL,
  trigger_condition JSONB,
  fired BOOLEAN DEFAULT FALSE,
  fired_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_triggers_user_date 
  ON memory_triggers(user_id, trigger_date) 
  WHERE fired = FALSE;

-- New memory relationships table  
CREATE TABLE IF NOT EXISTS memory_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  target_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  relation_type VARCHAR NOT NULL,  -- 'caused_by', 'related_to', 'contradicts', 'supersedes'
  confidence FLOAT DEFAULT 0.8,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_relations_source ON memory_relations(source_id);
CREATE INDEX IF NOT EXISTS idx_memory_relations_target ON memory_relations(target_id);

-- Update importance score for existing memories based on type
UPDATE memories SET importance_score = CASE
  WHEN type = 'fact' THEN 0.8
  WHEN type = 'preference' THEN 0.7
  WHEN type = 'episode' THEN 0.4
  WHEN type = 'context' THEN 0.3
  ELSE 0.5
END WHERE importance_score = 0.5;

COMMIT;
```

### 5.2 Enhanced Extraction Prompt

```javascript
const ENHANCED_EXTRACTION_PROMPT = `You are a memory extraction system for a personal AI assistant. 
Your job is to identify meaningful information that would help the AI know the user better.

Extract information into these categories:

{
  "facts": ["Objective, verifiable statements about the user"],
  "preferences": ["Opinions, likes, dislikes, preferred ways of doing things"],
  "emotions": ["Current feelings, mood, emotional state - read between the lines"],
  "events": ["Life events: job changes, moves, milestones, achievements, losses"],
  "goals": ["Explicit or implicit objectives, things they want to do/learn/become"],
  "relationships": ["People mentioned: name, relation (friend, boss, sister, pet name)"],
  "struggles": ["Challenges, problems, frustrations, things causing stress"],
  "follow_ups": ["Things to check in about later - deadlines, decisions, waiting for news"]
}

Guidelines:
1. Be observant - "I've been working late" implies stress/overwork
2. Note life events even if casual - "We just moved" is significant
3. Track relationship context - "My team lead Sarah" → relationship:work
4. Identify implicit goals - "I should really learn TypeScript" is a goal
5. Detect struggles - "This project is driving me crazy" is a struggle
6. Create follow-ups - "My interview is Friday" → follow up next week
7. Be concise - max 15 words per item
8. Skip empty categories - only include what's actually present
9. Avoid duplicating - if something is a fact AND a goal, prefer the more specific category
10. Context matters - extract based on what would help future conversations

Return valid JSON only. No explanation text.`;
```

### 5.3 Key Performance Metrics

Track these to measure memory system effectiveness:

```javascript
const MEMORY_METRICS = {
  // Usage metrics
  memoriesExtractedPerConversation: 'avg',
  memoriesUsedPerResponse: 'avg',
  memoryAccessRate: 'count per day',
  
  // Quality metrics
  userCorrectionRate: 'corrections / total memories',
  memoryRelevanceScore: 'avg semantic similarity of used memories',
  duplicateRate: 'duplicates / total extractions',
  
  // Engagement metrics
  returnUserRate: 'users who return within 7 days',
  conversationLength: 'avg messages per session',
  proactiveEngagement: 'users who respond to proactive prompts',
  
  // Memory health
  avgMemoriesPerUser: 'total / users',
  memoryGrowthRate: 'new memories per week',
  memoryDecayRate: 'memories below 0.2 importance',
  oldestActiveMemory: 'avg age of accessed memories'
};
```

---

## Conclusion

ZAKI's memory system has a **solid foundation** but is **playing it safe**. The gap between B+ and S-tier isn't technical—it's philosophical:

| B+ (Current) | S-Tier (Target) |
|--------------|-----------------|
| Memory as lookup table | Memory as relationship |
| Reactive retrieval | Proactive surprises |
| Facts only | Facts + feelings |
| Static memories | Living, evolving memories |
| Black box | Transparent, visual |
| One-size-fits-all | Context-aware adaptation |

**The core insight:** Users don't fall in love with AI because it remembers facts. They fall in love because it **notices**, **cares**, and **follows up**. That's the difference between a database and a friend.

**Next Step:** Implement P0 items (enhanced extraction, importance scoring, mood surfacing) in the next 2 weeks. These alone will noticeably improve the "this AI knows me" feeling.

---

*Report generated by OpenClaw AI. For questions or implementation support, reference this document.*
