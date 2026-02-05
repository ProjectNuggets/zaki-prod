#!/bin/bash
# ZAKI Development Launcher
# Usage: ./start-dev.sh

set -e

echo "🧹 Killing zombie processes..."
pkill -9 -f "node.*src/index.js" 2>/dev/null || true
pkill -9 -f "npm run dev" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
sleep 1

echo "🔍 Checking ports..."
for port in 8787 5173; do
  if lsof -ti:$port >/dev/null 2>&1; then
    echo "  Killing process on port $port"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
  fi
done

echo "🚀 Starting backend..."
cd "$(dirname "$0")/backend"
npm run dev &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

echo "🚀 Starting frontend..."
cd "$(dirname "$0")"
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Both services launching!"
echo ""
echo "🔌 Backend: http://localhost:8787"
echo "🎨 Frontend: http://localhost:5173"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/zaki-backend.log"
echo "  Frontend: tail -f /tmp/zaki-frontend.log"
echo ""
echo "Press Ctrl+C to stop both"
echo ""

# Wait for both
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit" INT TERM EXIT
wait
