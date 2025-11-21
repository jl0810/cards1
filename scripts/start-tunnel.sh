#!/bin/bash

# 1. Kill any existing tunnel processes
pkill -f "localtunnel"

# 2. Define your preferred subdomain (Change this if it's taken!)
SUBDOMAIN="jeff-cards-dev"

echo "🚀 Starting Localtunnel (subdomain: $SUBDOMAIN)..."

# 3. Start localtunnel in the background and save output to a log file
# We use nohup to keep it running
nohup npx localtunnel --port 3000 --subdomain "$SUBDOMAIN" > tunnel.log 2>&1 &

# 4. Wait for it to initialize
echo "⏳ Waiting for tunnel URL..."
sleep 5

# 5. Extract URL from the log file
# The output looks like: "your url is: https://..."
TUNNEL_URL=$(grep -o "https://[a-zA-Z0-9.-]*" tunnel.log | head -1)

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Failed to get Tunnel URL. Check tunnel.log for details."
  cat tunnel.log
  exit 1
fi

# Ensure it has the .lt domain (sometimes it varies, but usually .loca.lt)
echo "✅ Tunnel Active: $TUNNEL_URL"

# 6. Update .env file
if grep -q "NEXT_PUBLIC_APP_URL=" .env; then
  sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$TUNNEL_URL|" .env
else
  echo "NEXT_PUBLIC_APP_URL=$TUNNEL_URL" >> .env
fi

echo "✅ Updated .env with new URL"
echo "👉 Don't forget to restart your Next.js server to pick up the change!"
