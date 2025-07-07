# 🏥 New Tenant Configuration Guide

## 📋 Overview

This guide explains how to configure a new tenant in the Vet Cares multi-tenant system. A tenant represents a veterinary clinic or hospital with its own isolated data and configuration.

## 🚀 Quick Start Methods

### **Method 1: Interactive Script (Recommended)**

```bash
# Make sure server is running
node server.js

# In another terminal, run the configuration script
./configure-new-tenant.sh
```

### **Method 2: Frontend Interface**

1. Start the frontend: `npm run dev`
2. Go to `http://localhost:5173/`
3. Navigate to "Tenant Management"
4. Click "Add New Tenant"

### **Method 3: Direct API Call**

```bash
curl -X POST http://localhost:3001/api/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Animal Hospital",
    "slug": "downtown-animal-hospital",
    "domain": "downtown.vetclinic.com",
    "contact_email": "admin@downtownvet.com",
    "contact_phone": "+1234567890",
    "address": "123 Main St, Downtown, NY 10001",
    "billing_plan": "professional",
    "status": "active"
  }'
```

## 📊 Tenant Configuration Options

### **Basic Information**
- **Name**: Display name for the clinic
- **Slug**: URL-friendly identifier (e.g., `downtown-animal-hospital`)
- **Domain**: Custom domain for the tenant
- **Contact Email**: Primary contact email
- **Contact Phone**: Primary contact phone
- **Address**: Physical address

### **Billing Plans**

| Plan | Price | Staff | Clients | Storage | Features |
|------|-------|-------|---------|---------|----------|
| **Basic** | $29/month | 10 | 1,000 | 10GB | Core features |
| **Professional** | $79/month | 25 | 5,000 | 100GB | Advanced features |
| **Premium** | $149/month | 50 | 10,000 | 500GB | Full features |
| **Enterprise** | $299/month | Unlimited | Unlimited | 1TB | Custom features |

### **Features Configuration**

```json
{
  "appointments": true,
  "billing": true,
  "inventory": true,
  "analytics": true,
  "staffManagement": true,
  "clientPortal": true,
  "telemedicine": false,
  "labIntegration": false,
  "pharmacyIntegration": false
}
```

### **Theme Configuration**

```json
{
  "primary_color": "#3B82F6",
  "secondary_color": "#1E40AF",
  "accent_color": "#F59E0B",
  "logo_url": "",
  "custom_css": ""
}
```

## 🔧 Post-Creation Configuration

### **1. Create Admin User**

```bash
curl -X POST http://localhost:3001/api/admin/tenants/{tenant_id}/staff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@clinic.com",
    "phone": "+1234567890",
    "role": "admin",
    "permissions": ["all"],
    "status": "active"
  }'
```

### **2. Add Staff Members**

```bash
curl -X POST http://localhost:3001/api/admin/tenants/{tenant_id}/staff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Sarah Johnson",
    "email": "sarah.johnson@clinic.com",
    "phone": "+1234567891",
    "role": "veterinarian",
    "permissions": ["appointments", "medical_records", "billing"],
    "status": "active"
  }'
```

### **3. Configure Services**

```bash
curl -X POST http://localhost:3001/api/admin/tenants/{tenant_id}/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "General Checkup",
    "description": "Routine health examination",
    "price": 75.00,
    "duration": 30,
    "category": "examination"
  }'
```

### **4. Set Up Vaccinations**

```bash
curl -X POST http://localhost:3001/api/admin/tenants/{tenant_id}/vaccinations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rabies Vaccine",
    "description": "Annual rabies vaccination",
    "price": 45.00,
    "duration": 15,
    "category": "vaccination"
  }'
```

## 📁 Tenant Data Structure

### **Collections Created**
- `tenants` - Tenant configuration
- `staff` - Staff members (tenant-specific)
- `clients` - Client records (tenant-specific)
- `pets` - Pet records (tenant-specific)
- `appointments` - Appointment records (tenant-specific)
- `invoices` - Billing records (tenant-specific)
- `medical_records` - Medical history (tenant-specific)
- `vaccinations` - Vaccination records (tenant-specific)
- `products` - Inventory items (tenant-specific)
- `services` - Available services (tenant-specific)

### **Data Isolation**
- All data is filtered by `tenant_id`
- No cross-tenant data access
- Separate billing and analytics per tenant

## 🔐 Security Configuration

### **Access Control**
- Role-based permissions
- Tenant-specific authentication
- API access controls
- Data encryption

### **Compliance**
- HIPAA compliance
- GDPR compliance
- ISO 27001 standards
- Regular security audits

## 📈 Monitoring & Analytics

### **Tenant Metrics**
- Staff count
- Client count
- Appointment volume
- Revenue tracking
- Storage usage
- API usage

### **System Monitoring**
- Performance metrics
- Error rates
- Uptime monitoring
- Resource utilization

## 🚨 Troubleshooting

### **Common Issues**

1. **Port Conflicts**
   ```bash
   # Kill existing processes
   lsof -ti:3001 | xargs kill -9
   ```

2. **MongoDB Connection**
   ```bash
   # Check MongoDB status
   mongosh --eval "db.runCommand('ping')"
   ```

3. **Tenant Creation Fails**
   ```bash
   # Check server logs
   tail -f server.log
   
   # Verify API endpoint
   curl -X GET http://localhost:3001/api/admin/tenants
   ```

### **Debug Commands**

```bash
# Check tenant status
curl -X GET http://localhost:3001/api/admin/tenants/{tenant_id}

# View tenant analytics
curl -X GET http://localhost:3001/api/admin/tenants/{tenant_id}/analytics

# Check tenant billing
curl -X GET http://localhost:3001/api/admin/tenants/{tenant_id}/billing
```

## 📞 Support

### **Getting Help**
1. Check the logs: `tail -f server.log`
2. Test API endpoints: `./test-tenant-management.sh`
3. Verify database: `mongosh vet_cares`
4. Review configuration: Check tenant settings in frontend

### **Useful Commands**
```bash
# Start full system
npm run dev:full

# Test tenant management
./test-tenant-management.sh

# Configure new tenant
./configure-new-tenant.sh

# Check system status
curl -X GET http://localhost:3001/api/admin/analytics
```

## 🎯 Best Practices

### **Tenant Setup**
1. Use descriptive names and slugs
2. Choose appropriate billing plan
3. Configure all required features
4. Set up admin user immediately
5. Test data isolation

### **Security**
1. Use strong passwords
2. Enable SSL certificates
3. Regular security updates
4. Monitor access logs
5. Backup data regularly

### **Performance**
1. Monitor resource usage
2. Optimize database queries
3. Use appropriate indexes
4. Regular maintenance
5. Scale as needed

---

## 🎉 Success Checklist

- [ ] Tenant created successfully
- [ ] Admin user configured
- [ ] Staff members added
- [ ] Services configured
- [ ] Vaccinations set up
- [ ] Data isolation verified
- [ ] Billing plan activated
- [ ] Security settings applied
- [ ] Analytics working
- [ ] Frontend accessible

**Status**: ✅ **Ready for Production**
**Last Updated**: 2025-07-05 