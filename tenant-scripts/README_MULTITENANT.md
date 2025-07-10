# Multi-Tenant SaaS Architecture Documentation

## Overview

This document describes the multi-tenant SaaS refactor of the base44.com pet management system. The application has been transformed from a single-tenant monolith to a multi-tenant SaaS platform that can serve multiple pet clinics simultaneously.

## Architecture Overview

### Key Components

1. **Tenant Resolution System** - Extracts tenant information from subdomains
2. **Data Isolation Layer** - Ensures complete data separation between tenants
3. **Theme Management** - Dynamic branding per tenant
4. **Feature Flags** - Tenant-specific feature enablement
5. **Admin Portal** - Tenant management interface

### Data Flow

```
Request → TenantResolver → ThemeProvider → TenantScopedData → MongoDB
   ↓           ↓              ↓                ↓
Subdomain → Tenant Lookup → Branding → Tenant Filter → Isolated Data
```

## Implementation Details

### 1. Tenant Resolution

**File**: `src/lib/tenant.js`

The tenant resolution system extracts tenant information from the host header:

```javascript
// Example URLs:
// clinic-a.base44.com → tenant: clinic-a
// petsrus.com → tenant: petsrus (custom domain)
// localhost:3000 → tenant: default (development)
```

**Key Features**:
- Subdomain-based tenant identification
- Custom domain support
- Development fallback to default tenant
- Caching for performance (5-minute TTL)

### 2. Data Isolation

**File**: `src/api/tenantEntities.js`

All data access is automatically scoped to the current tenant:

```javascript
// Before (single-tenant)
const clients = await Client.list();

// After (multi-tenant)
const clients = await TenantClient.list(); // Automatically includes tenant_id filter
```

**Security Features**:
- Automatic tenant_id injection in all queries
- Cross-tenant access prevention
- Tenant validation on all CRUD operations

### 3. Theme Management

**File**: `src/contexts/ThemeContext.jsx`

Dynamic theming system that loads tenant-specific branding:

```javascript
const { getColor, getBranding, hasFeature } = useTheme();

// Usage in components
<div style={{ backgroundColor: getColor('primary') }}>
  <img src={getBranding('logo')} alt="Clinic Logo" />
</div>
```

**Theme Configuration**:
```json
{
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#6B7280",
    "accent": "#10B981"
  },
  "branding": {
    "logo": "https://cdn.example.com/logo.png",
    "clinicName": "Pets R Us",
    "tagline": "Caring for your pets"
  },
  "features": {
    "appointments": true,
    "billing": true,
    "inventory": true
  }
}
```

### 4. Admin Portal

**File**: `src/pages/TenantManagement.jsx`

Complete tenant management interface for SaaS administrators:

- Create new tenants
- Configure branding and features
- Monitor tenant usage
- Manage tenant status

## Database Schema

### MongoDB Collections

All collections include a `tenant_id` field for data isolation:

```javascript
// Example: Clients Collection
{
  _id: ObjectId,
  tenant_id: ObjectId,        // Tenant reference
  first_name: String,
  last_name: String,
  email: String,
  // ... other fields
}
```

### Required Indexes

```javascript
// Performance indexes for tenant isolation
db.clients.createIndex({ "tenant_id": 1 })
db.clients.createIndex({ "tenant_id": 1, "email": 1 })
db.appointments.createIndex({ "tenant_id": 1, "appointment_date": 1 })
```

## Migration Strategy

### Phase 1: Database Migration

1. **Run Migration Script**:
   ```bash
   node scripts/migrate-to-multitenant.js
   ```

2. **Migration Steps**:
   - Create default tenant
   - Add tenant_id to all existing collections
   - Create performance indexes
   - Update existing staff permissions

### Phase 2: Application Updates

1. **Replace Entity Imports**:
   ```javascript
   // Old
   import { Client } from '@/api/entities';
   
   // New
   import { TenantClient } from '@/api/tenantEntities';
   ```

