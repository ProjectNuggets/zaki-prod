-- Phase 04-typ-adapter: TYP-03
-- Drop typ_session_token column from zaki_sessions.
-- This column was used during Phase 1 (OATH-05) to store the TYP session token server-side.
-- Phase 4 removes TYP from the login path entirely; the column is no longer written or read.
-- This migration is IDEMPOTENT (IF EXISTS) — safe to run multiple times.
-- Applied automatically by db.js initDb() on server startup.

ALTER TABLE zaki_sessions DROP COLUMN IF EXISTS typ_session_token;
