# Entity Migration Guide: Base44 → Native MongoDB

## Overview

This guide helps you migrate from the Base44 SDK entities to native MongoDB entities that support multi-tenancy. The new entity system provides better performance, complete control, and full multi-tenant support.

## What Changed

### Before (Base44 SDK)
```javascript
import { Client, Pet, Appointment } from '@/api/entities';

// Global data access
const clients = await Client.list();
const pets = await Pet.filter({ client_id: '123' });
```

### After (Native MongoDB)
```javascript
import { TenantClient, TenantPet, TenantAppointment } from '@/api/tenantEntities';

// Tenant-scoped data access
const clients = await TenantClient.list();
const pets = await TenantPet.filter({ client_id: '123' });
```

## Key Benefits

1. **Complete Data Isolation** - All queries automatically include tenant_id
2. **Better Performance** - Direct MongoDB access without SDK overhead
3. **Full Control** - Custom queries, aggregations, and optimizations
4. **Multi-Tenant Ready** - Built-in tenant resolution and filtering
5. **No External Dependencies** - Eliminates Base44 SDK dependency

## Migration Steps

### Step 1: Install MongoDB Dependency

```bash
npm install mongodb
npm uninstall @base44/sdk
```

### Step 2: Run Migration Analysis

```bash
npm run migrate:entities
```

This will scan your codebase and identify files that need migration.

### Step 3: Update Imports

Replace old imports with new ones:

```javascript
// Old
import { Client, Pet, Appointment } from '@/api/entities';

// New
import { TenantClient, TenantPet, TenantAppointment } from '@/api/tenantEntities';
```

### Step 4: Update Entity Usage

The API remains largely the same, but now includes tenant isolation:

```javascript
// Old
const clients = await Client.list();
const client = await Client.get('123');
const newClient = await Client.create({ name: 'John' });

// New (same API, but tenant-scoped)
const clients = await TenantClient.list();
const client = await TenantClient.get('123');
const newClient = await TenantClient.create({ name: 'John' });
```

## Entity Mapping

| Old Entity | New Entity | Collection |
|------------|------------|------------|
| `Client` | `TenantClient` | `clients` |
| `Pet` | `TenantPet` | `pets` |
| `Appointment` | `TenantAppointment` | `appointments` |
| `MedicalRecord` | `TenantMedicalRecord` | `medical_records` |
| `Vaccination` | `TenantVaccination` | `vaccinations` |
| `Invoice` | `TenantInvoice` | `invoices` |
| `Staff` | `TenantStaff` | `staff` |
| `Service` | `TenantService` | `services` |
| `Memo` | `TenantMemo` | `memos` |
| `Product` | `TenantProduct` | `products` |
| `ProductBatch` | `TenantProductBatch` | `product_batches` |
| `Sale` | `TenantSale` | `sales` |
| `MissedSale` | `TenantMissedSale` | `missed_sales` |
| `StockMovement` | `TenantStockMovement` | `stock_movements` |
| `Vaccine` | `TenantVaccine` | `vaccines` |
| `DiagnosticReport` | `TenantDiagnosticReport` | `diagnostic_reports` |
| `ReportTemplate` | `TenantReportTemplate` | `report_templates` |

## API Methods

All entities support the same methods:

### Basic CRUD Operations

```javascript
// List all records (with optional sorting and filtering)
const records = await TenantClient.list();
const sortedRecords = await TenantClient.list('-created_date', 20);
const filteredRecords = await TenantClient.list(null, null, { status: 'active' });

// Get single record
const record = await TenantClient.get('record-id');

// Create new record
const newRecord = await TenantClient.create({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com'
});

// Update record
const updatedRecord = await TenantClient.update('record-id', {
  first_name: 'Jane'
});

// Delete record
await TenantClient.delete('record-id');
```

### Filtering and Searching

```javascript
// Filter records
const activeClients = await TenantClient.filter({ status: 'active' });
const sortedClients = await TenantClient.filter({}, '-created_date');

// Search (entity-specific)
const searchResults = await TenantClient.search('john');
const petSearch = await TenantPet.search('fluffy');
```

### Entity-Specific Methods

Each entity has additional methods for common operations:

```javascript
// Client-specific methods
const clientByEmail = await TenantClient.findByEmail('john@example.com');
const clientSearch = await TenantClient.search('john');

// Pet-specific methods
const clientPets = await TenantPet.findByClient('client-id');
const petSearch = await TenantPet.search('fluffy');

// Appointment-specific methods
const todayAppointments = await TenantAppointment.findByDate('2024-01-15');
const upcomingAppointments = await TenantAppointment.getUpcoming(10);
const petAppointments = await TenantAppointment.findByPet('pet-id');

// Product-specific methods
const lowStockProducts = await TenantProduct.getLowStock();
const categoryProducts = await TenantProduct.findByCategory('medication');
```