2. **Update Component Usage**:
   ```javascript
   // Old
   const clients = await Client.list();
   
   // New
   const clients = await TenantClient.list();
   ```

### Phase 3: Testing

1. **Tenant Isolation Tests**:
   - Verify data separation between tenants
   - Test cross-tenant access prevention
   - Validate tenant switching

2. **Performance Tests**:
   - Query performance with tenant filters
   - Index effectiveness
   - Cache performance

## Deployment Configuration

### Environment Variables

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/petclinic

# Tenant Configuration
DEFAULT_TENANT_ID=default-tenant-id
TENANT_CACHE_TTL=300000

# Domain Configuration
BASE_DOMAIN=base44.com
CUSTOM_DOMAINS_ENABLED=true
```

### DNS Configuration

For production deployment, configure DNS to handle subdomains:

```bash
# Route 53 or similar DNS provider
*.base44.com → Load Balancer
```

### Load Balancer Configuration

Configure load balancer to preserve host headers:

```nginx
# Nginx configuration
server {
    listen 80;
    server_name *.base44.com;
    
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Considerations

### 1. Data Isolation

- All queries must include tenant_id filter
- No cross-tenant data access possible
- Tenant validation on all operations

### 2. Authentication

- JWT tokens include tenant_id
- Session validation per tenant
- Role-based access control scoped to tenant

### 3. Authorization

- Staff permissions scoped to tenant
- Feature flags per tenant
- API rate limiting per tenant

### 4. Audit Logging

- Track all data access by tenant
- Monitor tenant usage patterns
- Security event logging

## Monitoring and Analytics

### Tenant Metrics

Track per-tenant usage and performance:

```javascript
// Example metrics
{
  tenant_id: "clinic-a",
  active_users: 15,
  appointments_today: 8,
  storage_used: "2.5GB",
  api_calls: 1250
}
```

### Performance Monitoring

- Query performance by tenant
- Cache hit rates
- Response times per tenant

## Troubleshooting

### Common Issues

1. **Tenant Not Found**:
   - Check subdomain configuration
   - Verify tenant exists in database
   - Check DNS settings

2. **Data Isolation Issues**:
   - Verify tenant_id is set in all queries
   - Check index configuration
   - Validate tenant resolution

3. **Performance Issues**:
   - Check index usage
   - Monitor cache performance
   - Review query patterns

### Debug Mode

Enable debug logging for tenant resolution:

```javascript
// Add to development environment
DEBUG_TENANT=true
```

## Future Enhancements

### 1. Database Per Tenant

For high-volume tenants, consider dedicated databases:

```javascript
// Future enhancement
const dbRouter = {
  getDatabase(tenantId) {
    if (tenantId === 'enterprise-tenant') {
      return 'enterprise-db';
    }
    return 'shared-db';
  }
};
```

### 2. Custom Domains

Full custom domain support with SSL certificates:

```javascript
// Custom domain handling
if (tenant.domain) {
  // Serve from custom domain
  // Handle SSL certificates
  // Custom branding
}
```

### 3. Tenant Analytics

Advanced analytics and reporting per tenant:

```javascript
// Tenant-specific analytics
const analytics = {
  getTenantMetrics(tenantId) {
    // Custom metrics per tenant
  }
};
```

## Support and Maintenance

### Regular Tasks

1. **Database Maintenance**:
   - Index optimization
   - Data archival for inactive tenants
   - Performance monitoring

2. **Security Updates**:
   - Regular security audits
   - Tenant access reviews
   - Vulnerability assessments

3. **Backup Strategy**:
   - Tenant-aware backups
   - Point-in-time recovery
   - Disaster recovery testing

### Contact Information

For technical support or questions about the multi-tenant architecture:

- **Documentation**: This README
- **Issues**: GitHub Issues
- **Migration Support**: Technical team 