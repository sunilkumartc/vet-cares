# AWS S3 Integration for Invoice Uploads

## Overview
This document describes the AWS S3 integration that replaces Cloudflare R2 for invoice PDF uploads. The integration ensures that uploaded invoice PDFs are publicly accessible with `public-read` ACL.

## Configuration

### AWS S3 Credentials
```javascript
AWS_S3_ACCESS_KEY_ID = 'AKIA457W7TET5LOMDM6H'
AWS_S3_SECRET_ACCESS_KEY = '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'
AWS_S3_BUCKET = 'vetinvoice'
AWS_S3_REGION = 'eu-north-1'
```

### Environment Variables
Set these environment variables in production:
```bash
AWS_S3_ACCESS_KEY_ID=your_access_key_id
AWS_S3_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=your_bucket_name
AWS_S3_REGION=your_region
```

## Implementation

### Backend API Endpoint
**Route:** `POST /api/upload-to-s3`

**Purpose:** Secure file upload to AWS S3 with public-read ACL

**Request:**
- `file`: PDF file (multipart/form-data)
- `fileName`: Desired filename in S3
- `contentType`: File content type (default: application/pdf)

**Response:**
```json
{
  "success": true,
  "url": "https://bucket-name.s3.eu-north-1.amazonaws.com/file-path",
  "fileName": "invoices/tenant/invoice_123_1234567890.pdf",
      "bucket": "vetinvoice",
  "isPublic": true,
  "acl": "public-read",
  "size": 1024
}
```

### Frontend Service
**File:** `src/api/awsS3.js`

**Key Functions:**
- `uploadToS3(file, fileName)`: Upload file via backend API
- `generateInvoiceFileName(invoiceNumber, tenantId)`: Generate unique filename
- `deleteFromS3(fileName)`: Delete file from S3
- `getFileInfo(fileName)`: Get file metadata

### Invoice Service Integration
**File:** `src/services/invoiceService.js`

**Process:**
1. Generate PDF using jsPDF
2. Upload PDF to S3 with public-read ACL
3. Get public URL for sharing
4. Send invoice via WhatsApp with public URL
5. Update invoice record with PDF URL

## Key Features

### Public Read Access
```javascript
const params = {
  Bucket: AWS_S3_BUCKET,
  Key: fileName,
  Body: fileBuffer,
  ACL: 'public-read',  // 👈 key part for public access
  ContentType: contentType,
};
```

### Tenant-Based Organization
Files are organized by tenant:
```
invoices/
├── clinic1/
│   ├── INV-001_1234567890.pdf
│   └── INV-002_1234567891.pdf
├── clinic2/
│   ├── INV-003_1234567892.pdf
│   └── INV-004_1234567893.pdf
└── default/
    ├── INV-005_1234567894.pdf
    └── INV-006_1234567895.pdf
```

### Secure Upload
- Credentials stored on backend only
- Frontend uses API endpoint for uploads
- No direct AWS SDK access from frontend

## Setup Instructions

### 1. Create S3 Bucket
```bash
# Using AWS CLI
aws s3 mb s3://vetinvoice --region eu-north-1
```

### 2. Configure Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::vetinvoice/*"
    }
  ]
}
```

### 3. Install AWS SDK (for production)
```bash
npm install aws-sdk
```

### 4. Update Backend Code
Uncomment the AWS SDK implementation in `server.js`:
```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
  region: AWS_S3_REGION
});

const params = {
  Bucket: AWS_S3_BUCKET,
  Key: fileName,
  Body: req.file.buffer,
  ACL: 'public-read',
  ContentType: contentType,
};

const result = await s3.putObject(params).promise();
```

## Usage Example

### Sending an Invoice
```javascript
import { sendInvoice } from '../services/invoiceService.js';

// Send invoice with PDF upload to S3
const result = await sendInvoice(invoiceId);

console.log('Invoice sent successfully!');
console.log('PDF URL:', result.pdfUrl);
console.log('Storage:', result.storage);
```

### Manual Upload
```javascript
import { uploadToS3, generateInvoiceFileName } from '../api/awsS3.js';

const fileName = generateInvoiceFileName('INV-001', 'clinic1');
const result = await uploadToS3(pdfFile, fileName);

console.log('Upload successful:', result.url);
```

## Security Considerations

### Production Security
1. **Environment Variables:** Store credentials in environment variables
2. **IAM Roles:** Use IAM roles instead of access keys when possible
3. **Bucket Policies:** Restrict bucket access appropriately
4. **CORS Configuration:** Configure CORS for web access
5. **HTTPS Only:** Ensure all uploads use HTTPS

### CORS Configuration
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": []
  }
]
```

## Migration from Cloudflare R2

### Changes Made
1. **Replaced R2 service** with S3 service
2. **Updated invoice service** to use S3
3. **Added backend API endpoint** for secure uploads
4. **Maintained public access** with ACL configuration

### File Changes
- `src/api/cloudflareR2.js` → `src/api/awsS3.js`
- `src/services/invoiceService.js` (updated imports)
- `server.js` (added upload endpoint)

## Testing

### Test Upload
```bash
# Test the upload endpoint
curl -X POST http://localhost:3001/api/upload-to-s3 \
  -F "file=@test.pdf" \
  -F "fileName=test/invoice.pdf" \
  -F "contentType=application/pdf"
```

### Verify Public Access
After upload, the file should be accessible at:
```
https://vetinvoice.s3.eu-north-1.amazonaws.com/invoice/test/invoice.pdf
```

## Troubleshooting

### Common Issues
1. **Access Denied:** Check IAM permissions and bucket policy
2. **CORS Errors:** Configure CORS policy for the bucket
3. **Upload Failures:** Verify credentials and bucket existence
4. **Public Access:** Ensure ACL is set to 'public-read'

### Debug Logs
Enable debug logging in the backend:
```javascript
console.log('S3 upload details:', {
  fileName,
  contentType,
  fileSize: req.file.size,
  bucket: AWS_S3_BUCKET
});
```

## Future Enhancements

### Planned Features
1. **File Versioning:** Enable S3 versioning for file history
2. **Lifecycle Policies:** Automatic cleanup of old files
3. **CDN Integration:** CloudFront for faster access
4. **Encryption:** Server-side encryption for sensitive files
5. **Backup Strategy:** Cross-region replication

### Monitoring
- CloudWatch metrics for upload success/failure
- S3 access logs for usage analytics
- Error tracking and alerting 