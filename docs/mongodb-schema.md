# MongoDB Schema for Multi-Tenant Pet Management System

## Overview
This document outlines the MongoDB collections and their schema for the multi-tenant pet management system. All collections include a `tenant_id` field to ensure data isolation between tenants.

## Collections

### 1. Tenants Collection
```javascript
{
  _id: ObjectId,
  name: String,                    // Clinic name
  slug: String,                    // Subdomain slug (unique)
  domain: String,                  // Custom domain (optional)
  theme_json: String,              // JSON string of theme configuration
  features_json: String,           // JSON string of feature flags
  status: String,                  // "active", "inactive", "pending"
  created_at: Date,
  updated_at: Date,
  settings: {
    timezone: String,
    currency: String,
    language: String,
    business_hours: Object,
    contact_info: Object
  }
}
```

### 2. Clients Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  first_name: String,
  last_name: String,
  email: String,
  phone: String,
  address: String,
  emergency_contact: {
    name: String,
    phone: String,
    relationship: String
  },
  notes: String,
  status: String,                  // "active", "inactive"
  created_at: Date,
  updated_at: Date
}
```

### 3. Pets Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  client_id: ObjectId,             // Reference to client
  name: String,
  species: String,                 // "dog", "cat", "bird", etc.
  breed: String,
  color: String,
  birth_date: Date,
  weight: Number,
  microchip_id: String,
  medical_notes: String,
  status: String,                  // "active", "deceased", "transferred"
  created_at: Date,
  updated_at: Date
}
```

### 4. Appointments Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  client_id: ObjectId,             // Reference to client
  pet_id: ObjectId,                // Reference to pet
  staff_id: ObjectId,              // Reference to staff member
  appointment_date: Date,
  appointment_time: String,
  service_type: String,
  reason: String,
  notes: String,
  status: String,                  // "scheduled", "confirmed", "completed", "cancelled"
  duration_minutes: Number,
  created_at: Date,
  updated_at: Date
}
```

### 5. Medical Records Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  pet_id: ObjectId,                // Reference to pet
  client_id: ObjectId,             // Reference to client
  staff_id: ObjectId,              // Reference to staff member
  visit_date: Date,
  diagnosis: String,
  treatment: String,
  prescription: String,
  notes: String,
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  created_at: Date,
  updated_at: Date
}
```

### 6. Vaccinations Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  pet_id: ObjectId,                // Reference to pet
  vaccine_id: ObjectId,            // Reference to vaccine
  date_administered: Date,
  next_due_date: Date,
  batch_number: String,
  administered_by: ObjectId,       // Reference to staff member
  notes: String,
  created_at: Date,
  updated_at: Date
}
```

### 7. Staff Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  employee_id: String,
  full_name: String,
  email: String,
  password: String,                // Hashed
  phone: String,
  role: String,                    // "admin", "veterinarian", "receptionist"
  permissions: [String],           // Array of permission strings
  status: String,                  // "active", "inactive", "on_leave"
  hire_date: Date,
  created_at: Date,
  updated_at: Date
}
```

### 8. Products Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  name: String,
  description: String,
  category: String,
  sku: String,
  price: Number,
  cost: Number,
  total_stock: Number,
  reorder_level: Number,
  supplier: String,
  status: String,                  // "active", "discontinued"
  created_at: Date,
  updated_at: Date
}
```

### 9. Invoices Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  client_id: ObjectId,             // Reference to client
  invoice_number: String,
  invoice_date: Date,
  due_date: Date,
  items: [{
    description: String,
    quantity: Number,
    unit_price: Number,
    total: Number,
    type: String                   // "service", "product"
  }],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: String,                  // "draft", "sent", "paid", "overdue"
  payment_method: String,
  notes: String,
  created_at: Date,
  updated_at: Date
}
```

### 10. Services Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  name: String,
  description: String,
  price: Number,
  duration_minutes: Number,
  category: String,
  status: String,                  // "active", "inactive"
  created_at: Date,
  updated_at: Date
}
```

### 11. Vaccines Collection
```javascript
{
  _id: ObjectId,
  tenant_id: ObjectId,             // Reference to tenant
  name: String,
  description: String,
  manufacturer: String,
  frequency_months: Number,
  status: String,                  // "active", "inactive"
  created_at: Date,
  updated_at: Date
}
```

## Indexes

### Required Indexes for Performance
```javascript
// Tenants collection
db.tenants.createIndex({ "slug": 1 }, { unique: true })
db.tenants.createIndex({ "domain": 1 })

// Clients collection
db.clients.createIndex({ "tenant_id": 1 })
db.clients.createIndex({ "tenant_id": 1, "email": 1 })

// Pets collection
db.pets.createIndex({ "tenant_id": 1 })
db.pets.createIndex({ "tenant_id": 1, "client_id": 1 })

// Appointments collection
db.appointments.createIndex({ "tenant_id": 1 })
db.appointments.createIndex({ "tenant_id": 1, "appointment_date": 1 })
db.appointments.createIndex({ "tenant_id": 1, "pet_id": 1 })

// Medical Records collection
db.medical_records.createIndex({ "tenant_id": 1 })
db.medical_records.createIndex({ "tenant_id": 1, "pet_id": 1 })

// Staff collection
db.staff.createIndex({ "tenant_id": 1 })
db.staff.createIndex({ "tenant_id": 1, "email": 1 })

// Products collection
db.products.createIndex({ "tenant_id": 1 })
db.products.createIndex({ "tenant_id": 1, "sku": 1 })

// Invoices collection
db.invoices.createIndex({ "tenant_id": 1 })
db.invoices.createIndex({ "tenant_id": 1, "client_id": 1 })
```

## Data Migration Strategy

### Phase 1: Add Tenant Fields
1. Add `tenant_id` field to all existing collections
2. Set default tenant_id for existing data
3. Create indexes for tenant_id fields

### Phase 2: Update Application Code
1. Update all queries to include tenant_id filters
2. Implement tenant resolution middleware
3. Update authentication to include tenant context

### Phase 3: Data Isolation Testing
1. Verify data isolation between tenants
2. Test tenant switching functionality
3. Validate performance with tenant filters

## Security Considerations

1. **Data Isolation**: All queries must include tenant_id filter
2. **Authentication**: JWT tokens must include tenant_id
3. **Authorization**: Role-based access control scoped to tenant
4. **Audit Logging**: Track all data access by tenant
5. **Backup Strategy**: Tenant-aware backup and restore procedures 