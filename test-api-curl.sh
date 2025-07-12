#!/bin/bash

# Vet Cares Backend API Test Script
# Base URL - change this to your server URL
BASE_URL="http://localhost:3001"

echo "🐾 Vet Cares Backend API Test Script"
echo "====================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}Testing: $description${NC}"
    echo "Endpoint: $method $BASE_URL$endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$BASE_URL$endpoint")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract response body (all lines except last)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        echo -e "${GREEN}✅ Success ($status_code)${NC}"
    else
        echo -e "${RED}❌ Error ($status_code)${NC}"
    fi
    
    echo "Response: $body"
    echo "----------------------------------------"
    echo ""
}

# 1. Test basic connectivity
echo -e "${YELLOW}1. Basic Connectivity Tests${NC}"
test_endpoint "GET" "/api/health" "" "Health check"
test_endpoint "GET" "/api/test" "" "Server connectivity test"

# 2. Tenant Management
echo -e "${YELLOW}2. Tenant Management Tests${NC}"
test_endpoint "GET" "/api/tenant/current" "" "Get current tenant"
test_endpoint "GET" "/api/tenant" "" "Get all tenants"

# Create a test tenant
TENANT_DATA='{
  "name": "Test Clinic",
  "slug": "test-clinic",
  "subdomain": "test",
  "domain": "test.localhost",
  "status": "active"
}'
test_endpoint "POST" "/api/tenant" "$TENANT_DATA" "Create new tenant"

# 3. Staff Management
echo -e "${YELLOW}3. Staff Management Tests${NC}"
test_endpoint "GET" "/api/staff?tenant_id=6868ed5cf45835c58a981ce3" "" "Get staff for tenant"

# Create a test staff member
STAFF_DATA='{
  "tenant_id": "6868ed5cf45835c58a981ce3",
  "username": "teststaff",
  "password": "test123",
  "email": "test@clinic.com",
  "first_name": "Test",
  "last_name": "Staff",
  "role": "staff",
  "status": "active"
}'
test_endpoint "POST" "/api/staff" "$STAFF_DATA" "Create new staff member"

# 4. Generic Entity Tests (Clients, Pets, etc.)
echo -e "${YELLOW}4. Generic Entity Tests${NC}"

# Test clients
test_endpoint "GET" "/api/clients?tenant_id=6868ed5cf45835c58a981ce3" "" "Get clients for tenant"

# Create a test client
CLIENT_DATA='{
  "tenant_id": "6868ed5cf45835c58a981ce3",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "address": "123 Main St, City, State 12345"
}'
test_endpoint "POST" "/api/clients" "$CLIENT_DATA" "Create new client"

# Test pets
test_endpoint "GET" "/api/pets?tenant_id=6868ed5cf45835c58a981ce3" "" "Get pets for tenant"

# Create a test pet
PET_DATA='{
  "tenant_id": "6868ed5cf45835c58a981ce3",
  "client_id": "CLIENT_ID_PLACEHOLDER",
  "name": "Buddy",
  "species": "dog",
  "breed": "Golden Retriever",
  "birth_date": "2020-01-15",
  "weight": 25.5
}'
test_endpoint "POST" "/api/pets" "$PET_DATA" "Create new pet"

# 5. Authentication Tests
echo -e "${YELLOW}5. Authentication Tests${NC}"

# Staff login
LOGIN_DATA='{
  "email": "admin@petclinic.com",
  "password": "admin123"
}'
test_endpoint "POST" "/api/staff/login" "$LOGIN_DATA" "Staff login"

# System admin login
ADMIN_LOGIN_DATA='{
  "username": "systemadmin",
  "password": "systemadmin123"
}'
test_endpoint "POST" "/api/admin/login" "$ADMIN_LOGIN_DATA" "System admin login"

# 6. Admin Management Tests
echo -e "${YELLOW}6. Admin Management Tests${NC}"
test_endpoint "GET" "/api/admin/tenants" "" "Get all tenants (admin)"
test_endpoint "GET" "/api/admin/analytics" "" "Get admin analytics"

