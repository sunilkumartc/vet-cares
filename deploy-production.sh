#!/bin/bash

# Production Deployment Script for Vet-Cares
# This script sets up the production environment with MongoDB Atlas

echo "🚀 Starting Production Deployment for Vet-Cares..."

# Set production environment
export NODE_ENV=production

# MongoDB Atlas Configuration
export MONGODB_URI="mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/"

# Check if .env file exists, if not create from template
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    
    # Update .env with production values
    sed -i '' 's/NODE_ENV=development/NODE_ENV=production/' .env
    sed -i '' 's|MONGODB_URI=mongodb://localhost:27017|MONGODB_URI=mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/|' .env
    
    echo "✅ .env file created with production settings"
else
    echo "📝 .env file already exists, updating MongoDB URI..."
    sed -i '' 's/NODE_ENV=development/NODE_ENV=production/' .env
    sed -i '' 's|MONGODB_URI=mongodb://localhost:27017|MONGODB_URI=mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/|' .env
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build client
echo "🏗️ Building client application..."
cd client
npm install
npm run build
cd ..

# Start server in production mode
echo "🚀 Starting server in production mode..."
cd server
npm install
npm start 