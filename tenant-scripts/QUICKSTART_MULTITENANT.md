# Multi-Tenant SaaS Quick Start Guide

## 🚀 Getting Started

This guide will help you quickly set up and test the multi-tenant architecture for the pet management system.

## Prerequisites

- Node.js 18+ installed
- MongoDB instance running
- Git repository cloned

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/petclinic

# Tenant Configuration
DEFAULT_TENANT_ID=default-tenant-id
TENANT_CACHE_TTL=300000

# Development Configuration
NODE_ENV=development
```

## Step 3: Run Database Migration

Migrate your existing single-tenant data to multi-tenant:

```bash
npm run migrate:multitenant
```

This will:
- Create a default tenant
- Add `tenant_id` fields to all collections
- Create performance indexes
- Update existing staff permissions

## Step 4: Test Tenant Isolation

Verify that data isolation is working correctly:

```bash
npm run test:tenant-isolation
```

## Step 5: Start Development Server

```bash
npm run dev
```

## Step 6: Test Multi-Tenant Functionality

### Test Subdomain Resolution

1. **Default Tenant**: Visit `http://localhost:3000`
2. **Custom Subdomain**: Visit `http://clinic-a.localhost:3000` (if configured)

### Test Tenant Management

1. Navigate to the admin dashboard
2. Go to "Tenant Management"
3. Create a new tenant with custom branding
4. Test the new tenant's subdomain

## Testing Different Tenants

### Method 1: Localhost Subdomains

For development, you can test different tenants using localhost subdomains:

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Create localhost subdomains (macOS/Linux)
sudo echo "127.0.0.1 clinic-a.localhost" >> /etc/hosts
sudo echo "127.0.0.1 clinic-b.localhost" >> /etc/hosts
```

Then visit:
- `http://clinic-a.localhost:3000` - Clinic A
- `http://clinic-b.localhost:3000` - Clinic B

### Method 2: Browser Developer Tools

1. Open browser developer tools
2. Go to Network tab
3. Right-click on any request
4. Select "Block request URL"
5. Add a rule to modify the Host header

## Creating a New Tenant

### Via Admin Interface

1. Log in as admin
2. Navigate to "Tenant Management"
3. Click "Add Tenant"
4. Fill in the form:
   - **Name**: "Pets R Us"
   - **Slug**: "petsrus"
   - **Domain**: "petsrus.com" (optional)
   - **Theme JSON**: Custom branding configuration
   - **Features JSON**: Feature flags

### Via API

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pets R Us",
    "slug": "petsrus",
    "theme_json": "{\"colors\":{\"primary\":\"#FF6B6B\"}}",
    "status": "active"
  }'
```

## Customizing Tenant Branding

### Theme Configuration

Each tenant can have custom branding:

```json
{
  "colors": {
    "primary": "#FF6B6B",
    "secondary": "#4ECDC4",
    "accent": "#45B7D1",
    "background": "#F7F7F7",
    "surface": "#FFFFFF",
    "text": "#2C3E50",
    "textSecondary": "#7F8C8D"
  },
  "branding": {
    "logo": "https://cdn.example.com/petsrus-logo.png",
    "favicon": "https://cdn.example.com/petsrus-favicon.ico",
    "clinicName": "Pets R Us",
    "tagline": "Where pets are family"
  },
  "features": {
    "appointments": true,
    "billing": true,
    "inventory": true,
    "analytics": true,
    "staffManagement": true,
    "clientPortal": true
  }
}
```

### Using Theme in Components

```jsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { getColor, getBranding, hasFeature } = useTheme();
  
  return (
    <div style={{ backgroundColor: getColor('primary') }}>
      <h1>{getBranding('clinicName')}</h1>
      {hasFeature('analytics') && <AnalyticsDashboard />}
    </div>
  );
}
```

## Data Isolation Verification

### Check Tenant Data

```javascript
// In browser console or Node.js script
const tenantId = 'your-tenant-id';

// Should only return data for this tenant
const clients = await fetch(`/api/clients?tenant_id=${tenantId}`);
const appointments = await fetch(`/api/appointments?tenant_id=${tenantId}`);
```

### Verify Cross-Tenant Access Prevention

```javascript
// This should return empty results
const crossTenantData = await fetch('/api/clients?tenant_id=other-tenant-id');
console.log(crossTenantData.length); // Should be 0
```

## Performance Monitoring

### Check Index Usage

```javascript
// In MongoDB shell
db.clients.find({ tenant_id: "your-tenant-id" }).explain("executionStats")
```

### Monitor Query Performance

```javascript
// Enable MongoDB query logging
db.setProfilingLevel(1, { slowms: 100 })

// Check slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 })
```

## Troubleshooting

### Common Issues

1. **Tenant Not Found**
   ```bash
   # Check if tenant exists
   db.tenants.findOne({ slug: "your-tenant-slug" })
   ```

2. **Data Not Loading**
   ```bash
   # Verify tenant_id is set
   db.clients.findOne({ tenant_id: { $exists: true } })
   ```

3. **Performance Issues**
   ```bash
   # Check indexes
   db.clients.getIndexes()
   ```

### Debug Mode

Enable debug logging:

```bash
# Add to .env
DEBUG_TENANT=true
DEBUG_THEME=true
```

## Next Steps

1. **Custom Domains**: Configure SSL certificates for custom domains
2. **Advanced Analytics**: Implement tenant-specific metrics
3. **Database Per Tenant**: Consider dedicated databases for large tenants
4. **API Rate Limiting**: Implement per-tenant rate limits
5. **Backup Strategy**: Set up tenant-aware backup procedures

## Support

- **Documentation**: See `README_MULTITENANT.md`
- **Issues**: Create GitHub issues
- **Migration Help**: Contact the development team

---

🎉 **Congratulations!** You now have a fully functional multi-tenant SaaS platform! 