#!/bin/bash
# ZAKI Dev Launcher - Clean Start Every Time

ZAKI_DIR="/Users/nova/Downloads/ZAKI_MEMORY/ZAKI"

echo "🧹 Cleaning up old processes..."
for pid in $(ps aux | grep -E "node.*index|npm run dev|vite" | grep -v grep | awk '{print $2}'); do
  kill -9 $pid 2>/dev/null || true
done
sleep 1

echo "🚀 Starting both services..."
echo ""

# Use tmux for clean management
tmux new-session -d -s zaki-dev -c "$ZAKI_DIR/backend" "npm run dev 2>&1 | tee /tmp/backend.log"
tmux split-window -h -t zaki-dev -c "$ZAKI_DIR" "npm run dev 2>&1 | tee /tmp/frontend.log"
tmux select-layout -t zaki-dev tiled

echo "✅ Started!"
echo ""
echo "Commands:"
echo "  tmux attach -t zaki-dev    # View both terminals"
echo "  tmux kill-session -t zaki-dev  # Stop everything"
echo ""
echo "URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8787"
echo ""

# Attach if in terminal
if [ -t 1 ]; then
  tmux attach -t zaki-dev
else
  echo "Run: tmux attach -t zaki-dev"
fi