# 7. SOAP and Medical Records
echo -e "${YELLOW}7. SOAP and Medical Records Tests${NC}"

# SOAP autocomplete
SOAP_DATA='{
  "field": "subjective",
  "currentText": "Patient presents with",
  "patientContext": {
    "species": "dog",
    "age": 5,
    "breed": "Golden Retriever"
  }
}'
test_endpoint "POST" "/api/soap/autocomplete" "$SOAP_DATA" "SOAP autocomplete"

# Get SOAP stats
test_endpoint "GET" "/api/soap/stats" "" "Get SOAP statistics"

# 8. WhatsApp Integration
echo -e "${YELLOW}8. WhatsApp Integration Tests${NC}"

# Send invoice via WhatsApp
WHATSAPP_DATA='{
  "invoice_id": "INVOICE_ID_PLACEHOLDER",
  "phone_number": "+1234567890",
  "message": "Your invoice is ready"
}'
test_endpoint "POST" "/api/whatsapp/send-invoice" "$WHATSAPP_DATA" "Send invoice via WhatsApp"

# 9. File Upload Tests
echo -e "${YELLOW}9. File Upload Tests${NC}"
echo "Note: File upload tests require actual files. Use the following command:"
echo "curl -X POST -F 'file=@/path/to/your/file.pdf' $BASE_URL/api/upload-to-s3"

# 10. Vaccination Reminders
echo -e "${YELLOW}10. Vaccination Reminder Tests${NC}"

VACCINATION_DATA='{
  "pet_id": "PET_ID_PLACEHOLDER",
  "vaccine_type": "rabies",
  "due_date": "2024-12-01",
  "phone_number": "+1234567890"
}'
test_endpoint "POST" "/api/vaccination/reminder" "$VACCINATION_DATA" "Send vaccination reminder"

# 11. Feedback System
echo -e "${YELLOW}11. Feedback System Tests${NC}"

# Submit feedback
FEEDBACK_DATA='{
  "appointment_id": "APPOINTMENT_ID_PLACEHOLDER",
  "rating": 5,
  "comment": "Great service!",
  "categories": ["cleanliness", "staff_friendliness"]
}'
test_endpoint "POST" "/api/feedback/submit" "$FEEDBACK_DATA" "Submit feedback"

# Get feedback analytics
test_endpoint "GET" "/api/feedback/analytics" "" "Get feedback analytics"

# 12. Invoice and Billing
echo -e "${YELLOW}12. Invoice and Billing Tests${NC}"

# Create invoice
INVOICE_DATA='{
  "tenant_id": "6868ed5cf45835c58a981ce3",
  "client_id": "CLIENT_ID_PLACEHOLDER",
  "pet_id": "PET_ID_PLACEHOLDER",
  "items": [
    {
      "description": "Vaccination",
      "quantity": 1,
      "unit_price": 50.00,
      "total": 50.00
    }
  ],
  "total_amount": 50.00,
  "status": "draft"
}'
test_endpoint "POST" "/api/invoices" "$INVOICE_DATA" "Create new invoice"

# 13. Vitals and Health Data
echo -e "${YELLOW}13. Vitals and Health Data Tests${NC}"

# Get pet vitals
test_endpoint "GET" "/api/pets/PET_ID_PLACEHOLDER/vitals?metric=weight&period=30d" "" "Get pet vitals"

# 14. Error Handling Tests
echo -e "${YELLOW}14. Error Handling Tests${NC}"

# Test invalid ObjectId
test_endpoint "GET" "/api/clients/invalid-id" "" "Test invalid ObjectId handling"

# Test missing tenant_id
test_endpoint "GET" "/api/clients" "" "Test without tenant_id"

echo -e "${GREEN}🎉 API Testing Complete!${NC}"
echo ""
echo "Notes:"
echo "- Replace PLACEHOLDER IDs with actual IDs from your database"
echo "- Some endpoints may require authentication tokens"
echo "- File upload tests require actual files"
echo "- Adjust the BASE_URL if your server runs on a different port" 