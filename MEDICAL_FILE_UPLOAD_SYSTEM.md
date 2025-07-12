# Medical File Upload System

## Overview

The Medical File Upload System provides a comprehensive solution for uploading, storing, and managing medical documents (lab reports, radiology reports, and other documents) in the veterinary care management system. It features multi-tenant S3 storage with proper directory structure, file validation, preview capabilities, and secure access controls.

## Features

### 🚀 **Core Features**
- **Multi-tenant S3 Storage**: Organized directory structure per tenant
- **Drag & Drop Upload**: Modern file upload interface with drag-and-drop support
- **File Validation**: Type and size validation for medical documents
- **File Preview**: Preview images and PDFs directly in the browser
- **Progress Tracking**: Real-time upload progress indicators
- **Error Handling**: Comprehensive error messages and validation
- **File Management**: Upload, view, and delete medical files

### 📁 **Supported File Types**
- **PDF Documents**: Lab reports, medical reports, prescriptions
- **Images**: X-rays, ultrasound images, photos (JPG, PNG, GIF, TIFF, BMP)
- **Word Documents**: Medical reports, notes (.doc, .docx)
- **Text Files**: Simple reports and notes (.txt)
- **DICOM Files**: Radiology images and medical imaging data

### 🏗️ **S3 Directory Structure**

```
medical-records/
├── {tenant_id}/
│   ├── lab-reports/
│   │   ├── 2024/
│   │   │   ├── 01/
│   │   │   │   ├── lab-reports_2024-01-15T10-30-45-123Z.pdf
│   │   │   │   └── lab-reports_2024-01-15T14-22-18-456Z.jpg
│   │   │   └── 02/
│   │   └── 2023/
│   ├── radiology-reports/
│   │   ├── 2024/
│   │   │   ├── 01/
│   │   │   │   ├── radiology-reports_2024-01-15T09-15-30-789Z.pdf
│   │   │   │   └── radiology-reports_2024-01-15T11-45-12-012Z.dcm
│   │   └── 2023/
│   └── other-documents/
│       ├── 2024/
│       │   ├── 01/
│       │   │   ├── other-documents_2024-01-15T16-20-33-345Z.docx
│       │   │   └── other-documents_2024-01-15T17-05-47-678Z.txt
│       └── 2023/
```

## Architecture

### Frontend Components

#### 1. **MedicalFileUpload Component**
```javascript
// Location: client/src/components/medical-records/MedicalFileUpload.jsx
// Features: Drag & drop, file validation, progress tracking, preview
```

#### 2. **Medical File Upload API**
```javascript
// Location: client/src/api/medicalFileUpload.js
// Features: S3 upload, file management, validation helpers
```

#### 3. **Document Viewer Component**
```javascript
// Location: client/src/components/medical-records/DocumentViewer.jsx
// Features: PDF preview, image display, download functionality
```

### Backend API

#### 1. **Medical Files Routes**
```javascript
// Location: server/routes/medical-files.js
// Endpoints:
// - POST /api/upload-medical-file
// - DELETE /api/delete-medical-file
// - GET /api/medical-files
// - GET /api/medical-files/:fileId
```

#### 2. **Database Schema**
```javascript
// Collection: medical_files
{
  _id: ObjectId,
  fileId: String,           // S3 ETag
  fileName: String,         // Original file name
  s3Path: String,          // S3 key path
  s3Key: String,           // S3 object key
  url: String,             // Public S3 URL
  category: String,        // lab-reports, radiology-reports, other-documents
  tenant_id: ObjectId,     // Tenant reference
  size: Number,            // File size in bytes
  contentType: String,     // MIME type
  uploadedAt: Date,        // Upload timestamp
  metadata: Object,        // Additional metadata
  status: String           // active, deleted
}
```

## Usage

### 1. **Basic File Upload**

```javascript
import MedicalFileUpload from '@/components/medical-records/MedicalFileUpload';
import { TestTube2 } from 'lucide-react';

function MedicalRecordForm() {
  const handleFilesChange = (files) => {
    console.log('Uploaded files:', files);
    // Update form data with file URLs
  };

  return (
    <MedicalFileUpload
      category="lab-reports"
      title="Lab Reports"
      icon={TestTube2}
      onFilesChange={handleFilesChange}
      existingFiles={[]}
      maxFiles={10}
      maxSizeMB={15}
    />
  );
}
```

### 2. **API Usage**

```javascript
import medicalFileUploadAPI from '@/api/medicalFileUpload';

// Upload a lab report
const uploadLabReport = async (file) => {
  try {
    const result = await medicalFileUploadAPI.uploadLabReport(file, {
      testType: 'Blood Chemistry',
      labName: 'ABC Veterinary Lab',
      orderedBy: 'Dr. Smith'
    });
    
    console.log('Upload successful:', result);
    return result.url;
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

// Delete a file
const deleteFile = async (fileId, category) => {
  try {
    await medicalFileUploadAPI.deleteMedicalFile(fileId, category);
    console.log('File deleted successfully');
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
```

### 3. **File Validation**

```javascript
// Validate file type and size
const validateFile = (file) => {
  try {
    medicalFileUploadAPI.validateFileType(file);
    medicalFileUploadAPI.validateFileSize(file, 15); // 15MB limit
    return true;
  } catch (error) {
    console.error('Validation failed:', error.message);
    return false;
  }
};
```

