#!/bin/bash

# Development Deployment Script for Vet-Cares
# This script sets up the development environment with local MongoDB

echo "🔧 Starting Development Setup for Vet-Cares..."

# Set development environment
export NODE_ENV=development

# Local MongoDB Configuration
export MONGODB_URI="mongodb://localhost:27017"

# Check if .env file exists, if not create from template
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    
    # Update .env with development values
    sed -i '' 's/NODE_ENV=production/NODE_ENV=development/' .env
    sed -i '' 's|MONGODB_URI=mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/|MONGODB_URI=mongodb://localhost:27017|' .env
    
    echo "✅ .env file created with development settings"
else
    echo "📝 .env file already exists, updating for development..."
    sed -i '' 's/NODE_ENV=production/NODE_ENV=development/' .env
    sed -i '' 's|MONGODB_URI=mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/|MONGODB_URI=mongodb://localhost:27017|' .env
fi

# Check if MongoDB is running locally
echo "🔍 Checking if MongoDB is running locally..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running locally. Please start MongoDB first:"
    echo "   brew services start mongodb-community"
    echo "   or"
    echo "   mongod --dbpath /usr/local/var/mongodb"
    echo ""
    echo "Continuing with setup..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start development servers
echo "🚀 Starting development servers..."

# Start server in background
echo "🔧 Starting server..."
cd server
npm install
npm start &
SERVER_PID=$!
cd ..

# Start client
echo "🎨 Starting client..."
cd client
npm install
npm run dev &
CLIENT_PID=$!
cd ..

echo "✅ Development environment started!"
echo "📊 Server running on: http://localhost:3001"
echo "🎨 Client running on: http://localhost:5173"
echo ""
echo "To stop the servers, run:"
echo "kill $SERVER_PID $CLIENT_PID"
echo ""
echo "Or use Ctrl+C to stop this script" 