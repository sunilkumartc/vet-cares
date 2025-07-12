# Subdomain Setup Guide for VetVault Multi-Tenant System

## Overview

Your VetVault system is configured to use subdomains for each pet clinic:
- Main domain: `vetvault.in`
- Frontend: `app.vetvault.in`
- Backend API: `api.vetvault.in`
- Clinic subdomains: `{clinic-name}.vetvault.in`

## DNS Configuration

### 1. Wildcard Subdomain Setup

To enable automatic subdomain creation for new clinics, you need to configure a wildcard DNS record:

```
Type: A
Name: *
Value: [Your Vercel Frontend IP/URL]
TTL: 300 (or as recommended by your DNS provider)
```

### 2. Specific Domain Records

Ensure you have these specific records:

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

## Vercel Configuration

### 1. Update vercel.json for Wildcard Subdomains

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://api.vetvault.in/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

### 2. Vercel Domain Configuration

1. Go to your Vercel project dashboard
2. Navigate to Settings > Domains
3. Add your main domain: `vetvault.in`
4. Add wildcard subdomain: `*.vetvault.in`
5. Configure DNS records as shown above

## Backend Configuration

### 1. CORS Setup for Subdomains

Update your backend CORS configuration to allow all subdomains:

```javascript
app.use(cors({
  origin: [
    'https://app.vetvault.in',
    'https://*.vetvault.in',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

### 2. Tenant Resolution

Your backend already has tenant resolution logic in `server/routes/tenant.js` that:
- Extracts subdomain from the Host header
- Looks up tenant by subdomain
- Returns tenant-specific data

## Testing Subdomain Creation

### 1. Create a Test Clinic

```bash
curl -X POST https://api.vetvault.in/api/public/signup \
  -H "Content-Type: application/json" \
  -d '{
    "clinicName": "Test Pet Clinic",
    "email": "test@example.com",
    "password": "testpass123",
    "ownerName": "Dr. Test Owner",
    "plan": "trial"
  }'
```

### 2. Verify Subdomain Access

After creation, you should be able to access:
- `https://test-pet-clinic.vetvault.in`
- The system should automatically resolve to the correct tenant

## Security Considerations

### 1. Subdomain Validation

- Validate subdomain names (no special characters, reasonable length)
- Prevent reserved subdomain names (www, api, app, admin, etc.)
- Implement rate limiting for subdomain creation

### 2. SSL Certificates

- Ensure your SSL certificate supports wildcard subdomains
- Use Let's Encrypt or similar for automatic certificate management

## Monitoring and Maintenance

### 1. Subdomain Usage Tracking

Monitor subdomain creation and usage:
- Track which subdomains are active
- Monitor for abandoned subdomains
- Implement cleanup for inactive tenants

### 2. Performance Optimization

- Implement subdomain caching
- Use CDN for static assets
- Monitor subdomain-specific performance metrics

## Troubleshooting

### Common Issues

1. **Subdomain not resolving**: Check DNS propagation and wildcard record
2. **CORS errors**: Verify backend CORS configuration includes subdomains
3. **Tenant not found**: Check tenant resolution logic and database records
4. **SSL certificate errors**: Ensure wildcard SSL certificate is properly configured

### Debug Commands

```bash
# Test DNS resolution
nslookup test-clinic.vetvault.in

# Test API endpoint
curl -H "Host: test-clinic.vetvault.in" https://api.vetvault.in/api/tenant/current

# Check tenant in database
mongo your-database --eval "db.tenants.findOne({subdomain: 'test-clinic'})"
```

## Next Steps

1. Configure DNS wildcard records
2. Update Vercel configuration
3. Test subdomain creation flow
4. Monitor system performance
5. Implement additional security measures as needed 