## Configuration

### Environment Variables

```bash
# AWS S3 Configuration
AWS_S3_ACCESS_KEY_ID=your_access_key
AWS_S3_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_REGION=eu-north-1
AWS_S3_BUCKET=vetinvoice

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/vet_cares
```

### S3 Bucket Setup

1. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://vetinvoice --region eu-north-1
   ```

2. **Configure CORS**:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

3. **Set Bucket Policy** (for public read access):
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

## Security Considerations

### 1. **File Access Control**
- Files are organized by tenant ID
- Each tenant can only access their own files
- Public read access for medical document sharing

### 2. **File Validation**
- File type validation on both frontend and backend
- File size limits (15MB per file)
- MIME type verification

### 3. **Data Protection**
- Files stored in S3 with proper ACL settings
- Database records with tenant isolation
- Soft delete functionality for audit trails

## Error Handling

### Common Error Scenarios

1. **File Type Not Allowed**:
   ```
   Error: File type .exe is not allowed. Allowed types: pdf, jpg, jpeg, png, gif, tiff, bmp
   ```

2. **File Too Large**:
   ```
   Error: File size 25.5MB exceeds maximum allowed size of 15MB
   ```

3. **S3 Upload Failed**:
   ```
   Error: Access denied to S3 bucket - check credentials and permissions
   ```

4. **Tenant Not Found**:
   ```
   Error: No tenant found
   ```

### Error Recovery

- **Upload Retry**: Failed uploads can be retried
- **Partial Uploads**: Progress tracking allows resuming uploads
- **Validation Errors**: Clear error messages guide users

## Performance Optimization

### 1. **File Compression**
- Images are served directly from S3
- PDFs maintain original quality for medical accuracy

### 2. **Caching**
- S3 provides global CDN distribution
- Browser caching for frequently accessed files

### 3. **Batch Operations**
- Multiple file uploads in parallel
- Progress tracking for large uploads

## Monitoring and Logging

### 1. **Upload Metrics**
- File size distribution
- Upload success/failure rates
- Popular file types

### 2. **Error Tracking**
- Failed upload attempts
- Validation errors
- S3 access issues

### 3. **Storage Analytics**
- Storage usage per tenant
- File retention policies
- Cost optimization

## Testing

### 1. **Unit Tests**
```javascript
// Test file validation
test('should validate PDF files', () => {
  const file = new File([''], 'test.pdf', { type: 'application/pdf' });
  expect(medicalFileUploadAPI.validateFileType(file)).toBe(true);
});

// Test file size validation
test('should reject oversized files', () => {
  const largeFile = new File(['x'.repeat(20 * 1024 * 1024)], 'large.pdf');
  expect(() => medicalFileUploadAPI.validateFileSize(largeFile, 15)).toThrow();
});
```

### 2. **Integration Tests**
```javascript
// Test complete upload flow
test('should upload file to S3 and save to database', async () => {
  const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
  const result = await medicalFileUploadAPI.uploadMedicalFile(file, 'lab-reports');
  
  expect(result.url).toContain('s3.amazonaws.com');
  expect(result.fileName).toBe('test.pdf');
});
```

## Deployment

### 1. **Frontend Deployment**
```bash
# Build the client
cd client
npm run build

# Deploy to Vercel/Netlify
vercel --prod
```

### 2. **Backend Deployment**
```bash
# Deploy server
cd server
npm install
npm start
```

### 3. **Environment Setup**
```bash
# Set environment variables
export AWS_S3_ACCESS_KEY_ID=your_key
export AWS_S3_SECRET_ACCESS_KEY=your_secret
export AWS_S3_REGION=eu-north-1
export AWS_S3_BUCKET=vetinvoice
```

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check S3 bucket CORS configuration
   - Verify allowed origins in server CORS settings

2. **Upload Failures**:
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Ensure bucket exists in specified region

3. **File Preview Issues**:
   - Check file URL accessibility
   - Verify Content-Type headers
   - Test with different browsers

### Debug Commands

```bash
# Test S3 connectivity
node scripts/test-s3-connectivity.js

# Test file upload
node scripts/test-s3-upload.js

# Check database records
mongo vet_cares --eval "db.medical_files.find().pretty()"
```

## Future Enhancements

### 1. **Advanced Features**
- **OCR Processing**: Extract text from scanned documents
- **Image Analysis**: AI-powered image analysis for radiology
- **Version Control**: File versioning and change tracking
- **Collaboration**: Multi-user file sharing and comments

### 2. **Performance Improvements**
- **Chunked Uploads**: Large file uploads in chunks
- **Resumable Uploads**: Resume interrupted uploads
- **Background Processing**: Async file processing

### 3. **Security Enhancements**
- **Encryption**: Client-side and server-side encryption
- **Access Control**: Fine-grained permissions
- **Audit Logging**: Comprehensive access logs

## Support

For technical support or questions about the Medical File Upload System:

1. **Documentation**: Check this file and inline code comments
2. **Logs**: Review server logs for detailed error information
3. **Testing**: Use provided test scripts to verify functionality
4. **Issues**: Report bugs with detailed error messages and steps to reproduce

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Maintainer**: Veterinary Care Management System Team 