#!/bin/bash

# VetVault Clinic Creation Script
# This script creates a new clinic with proper subdomain configuration

echo "🏥 VetVault - New Clinic Creation"
echo "================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if the script exists
if [ ! -f "scripts/create-clinic.js" ]; then
    echo "❌ Script not found: scripts/create-clinic.js"
    echo "Please make sure you're running this from the project root directory."
    exit 1
fi

# Run the Node.js script
echo "🚀 Starting clinic creation wizard..."
echo ""

node scripts/create-clinic.js

echo ""
echo "✅ Script completed!" 