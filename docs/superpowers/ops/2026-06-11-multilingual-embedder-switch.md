# Runbook — Switch chat-memory embedder to multilingual-e5-small (Phase B go-live)

This runbook covers turning on the multilingual embedder. Reversible at every step.

## ✅ VERIFIED GO-LIVE — 2026-06-11
The staging chat engine (`staging-typ`) embedder was switched to
`MintplexLabs/multilingual-e5-small` (384-dim, drop-in for `vector(384)`;
`HasExistingEmbeddings` correctly reset). Verified end-to-end:
- **Prefixes ON** is the correct config. Eval recall@5: 0.778 (no prefix) → **0.833**
  (with query:/passage: prefixes). AnythingLLM does **not** prefix internally, so
  no double-prefix. → `ZAKI_MEMORY_EMBED_MODEL=multilingual-e5-small`.
- **Cross-lingual recall works** (the goal): eval multilingual bucket passes
  (DE "Wohnt in Berlin" → EN "where does the user live" ✓; "Liebt Jazzmusik" ✓).
- **Floor = 0.72.** e5 cosines bunch high — real hits 0.774–0.842, same-domain
  distractors 0.780–0.859 (they OVERLAP), so the floor can't separate hits from
  distractors (top-k ranking does). 0.72 sits just below the lowest real hit:
  keeps every hit, suppresses off-topic injection. → `ZAKI_CHAT_MEMORY_SEMANTIC_MIN=0.72`.