## Advanced Features

### Aggregation Support

```javascript
import { dbUtils } from '@/api/mongodb.js';

// Custom aggregation
const pipeline = [
  { $match: { tenant_id: 'current-tenant-id' } },
  { $group: { _id: '$status', count: { $sum: 1 } } }
];

const results = await dbUtils.getCollection('clients').aggregate(pipeline).toArray();
```

### Batch Operations

```javascript
import apiClient from '@/api/client.js';

// Batch create
const newClients = await apiClient.batchCreate('clients', [
  { first_name: 'John', last_name: 'Doe' },
  { first_name: 'Jane', last_name: 'Smith' }
]);

// Batch update
const updates = [
  { id: '1', data: { status: 'active' } },
  { id: '2', data: { status: 'inactive' } }
];
await apiClient.batchUpdate('clients', updates);
```

### Statistics and Analytics

```javascript
import apiClient from '@/api/client.js';

// Get collection statistics
const stats = await apiClient.getStats('clients');
console.log(stats);
// { total: 150, today: 5, collection: 'clients' }
```

## Environment Configuration

### MongoDB Connection

Set up your MongoDB connection in `.env`:

```bash
VITE_MONGODB_URI=mongodb://localhost:27017/petclinic
```

### Development vs Production

```javascript
// Development: Uses localhost
VITE_MONGODB_URI=mongodb://localhost:27017/petclinic

// Production: Uses cloud MongoDB
VITE_MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/petclinic
```

## Testing

### Unit Tests

```javascript
import { TenantClient } from '@/api/tenantEntities';

describe('TenantClient', () => {
  it('should create client with tenant_id', async () => {
    const client = await TenantClient.create({
      first_name: 'John',
      last_name: 'Doe'
    });
    
    expect(client.tenant_id).toBeDefined();
    expect(client.first_name).toBe('John');
  });
});
```

### Integration Tests

```javascript
import { dbUtils } from '@/api/mongodb.js';

describe('Tenant Isolation', () => {
  it('should not allow cross-tenant access', async () => {
    // Create data for tenant A
    const tenantA = await createTenant('tenant-a');
    const clientA = await createClient(tenantA.id, 'John');
    
    // Switch to tenant B
    await switchTenant('tenant-b');
    
    // Should not find tenant A's data
    const foundClient = await TenantClient.get(clientA.id);
    expect(foundClient).toBeNull();
  });
});
```

## Performance Optimization

### Indexes

The migration script automatically creates performance indexes:

```javascript
// Tenant isolation indexes
db.clients.createIndex({ "tenant_id": 1 });
db.clients.createIndex({ "tenant_id": 1, "email": 1 });

// Common query indexes
db.appointments.createIndex({ "tenant_id": 1, "appointment_date": 1 });
db.pets.createIndex({ "tenant_id": 1, "client_id": 1 });
```

### Caching

```javascript
import { TenantManager } from '@/lib/tenant.js';

// Tenant cache (5-minute TTL)
const tenant = await TenantManager.resolveTenant(host);
TenantManager.setCurrentTenant(tenant);
```

## Troubleshooting

### Common Issues

1. **"No tenant context available"**
   - Ensure TenantResolver is properly configured
   - Check that tenant exists in database
   - Verify subdomain resolution

2. **"Collection not found"**
   - Run database migration: `npm run migrate:multitenant`
   - Check MongoDB connection string
   - Verify database exists

3. **"Access denied"**
   - Ensure tenant_id matches current tenant
   - Check user permissions
   - Verify tenant status is 'active'

### Debug Mode

Enable debug logging:

```bash
# Add to .env
DEBUG_MONGODB=true
DEBUG_TENANT=true
```

## Migration Checklist

- [ ] Install MongoDB dependency
- [ ] Run `npm run migrate:entities` to analyze codebase
- [ ] Update imports in all files
- [ ] Replace entity usage with tenant-aware versions
- [ ] Test all functionality
- [ ] Remove @base44/sdk from package.json
- [ ] Update environment variables
- [ ] Run database migration
- [ ] Test tenant isolation
- [ ] Update documentation

## Support

For migration assistance:

1. **Run Analysis**: `npm run migrate:entities`
2. **Check Documentation**: This guide and `README_MULTITENANT.md`
3. **Review Examples**: See `src/components/TenantAwareHeader.jsx`
4. **Test Thoroughly**: Use `npm run test:tenant-isolation`

---

🎉 **Congratulations!** You've successfully migrated to native MongoDB entities with full multi-tenant support! 