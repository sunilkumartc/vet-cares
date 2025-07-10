#!/bin/bash

# Tenant Management API Testing Script
# This script tests all tenant management endpoints

BASE_URL="http://localhost:3001"
TENANT_ID="6868ed5cf45835c58a981ce3"

echo "🐾 Vet Cares - Tenant Management API Testing"
echo "=============================================="
echo ""

# Test 1: Get all tenants
echo "1. Testing GET /api/admin/tenants"
echo "--------------------------------"
curl -s -X GET "$BASE_URL/api/admin/tenants" | jq '.'
echo ""

# Test 2: Get specific tenant
echo "2. Testing GET /api/admin/tenants/$TENANT_ID"
echo "--------------------------------------------"
curl -s -X GET "$BASE_URL/api/admin/tenants/$TENANT_ID" | jq '.'
echo ""

# Test 3: Get tenant analytics
echo "3. Testing GET /api/admin/tenants/$TENANT_ID/analytics"
echo "-----------------------------------------------------"
curl -s -X GET "$BASE_URL/api/admin/tenants/$TENANT_ID/analytics" | jq '.'
echo ""

# Test 4: Get tenant billing
echo "4. Testing GET /api/admin/tenants/$TENANT_ID/billing"
echo "---------------------------------------------------"
curl -s -X GET "$BASE_URL/api/admin/tenants/$TENANT_ID/billing" | jq '.'
echo ""

# Test 5: Get tenant security
echo "5. Testing GET /api/admin/tenants/$TENANT_ID/security"
echo "----------------------------------------------------"
curl -s -X GET "$BASE_URL/api/admin/tenants/$TENANT_ID/security" | jq '.'
echo ""

# Test 6: Create new tenant
echo "6. Testing POST /api/admin/tenants (Create new tenant)"
echo "-----------------------------------------------------"
curl -s -X POST "$BASE_URL/api/admin/tenants" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Clinic",
    "slug": "test-clinic",
    "domain": "test.example.com",
    "contact_email": "admin@testclinic.com",
    "contact_phone": "+1234567890",
    "address": "123 Test Street, Test City",
    "timezone": "America/New_York",
    "currency": "USD",
    "language": "en",
    "billing_plan": "premium",
    "status": "active",
    "max_staff": 20,
    "max_clients": 2000,
    "max_storage_gb": 50,
    "custom_branding": true,
    "sso_enabled": false,
    "api_access": true
  }' | jq '.'
echo ""

# Test 7: Suspend tenant
echo "7. Testing POST /api/admin/tenants/$TENANT_ID/suspend"
echo "----------------------------------------------------"
curl -s -X POST "$BASE_URL/api/admin/tenants/$TENANT_ID/suspend" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing suspension"}' | jq '.'
echo ""

# Test 8: Activate tenant
echo "8. Testing POST /api/admin/tenants/$TENANT_ID/activate"
echo "-----------------------------------------------------"
curl -s -X POST "$BASE_URL/api/admin/tenants/$TENANT_ID/activate" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing activation"}' | jq '.'
echo ""

# Test 9: Create backup
echo "9. Testing POST /api/admin/tenants/$TENANT_ID/backup"
echo "---------------------------------------------------"
curl -s -X POST "$BASE_URL/api/admin/tenants/$TENANT_ID/backup" \
  -H "Content-Type: application/json" \
  -d '{"type": "full", "description": "Test backup"}' | jq '.'
echo ""

# Test 10: Get system analytics
echo "10. Testing GET /api/admin/analytics"
echo "-----------------------------------"
curl -s -X GET "$BASE_URL/api/admin/analytics" | jq '.'
echo ""

echo "✅ Tenant Management API Testing Complete!"
echo ""
echo "📋 Summary of Available Endpoints:"
echo "  • GET  /api/admin/tenants - List all tenants"
echo "  • GET  /api/admin/tenants/:id - Get specific tenant"
echo "  • POST /api/admin/tenants - Create new tenant"
echo "  • PUT  /api/admin/tenants/:id - Update tenant"
echo "  • DELETE /api/admin/tenants/:id - Delete tenant"
echo "  • GET  /api/admin/tenants/:id/analytics - Tenant analytics"
echo "  • GET  /api/admin/tenants/:id/billing - Tenant billing"
echo "  • GET  /api/admin/tenants/:id/security - Tenant security"
echo "  • POST /api/admin/tenants/:id/suspend - Suspend tenant"
echo "  • POST /api/admin/tenants/:id/activate - Activate tenant"
echo "  • POST /api/admin/tenants/:id/backup - Create backup"
echo "  • GET  /api/admin/analytics - System analytics"
echo ""
echo "🌐 Frontend Access: http://localhost:5173/ (Navigate to Tenant Management)" 