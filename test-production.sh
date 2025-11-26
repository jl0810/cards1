#!/bin/bash

# Test Production Build Performance
# This shows REAL Lighthouse scores with minification

echo "🏗️  Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🚀 Starting production server..."
npm start &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

echo ""
echo "🔍 Running Lighthouse on production build..."
npx lhci autorun --collect.url=http://localhost:3000

echo ""
echo "📊 Check the report for real minification results!"
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID

echo "✅ Done!"
