#!/bin/bash
# Dev server wrapper - automatically manages SSH tunnel

echo "🚇 Opening SSH tunnel to Hetzner Postgres (Port 54322 -> 5432)..."

# Start SSH tunnel in background
# Mapping local 54322 to remote database
# Using 54322 to avoid conflict with local postgres if running
ssh -f -N -L 54322:10.0.2.6:5432 hetzner

# Wait a moment for tunnel to establish
sleep 2

# Store tunnel PID for cleanup
TUNNEL_PID=$(lsof -ti:54322 | head -1)

echo "✅ Tunnel established (PID: $TUNNEL_PID)"
echo "🚀 Starting dev server..."

# Cleanup function
cleanup() {
  echo ""
  echo "🧹 Closing SSH tunnel..."
  kill $TUNNEL_PID 2>/dev/null || true
  echo "✅ Cleanup complete"
  exit 0
}

# Trap exit signals
trap cleanup SIGINT SIGTERM EXIT

# Start Next.js dev server
npm run dev:notunnel

# Cleanup on exit
cleanup
