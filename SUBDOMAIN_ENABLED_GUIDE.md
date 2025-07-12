# 🏥 VetVault Subdomain Creation - Complete Setup Guide

## ✅ What's Already Configured

Your VetVault system is now ready for subdomain creation! Here's what's been set up:

### 1. **Frontend Configuration** ✅
- Updated `client/vercel.json` for wildcard subdomain support
- Fixed landing page to use correct API endpoints
- Tenant resolution logic in `client/src/lib/tenant.js`

### 2. **Backend Configuration** ✅
- Public signup endpoint at `/api/public/signup`
- Tenant resolution by subdomain in `server/routes/tenant.js`
- Clinic lookup endpoint at `/api/public/clinic/:slug`

### 3. **Management Scripts** ✅
- `create-clinic.sh` - Interactive clinic creation wizard
- `scripts/create-clinic.js` - Node.js clinic creation script
- `scripts/test-subdomain-creation.js` - Test subdomain creation flow
- `scripts/manage-subdomains.js` - Manage existing subdomains
- `scripts/setup-dns-config.js` - DNS configuration guide

## 🚀 How to Create New Clinics

### Option 1: Using the Interactive Script (Recommended)

```bash
# From the project root directory
./create-clinic.sh
```

This will guide you through:
- Clinic name and details
- Admin credentials
- Subdomain selection
- Billing plan choice

### Option 2: Using the Landing Page

1. Visit `https://app.vetvault.in`
2. Fill out the clinic signup form
3. System automatically creates subdomain
4. Redirects to new clinic's subdomain

### Option 3: Direct API Call

```bash
curl -X POST https://api.vetvault.in/api/public/signup \
  -H "Content-Type: application/json" \
  -d '{
    "clinicName": "Downtown Animal Hospital",
    "email": "admin@downtownvet.com",
    "password": "securepass123",
    "ownerName": "Dr. Sarah Johnson",
    "phone": "+1234567890",
    "address": "123 Main St, Downtown, CA 90210",
    "plan": "trial"
  }'
```

## 🌐 DNS Configuration Required

### 1. **Wildcard Subdomain Record** (Required)
```
Type: A
Name: *
Value: [Your Vercel Frontend IP/URL]
TTL: 300
```

### 2. **Main Domain Records**
```
Type: A
Name: app
Value: [Vercel Frontend URL]
TTL: 300

Type: A
Name: api
Value: [Backend Server IP/URL]
TTL: 300
```

### 3. **Root Domain Record**
```
Type: A
Name: @ (or leave empty)
Value: [Vercel Frontend URL]
TTL: 300
```

## 🔧 Testing Your Setup

### 1. Test DNS Configuration
```bash
# Test wildcard subdomain
nslookup test-clinic.vetvault.in

# Test main domains
nslookup app.vetvault.in
nslookup api.vetvault.in
```

### 2. Test Subdomain Creation
```bash
# Run the test script
node scripts/test-subdomain-creation.js
```

### 3. Test API Connectivity
```bash
# Test health endpoint
curl -I https://api.vetvault.in/api/health

# Test tenant resolution
curl -H "Host: test-clinic.vetvault.in" https://api.vetvault.in/api/tenant/current
```

## 📋 Example Clinic Creation Flow

1. **Run the creation script:**
   ```bash
   ./create-clinic.sh
   ```

2. **Enter clinic details:**
   ```
   Clinic Name: Downtown Animal Hospital
   Admin Email: admin@downtownvet.com
   Password: securepass123
   Owner Name: Dr. Sarah Johnson
   Phone: +1234567890
   Address: 123 Main St, Downtown, CA 90210
   Subdomain: downtown-animal-hospital (auto-generated)
   Plan: trial
   ```

3. **System creates:**
   - New tenant in database
   - Admin user account
   - Default clinic settings
   - Subdomain: `downtown-animal-hospital.vetvault.in`

4. **Access the clinic:**
   - URL: `https://downtown-animal-hospital.vetvault.in`
   - Login with admin credentials
   - Start configuring the clinic

## 🛠️ Management Commands

### List All Tenants
```bash
node scripts/manage-subdomains.js
# Choose option 1
```

### Update Tenant Subdomain
```bash
node scripts/manage-subdomains.js
# Choose option 2
```

### Generate DNS Configuration
```bash
node scripts/setup-dns-config.js
```

### Test Complete Flow
```bash
node scripts/test-subdomain-creation.js
```

## 🔒 Security Considerations

### Subdomain Validation
- Only lowercase letters, numbers, and hyphens
- Minimum 3 characters, maximum 63 characters
- Reserved words blocked (www, api, app, admin, etc.)
- No consecutive hyphens or leading/trailing hyphens

### Rate Limiting
- Consider implementing rate limiting for signup endpoint
- Monitor for abuse and spam registrations

### SSL Certificates
- Ensure wildcard SSL certificate covers `*.vetvault.in`
- Use Let's Encrypt or similar for automatic certificate management

## 📊 Monitoring and Maintenance

### Track Subdomain Usage
```bash
# Check tenant database
mongo your-database --eval "db.tenants.find({}, {name: 1, subdomain: 1, status: 1, created_date: 1})"
```

### Monitor Performance
- Track subdomain-specific metrics
- Monitor API response times by tenant
- Watch for abandoned subdomains

### Cleanup Inactive Tenants
- Implement automatic cleanup for trial tenants that don't convert
- Archive inactive tenants after a certain period

## 🎯 Next Steps

1. **Configure DNS wildcard records** in your domain provider
2. **Test the complete flow** with the test script
3. **Create your first clinic** using the interactive script
4. **Monitor the system** for any issues
5. **Scale up** as you add more clinics

## 🆘 Troubleshooting

### Common Issues

1. **Subdomain not resolving:**
   - Check DNS propagation (can take 48 hours)
   - Verify wildcard record is configured correctly

2. **CORS errors:**
   - Ensure backend CORS includes subdomains
   - Check Vercel configuration

3. **Tenant not found:**
   - Verify tenant exists in database
   - Check subdomain extraction logic

4. **SSL certificate errors:**
   - Ensure wildcard SSL certificate is installed
   - Check certificate covers all subdomains

### Debug Commands
```bash
# Test DNS resolution
nslookup your-clinic.vetvault.in

# Test API endpoint
curl -H "Host: your-clinic.vetvault.in" https://api.vetvault.in/api/tenant/current

# Check tenant in database
mongo your-database --eval "db.tenants.findOne({subdomain: 'your-clinic'})"
```

## 🎉 You're Ready!

Your VetVault system is now fully configured for multi-tenant subdomain creation. Each pet clinic will get its own subdomain (e.g., `clinic-name.vetvault.in`) with complete data isolation and branding.

Start creating clinics and watch your veterinary SaaS platform grow! 🚀 