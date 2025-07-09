# Cloudflare R2 Setup Guide for Public Invoice Access

## Overview

This guide explains how to set up Cloudflare R2 storage with public access for the Send Invoice feature, allowing customers to directly access invoice PDFs via WhatsApp links.

## Prerequisites

- Cloudflare account with R2 enabled
- Domain name (optional, for custom URLs)

## Step 1: Create R2 Bucket

1. **Login to Cloudflare Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to R2 Object Storage

2. **Create New Bucket**
   - Click "Create bucket"
   - Name: `vetvault` (your bucket name)
   - Region: Choose closest to your customers
   - Click "Create bucket"

## Step 2: Configure Public Access

### Option A: Public Bucket (Recommended for Invoices)

1. **Enable Public Access**
   - Go to your bucket settings
   - Find "Public Access" section
   - Enable "Allow public access to this bucket"
   - This makes all objects in the bucket publicly readable

2. **Set CORS Policy** (if needed)
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### Option B: Custom Domain (Professional Setup)

1. **Add Custom Domain**
   - In bucket settings, go to "Custom Domains"
   - Add your domain (e.g., `invoices.yourdomain.com`)
   - Follow DNS setup instructions

2. **Configure DNS**
   - Add CNAME record pointing to your R2 bucket
   - Example: `invoices.yourdomain.com` → `your-bucket.your-account.r2.cloudflarestorage.com`

## Step 3: Update Application Configuration

### Update R2 Configuration

In `src/api/cloudflareR2.js`, update the public URL:

```javascript
// For public bucket (using your public development URL)
const publicUrl = `https://pub-789907abe82641e3ad3de48abf37b9a8.r2.dev/vetvault/invoices/${fileName.split('/').pop()}`;

// For custom domain (optional)
const publicUrl = `https://invoices.yourdomain.com/invoices/${fileName.split('/').pop()}`;
```

### Environment Variables

Set these in your production environment:

```bash
CLOUDFLARE_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_BUCKET=vetvault
CLOUDFLARE_ACCOUNT_ID=63a5108742d66ea812f09f4fd0e506fa
CLOUDFLARE_PUBLIC_URL=https://pub-789907abe82641e3ad3de48abf37b9a8.r2.dev
```

## Step 4: Security Considerations

### Public Access Security

Since invoice PDFs will be publicly accessible:

1. **Use Unique Filenames**: Include invoice number and timestamp
2. **No Sensitive Data**: Ensure PDFs don't contain sensitive information beyond invoice details
3. **Access Logging**: Monitor bucket access logs for unusual activity
4. **Expiration**: Consider setting object lifecycle policies for old invoices

### Recommended Filename Format

```javascript
const fileName = `invoices/${tenant.slug}/${invoice.invoice_number}_${Date.now()}.pdf`;
```

## Step 5: Testing

### Test Public Access

1. **Upload Test File**
   - Use the Send Invoice feature to send a test invoice
   - Check if PDF is accessible via the generated URL

2. **Verify WhatsApp Link**
   - Send test invoice via WhatsApp
   - Click the link to ensure it opens the PDF

3. **Check Mobile Access**
   - Test the link on mobile devices
   - Ensure PDF displays correctly on WhatsApp

## Troubleshooting

### Common Issues

1. **403 Forbidden**
   - Check bucket public access settings
   - Verify CORS configuration
   - Ensure object permissions are correct

2. **404 Not Found**
   - Verify file was uploaded successfully
   - Check URL format and bucket name
   - Ensure custom domain DNS is configured correctly

3. **CORS Errors**
   - Update CORS policy in bucket settings
   - Add your domain to allowed origins

### Debug Steps

1. **Check Upload Logs**
   ```javascript
   console.log('Upload result:', uploadResult);
   ```

2. **Verify URL Generation**
   ```javascript
   console.log('Public URL:', uploadResult.url);
   ```

3. **Test Direct Access**
   - Copy the generated URL and paste in browser
   - Should display PDF directly

## Production Checklist

- [ ] R2 bucket created with public access
- [ ] Custom domain configured (optional)
- [ ] CORS policy set correctly
- [ ] Environment variables configured
- [ ] Application code updated with correct URLs
- [ ] Test invoice sent successfully
- [ ] WhatsApp link works on mobile
- [ ] Access logs monitored
- [ ] Security policies reviewed

## Cost Considerations

- **Storage**: ~$0.015 per GB per month
- **Class A Operations** (uploads): ~$4.50 per million
- **Class B Operations** (downloads): ~$0.36 per million
- **Bandwidth**: First 10GB free, then $0.08 per GB

For typical veterinary practice usage, costs should be minimal.

---

**Note**: This setup provides the best user experience for customers receiving invoices via WhatsApp, as they can access PDFs directly without authentication. 