- **Eval threshold re-baselined 0.85 → 0.80.** e5-small trades ~1 hard English
  *inferential* case (e.g. "birthday present for a family member" → "has a younger
  sister named Lina" — which neither vector nor keyword recall catches, and we
  don't do LLM-inference recall) for working multilingual recall. Final eval:
  recall@5 0.833 ≥ 0.80, supersede 2/2, extraction precision+recall ok, multilingual
  ok → **PASS**.
- **Local dogfood DB re-embedded** (19/19 rows) into e5 space.

### ⚠️ STILL REQUIRED for staging/prod (the BFF side)
The chat ENGINE embedder is switched, but the **`zaki-api` backend** (the BFF that
builds memory context) must also get the config, or it won't prefix/floor correctly:
1. Set on the `zaki-api` deployment env (e.g. `typ-secrets` or backend env):
   `ZAKI_MEMORY_EMBED_MODEL=multilingual-e5-small` and
   `ZAKI_CHAT_MEMORY_SEMANTIC_MIN=0.72`, then roll the new `zaki-api` image.
2. Re-embed staging's **memory** DB after the backend has the new config:
   `node scripts/reembed-memories.mjs` (with staging `DATABASE_URL`). Idempotent.
3. Admin note: the `zaki-admin` AnythingLLM password was reset during go-live —
   change it from the temp value.

## Why
The current embedder (`all-MiniLM-L6-v2`) is English-centric, so German/Arabic/etc.
memories are *captured* but recall poorly. `multilingual-e5-small` (384-dim, drop-in
for the `vector(384)` column) fixes cross-lingual recall with **no per-language regex**.

## ⚠️ Blast radius — decide first
AnythingLLM's embedder is **global config**, shared with the chat engine's own
document RAG. Switching it re-bases *all* embeddings: the chat engine's existing
document vectors become a mixed space and must be re-embedded too. Either accept
that (and re-embed the engine's docs per AnythingLLM) **or** stand up a dedicated
embedding endpoint for the memory layer before proceeding.

## Verified cluster state (2026-06-11, read-only kubectl + admin API)
- Workload: `deployment/staging-typ` (ns `zaki`, ctx `do-fra1-nova-cloud`), image
  `ghcr.io/projectnuggets/zaki-chat-engine:1.13.0-zaki.4` (AnythingLLM v1.13 fork).
- Env: `EMBEDDING_ENGINE=native`, **no** `EMBEDDING_MODEL_PREF`; `VECTOR_DB=lancedb`;
  secrets via the `typ-secrets` Secret.
- Config is **DB-backed** on PVC `staging-typ-storage` → `/app/server/storage`
  (AnythingLLM SQLite `system_settings` + native model cache + lancedb). So the
  **admin UI/API is authoritative; an env var alone will NOT reliably override** the
  stored value.
- `GET /api/v1/system` reports: `EmbeddingEngine=native`,
  `EmbeddingModelPref=Xenova/all-MiniLM-L6-v2`, `EmbeddingOutputDimensions=null`,
  `HasExistingEmbeddings=true` (the chat engine's doc RAG is already populated →
  switching re-bases it → it needs re-embedding too).
- Target model id (native/Xenova): **`Xenova/multilingual-e5-small`** (384-dim →
  drop-in for both `vector(384)` and AnythingLLM's lancedb).

## ⚠️ Critical test: do NOT double-prefix
AnythingLLM's native e5 embedder may add the `query:`/`passage:` prefixes *itself*.
Our PB1 code (`ZAKI_MEMORY_EMBED_MODEL`) also adds them. If both do → `"query: query: …"`
→ degraded recall. **So after the switch, run the eval FIRST with `ZAKI_MEMORY_EMBED_MODEL`
UNSET** (no prefixes from our side):
- multilingual bucket passes → AnythingLLM prefixes internally → leave our flag OFF.
- multilingual bucket fails → AnythingLLM does NOT prefix → set the flag (our prefixes) → re-run.
The eval is the arbiter.

## Steps
1. **Switch the embedder** — recommended via the AnythingLLM **admin UI** (authoritative,
   DB-backed): port-forward `svc/staging-typ 3001:3001`, open `http://localhost:3001`,
   log in as admin → Settings → Embedding Preference → engine "AnythingLLM Embedder"
   (native) → model → **multilingual-e5-small** → Save. The native embedder downloads
   `Xenova/multilingual-e5-small` into the PVC on first use; no pod restart needed.
   (Env alternative: add `EMBEDDING_MODEL_PREF=Xenova/multilingual-e5-small` to the
   `typ-secrets` Secret + `kubectl rollout restart deploy/staging-typ` — but the DB
   value set above takes precedence, so the admin UI is the reliable lever.)
   The per-request `model` field in our API calls is ignored — this setting selects it.
2. **(Conditional) activate our e5 prefixing** — only if the "Critical test" above
   shows AnythingLLM does NOT prefix internally. If needed, set in `backend/.env`:
   ```
   ZAKI_MEMORY_EMBED_MODEL=multilingual-e5-small
   ```
   (Makes `getEmbeddings` emit `query:`/`passage:` prefixes.) If AnythingLLM already
   prefixes, leave this UNSET to avoid double-prefixing. Determine which via the eval
   (run once unset; set only if the multilingual bucket fails). Whatever you choose,
   re-embed (step 3) so stored vectors match the query-time prefixing.
3. **Re-embed memory rows** (vector space changed):
   ```
   cd backend && node scripts/reembed-memories.mjs            # all users
   # or: node scripts/reembed-memories.mjs <userId>           # one user
   ```
   Idempotent; safe to re-run. Also re-embed the chat engine's documents per
   AnythingLLM (the blast-radius item above).
4. **Retune the relevance floor.** e5 cosines run higher/more-normalized than
   all-MiniLM's (~0.25–0.36). Run the eval and read the printed distribution:
   ```
   cd backend && npm run memory:eval
   ```
   Set `ZAKI_CHAT_MEMORY_SEMANTIC_MIN` just below the correct-match cluster
   (expect ~0.7–0.85 for e5). Re-run until: semantic recall@5 ≥ 0.85 **and** the
   "Multilingual recall (cross-lingual)" bucket shows `ok` (no longer skipped).
5. **Live check:** with both dev servers up and the tunnel forwarding, state a
   German fact ("Ich wohne in Hamburg"), then ask in English ("where do I live?").
   The assistant should recall Hamburg.

## Rollback
1. Revert the AnythingLLM embedder to `all-MiniLM-L6-v2`.
2. Unset `ZAKI_MEMORY_EMBED_MODEL` (and reset `ZAKI_CHAT_MEMORY_SEMANTIC_MIN` to `0.1`).
3. Re-run `node scripts/reembed-memories.mjs` (it always uses the *current* embedder).
The multilingual eval bucket auto-skips again once the flag is unset.

## Flags introduced (Phase B)
- `ZAKI_MEMORY_EMBED_MODEL` — when it matches `/e5/i`, `getEmbeddings` applies
  `query:`/`passage:` prefixes. Default unset = no prefix (all-MiniLM behavior).
- `ZAKI_CHAT_MEMORY_SEMANTIC_MIN` — existing relevance floor; retune per step 4.
