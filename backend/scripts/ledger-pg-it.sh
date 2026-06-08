#!/usr/bin/env bash
# Real-Postgres integration test for the unit ledger: spins an ephemeral pgvector container,
# runs unit-ledger.pg.integration.test.js against it, and tears down. Proves FOR UPDATE
# concurrency (no over-grant / no double-debit) + the expiry sweeper.
set -euo pipefail
NAME="ledger-pg-it-$$"
PORT="${LEDGER_PG_PORT:-55432}"
cd "$(dirname "$0")/.."

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "== starting ephemeral pgvector/pg16 on :$PORT =="
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test -e POSTGRES_DB=ledgertest \
  -p "${PORT}:5432" pgvector/pgvector:pg16 >/dev/null

echo "== waiting for postgres =="
for i in $(seq 1 30); do
  docker exec "$NAME" pg_isready -U postgres -d ledgertest >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$NAME" psql -U postgres -d ledgertest -v ON_ERROR_STOP=1 \
  -c 'CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pgcrypto;' >/dev/null
echo "== extensions ready =="

export LEDGER_TEST_DATABASE_URL="postgres://postgres:test@localhost:${PORT}/ledgertest"
node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config jest.config.mjs \
  --runInBand unit-ledger.pg.integration
