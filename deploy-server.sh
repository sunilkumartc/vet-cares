#!/bin/bash

# VetVault Server Deployment Script
# This script helps deploy the updated server with public routes

echo "🚀 VetVault Server Deployment"
echo "============================="
echo ""

# Check if we're in the right directory
if [ ! -f "server/server.js" ]; then
    echo "❌ Error: server/server.js not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📋 Current server status:"
echo "• Health endpoint: ✅ Working"
echo "• Public signup endpoint: ❌ Missing (needs deployment)"
echo ""

echo "🔧 To deploy the updated server with public routes:"
echo ""
echo "1. Upload the updated server files to your server:"
echo "   - server/server.js"
echo "   - server/routes/public.js"
echo "   - server/lib/mongodb.js"
echo "   - package.json (if dependencies changed)"
echo ""
echo "2. Install dependencies (if needed):"
echo "   npm install"
echo ""
echo "3. Restart the server:"
echo "   pm2 restart vet-cares-server"
echo "   # or"
echo "   systemctl restart vet-cares"
echo "   # or"
echo "   node server/server.js"
echo ""

echo "📝 Files that need to be updated:"
echo "✅ server/server.js - Already updated with public routes"
echo "✅ server/routes/public.js - New file with signup endpoint"
echo "✅ server/lib/mongodb.js - Database utilities"
echo ""

echo "🧪 After deployment, test with:"
echo "curl -X POST https://api.vetvault.in/api/public/signup \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"clinicName\":\"Test Clinic\",\"email\":\"test@example.com\",\"password\":\"testpass123\",\"ownerName\":\"Dr. Test\",\"plan\":\"trial\"}'"
echo ""

echo "📋 Expected response:"
echo "{"
echo "  \"success\": true,"
echo "  \"message\": \"Clinic created successfully\","
echo "  \"tenant\": {"
echo "    \"id\": \"...\","
echo "    \"name\": \"Test Clinic\","
echo "    \"subdomain\": \"test-clinic\","
echo "    \"login_url\": \"https://test-clinic.vetvault.in/login\""
echo "  }"
echo "}"
echo ""

echo "⚠️  Important: Make sure to restart the server after uploading the files!"
echo "   The current server is running an older version without the public routes." 