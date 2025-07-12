# Quick Test Curl Commands for Vet Cares Backend API

## Base URL
```bash
BASE_URL="http://localhost:3001"
```

## 1. Basic Connectivity Test

### Health Check
```bash
curl -X GET "$BASE_URL/api/health"
```

### Server Test
```bash
curl -X GET "$BASE_URL/api/test"
```

## 2. Tenant Management

### Get Current Tenant
```bash
curl -X GET "$BASE_URL/api/tenant/current"
```

### Get All Tenants
```bash
curl -X GET "$BASE_URL/api/tenant"
```

### Create New Tenant
```bash
curl -X POST "$BASE_URL/api/tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Clinic",
    "slug": "test-clinic",
    "subdomain": "test",
    "domain": "test.localhost",
    "status": "active"
  }'
```

## 3. Staff Management

### Get Staff for Tenant
```bash
curl -X GET "$BASE_URL/api/staff?tenant_id=6868ed5cf45835c58a981ce3"
```

### Create New Staff Member
```bash
curl -X POST "$BASE_URL/api/staff" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "6868ed5cf45835c58a981ce3",
    "username": "teststaff",
    "password": "test123",
    "email": "test@clinic.com",
    "first_name": "Test",
    "last_name": "Staff",
    "role": "staff",
    "status": "active"
  }'
```

## 4. Client Management

### Get Clients for Tenant
```bash
curl -X GET "$BASE_URL/api/clients?tenant_id=6868ed5cf45835c58a981ce3"
```

### Create New Client
```bash
curl -X POST "$BASE_URL/api/clients" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "6868ed5cf45835c58a981ce3",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "address": "123 Main St, City, State 12345"
  }'
```

### Update Client (Replace CLIENT_ID with actual ID)
```bash
curl -X PUT "$BASE_URL/api/clients/CLIENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "6868ed5cf45835c58a981ce3",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@example.com",
    "phone": "+1234567890"
  }'
```

### Delete Client (Replace CLIENT_ID with actual ID)
```bash
curl -X DELETE "$BASE_URL/api/clients/CLIENT_ID?tenant_id=6868ed5cf45835c58a981ce3"
```

## 5. Pet Management

### Get Pets for Tenant
```bash
curl -X GET "$BASE_URL/api/pets?tenant_id=6868ed5cf45835c58a981ce3"
```

### Create New Pet
```bash
curl -X POST "$BASE_URL/api/pets" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "6868ed5cf45835c58a981ce3",
    "client_id": "CLIENT_ID_PLACEHOLDER",
    "name": "Buddy",
    "species": "dog",
    "breed": "Golden Retriever",
    "birth_date": "2020-01-15",
    "weight": 25.5
  }'
```

## 6. Authentication

### Staff Login
```bash
curl -X POST "$BASE_URL/api/staff/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@petclinic.com",
    "password": "admin123"
  }'
```

### System Admin Login
```bash
curl -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "systemadmin",
    "password": "systemadmin123"
  }'
```

## 7. SOAP Notes

### SOAP Autocomplete
```bash
curl -X POST "$BASE_URL/api/soap/autocomplete" \
  -H "Content-Type: application/json" \
  -d '{
    "field": "subjective",
    "currentText": "Patient presents with",
    "patientContext": {
      "species": "dog",
      "age": 5,
      "breed": "Golden Retriever"
    }
  }'
```

### Get SOAP Statistics
```bash
curl -X GET "$BASE_URL/api/soap/stats"
```

## 8. WhatsApp Integration

### Send Invoice via WhatsApp
```bash
curl -X POST "$BASE_URL/api/whatsapp/send-invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "INVOICE_ID_PLACEHOLDER",
    "phone_number": "+1234567890",
    "message": "Your invoice is ready"
  }'
```

## 9. File Upload

### Upload File to S3
```bash
curl -X POST "$BASE_URL/api/upload-to-s3" \
  -F "file=@/path/to/your/file.pdf"
```

## 10. Vaccination Reminders

### Send Vaccination Reminder
```bash
curl -X POST "$BASE_URL/api/vaccination/reminder" \
  -H "Content-Type: application/json" \
  -d '{
    "pet_id": "PET_ID_PLACEHOLDER",
    "vaccine_type": "rabies",
    "due_date": "2024-12-01",
    "phone_number": "+1234567890"
  }'
```

## 11. Feedback System

### Submit Feedback
```bash
curl -X POST "$BASE_URL/api/feedback/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "APPOINTMENT_ID_PLACEHOLDER",
    "rating": 5,
    "comment": "Great service!",
    "categories": ["cleanliness", "staff_friendliness"]
  }'
```

### Get Feedback Analytics
```bash
curl -X GET "$BASE_URL/api/feedback/analytics"
```

## 12. Invoice Management

### Create Invoice
```bash
curl -X POST "$BASE_URL/api/invoices" \
  -H "Content-Type: application/json" \
  -d '{
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
```

### Get Invoice PDF
```bash
curl -X GET "$BASE_URL/api/invoice/INVOICE_ID_PLACEHOLDER/pdf"
```

## 13. Vitals and Health Data

### Get Pet Vitals
```bash
curl -X GET "$BASE_URL/api/pets/PET_ID_PLACEHOLDER/vitals?metric=weight&period=30d"
```

## 14. Admin Management

### Get All Tenants (Admin)
```bash
curl -X GET "$BASE_URL/api/admin/tenants"
```

### Get Admin Analytics
```bash
curl -X GET "$BASE_URL/api/admin/analytics"
```

## 15. Error Handling Tests

### Test Invalid ObjectId
```bash
curl -X GET "$BASE_URL/api/clients/invalid-id"
```

### Test Missing Tenant ID
```bash
curl -X GET "$BASE_URL/api/clients"
```

## Usage Notes

1. **Replace Placeholders**: Replace `CLIENT_ID_PLACEHOLDER`, `PET_ID_PLACEHOLDER`, etc. with actual IDs from your database
2. **Authentication**: Some endpoints may require authentication tokens
3. **Base URL**: Change `localhost:3001` to your actual server URL
4. **Tenant ID**: The tenant ID `6868ed5cf45835c58a981ce3` is used in examples - replace with your actual tenant ID
5. **File Upload**: For file uploads, replace `/path/to/your/file.pdf` with the actual file path

## Testing with Authentication

If an endpoint requires authentication, you'll need to:
1. First login to get a token
2. Include the token in subsequent requests:

```bash
# Login to get token
TOKEN=$(curl -s -X POST "$BASE_URL/api/staff/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@petclinic.com", "password": "admin123"}' | jq -r '.token')

# Use token in subsequent requests
curl -X GET "$BASE_URL/api/protected-endpoint" \
  -H "Authorization: Bearer $TOKEN"
``` 