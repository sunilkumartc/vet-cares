#!/bin/bash

echo "🛑 Stopping Multi-Tenant Veterinary System..."

# Stop nginx
echo "🌐 Stopping nginx..."
nginx -s stop 2>/dev/null || true

# Kill Node.js processes
echo "🔧 Stopping backend server..."
pkill -f "node server.js" 2>/dev/null || true

# Kill Vite processes
echo "🎨 Stopping frontend server..."
pkill -f "vite" 2>/dev/null || true

# Kill any other related processes
echo "🧹 Cleaning up other processes..."
pkill -f "concurrently" 2>/dev/null || true

# Wait a moment
sleep 2

echo "✅ All services stopped successfully!" 