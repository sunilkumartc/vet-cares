#!/bin/bash

echo "🚀 Starting Multi-Tenant Veterinary System..."

# Kill any existing processes
echo "🔄 Killing existing processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "nginx" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 2

# Start the backend server
echo "🔧 Starting backend server..."
npm run server &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start the frontend (Vite dev server)
echo "🎨 Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

# Start nginx with our custom config
echo "🌐 Starting nginx proxy..."
nginx -c $(pwd)/nginx.conf

# Wait a moment for nginx to start
sleep 2

echo ""
echo "✅ Multi-tenant system is running!"
echo ""
echo "🌐 Access your application:"
echo "   • Default tenant: http://localhost"
echo "   • Test Clinic 3: http://clinic3.localhost"
echo "   • Any subdomain: http://[subdomain].localhost"
echo ""
echo "🔧 Backend API: http://localhost:3001"
echo "🎨 Frontend Dev: http://localhost:5173"
echo ""
echo "📝 To stop all services, run: ./scripts/stop-multi-tenant.sh"
echo ""

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    nginx -s stop 2>/dev/null || true
    echo "✅ All services stopped."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running
echo "⏳ Press Ctrl+C to stop all services..."
wait 