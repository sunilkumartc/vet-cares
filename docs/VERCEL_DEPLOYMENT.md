# Vercel Frontend Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, Bitbucket)
3. **Backend URL**: Your backend should be deployed and accessible

## Deployment Methods

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Navigate to client directory**:
   ```bash
   cd client
   ```

4. **Deploy**:
   ```bash
   vercel
   ```

5. **Follow the prompts**:
   - Choose "yes" to set up and deploy
   - Select your scope/account
   - Choose whether to link to existing project or create new
   - Confirm deployment settings

### Method 2: Vercel Dashboard

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Go to [vercel.com](https://vercel.com) and sign in**

3. **Click "New Project"**

4. **Import your repository**

5. **Configure the project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. **Add Environment Variables**:
   - `VITE_API_URL`: Your backend API URL (e.g., `https://your-backend.vercel.app`)

7. **Click "Deploy"**

## Configuration

### vercel.json
The `vercel.json` file in the client directory contains:
- Build configuration for Vite
- API rewrites to proxy backend requests
- CORS headers
- Environment variables

### Environment Variables

Set these in your Vercel project settings:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-backend.vercel.app` |

## Post-Deployment

### 1. Update Backend URL
After deployment, update the `vercel.json` file with your actual backend URL:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-actual-backend.com/api/$1"
    }
  ],
  "env": {
    "VITE_API_URL": "https://your-actual-backend.com"
  }
}
```

### 2. Redeploy
After updating the configuration:
```bash
vercel --prod
```

## Custom Domain (Optional)

1. **Go to your Vercel project dashboard**
2. **Click "Settings" → "Domains"**
3. **Add your custom domain**
4. **Follow DNS configuration instructions**

## Troubleshooting

### Build Errors
- Check that all dependencies are in `package.json`
- Ensure Node.js version is compatible (Vercel uses Node.js 18.x by default)

### API Connection Issues
- Verify `VITE_API_URL` environment variable is set correctly
- Check CORS configuration on your backend
- Ensure backend is accessible from Vercel's servers

### Environment Variables Not Working
- Environment variables must be prefixed with `VITE_` to be accessible in the frontend
- Redeploy after adding new environment variables

## Production Checklist

- [ ] Backend is deployed and accessible
- [ ] Environment variables are configured
- [ ] API endpoints are working
- [ ] CORS is properly configured
- [ ] Custom domain is set up (if needed)
- [ ] SSL certificate is active
- [ ] Performance is optimized

## Useful Commands

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# List deployments
vercel ls

# View deployment logs
vercel logs

# Remove deployment
vercel remove
``` 