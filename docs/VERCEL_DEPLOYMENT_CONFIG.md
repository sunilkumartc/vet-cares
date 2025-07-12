# Vercel Deployment Configuration Guide

This guide explains how to configure Vercel to communicate with your backend server.

## 🚀 Quick Setup

### 1. Environment Variables

Set these environment variables in your Vercel dashboard:

#### Required Variables:
```bash
VITE_API_URL=https://your-backend-domain.com
```

#### Optional Variables (depending on features used):
```bash
# AWS S3 (for file uploads)
VITE_AWS_REGION=us-east-1
VITE_AWS_BUCKET_NAME=your-s3-bucket-name

# WhatsApp Integration
VITE_WHATSAPP_API_URL=https://your-whatsapp-api.com

# Elasticsearch (for search features)
VITE_ELASTICSEARCH_URL=https://your-elasticsearch-domain.com

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_WHATSAPP=true
VITE_ENABLE_S3_UPLOAD=true
```

### 2. Backend Server Requirements

Your backend server must:

1. **Enable CORS** for your Vercel domain:
```javascript
app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Host']
}));
```

2. **Handle Subdomain-based Tenant Resolution**:
```javascript
app.use('/api/tenant/current', (req, res, next) => {
  const host = req.headers.host;
  const tenantSlug = host.split('.')[0];
  // Resolve tenant based on subdomain
  req.tenant = getTenantBySlug(tenantSlug);
  next();
});
```

3. **Support Host Header for Tenant Resolution**:
```javascript
app.use('/api/*', (req, res, next) => {
  const host = req.headers.host;
  const tenantSlug = host.split('.')[0];
  req.tenant = getTenantBySlug(tenantSlug);
  next();
});
```

## 🔧 Configuration Details

### Vercel Configuration (`vercel.json`)

The `vercel.json` file is configured to:

1. **Proxy API requests** to your backend server
2. **Handle CORS** properly
3. **Use environment variables** for dynamic configuration
4. **Support SPA routing** with fallback to `index.html`

### API Client Configuration

The frontend uses environment variables to determine the API base URL:

```javascript
// In src/lib/tenant.js
const apiUrl = import.meta.env.VITE_API_URL || '/api';
const response = await fetch(`${apiUrl}/tenant/current`);
```

### Tenant Resolution

The system supports multi-tenant architecture through:

1. **Subdomain-based routing**: `tenant-slug.your-domain.com`
2. **Host header forwarding**: Vercel forwards the original host header
3. **Dynamic tenant resolution**: Backend resolves tenant based on subdomain

## 🌐 Domain Configuration

### Custom Domain Setup

1. **Add custom domain** in Vercel dashboard
2. **Configure DNS** to point to Vercel
3. **Set up subdomains** for each tenant:
   - `tenant1.your-domain.com`
   - `tenant2.your-domain.com`
   - etc.

### Wildcard Subdomain Support

For dynamic tenant subdomains, configure your DNS provider to support wildcard subdomains:

```
*.your-domain.com  CNAME  your-vercel-app.vercel.app
```

## 🔒 Security Considerations

### CORS Configuration

Ensure your backend allows requests from:
- Your Vercel app domain
- Any custom domains you're using
- Local development domains (for testing)

### Environment Variable Security

- **Never commit** `.env` files to version control
- **Use Vercel's environment variable system** for production
- **Rotate secrets** regularly
- **Use different values** for development and production

### API Key Management

If using API keys:
1. Store them in Vercel environment variables
2. Use them only on the backend
3. Never expose them in frontend code

## 🧪 Testing Configuration

### Local Testing

1. **Set environment variables** in `.env.local`:
```bash
VITE_API_URL=http://localhost:3001
```

2. **Start backend server** on port 3001
3. **Start frontend** with `npm run dev`
4. **Test API calls** and tenant resolution

### Production Testing

1. **Deploy to Vercel** with environment variables set
2. **Test API connectivity** from production frontend
3. **Verify tenant resolution** works with subdomains
4. **Check CORS** is working properly

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check backend CORS configuration
   - Verify allowed origins include Vercel domain
   - Ensure credentials are properly configured

2. **API 404 Errors**:
   - Verify `VITE_API_URL` is set correctly
   - Check backend server is running and accessible
   - Confirm API routes exist on backend

3. **Tenant Resolution Issues**:
   - Check Host header is being forwarded
   - Verify subdomain parsing logic
   - Ensure tenant slugs exist in database

4. **Environment Variables Not Working**:
   - Check variable names start with `VITE_`
   - Verify variables are set in Vercel dashboard
   - Rebuild and redeploy after changing variables

### Debug Steps

1. **Check browser network tab** for failed requests
2. **Verify environment variables** in Vercel dashboard
3. **Test backend endpoints** directly
4. **Check server logs** for errors
5. **Verify DNS configuration** for custom domains

## 📚 Additional Resources

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Rewrites](https://vercel.com/docs/concepts/projects/project-configuration#rewrites)
- [CORS Configuration](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Multi-tenant Architecture](https://vercel.com/docs/concepts/solutions/multi-tenancy) 