# Runbook — Switch chat-memory embedder to multilingual-e5-small (Phase B go-live)

Phase B code is merged and **inert** until you flip the cluster embedder + set the flag.
This runbook covers the manual steps that turn it on. Reversible at every step.

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

## Steps
1. **Switch the embedder** in AnythingLLM (admin → Embedding Preference) to
   `multilingual-e5-small`. The per-request `model` field is ignored — this admin
   setting is what actually selects the model.
2. **Activate e5 prefixing:** set in `backend/.env`:
   ```
   ZAKI_MEMORY_EMBED_MODEL=multilingual-e5-small
   ```
   (This makes `getEmbeddings` emit the required `query:` / `passage:` prefixes.
   Without it, e5 recall degrades; with it set but the cluster NOT on e5, recall
   also degrades — keep the flag and the cluster model in lockstep.)
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
