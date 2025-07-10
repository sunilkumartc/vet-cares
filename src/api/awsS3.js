// AWS S3 configuration and upload utilities
// 
// This service uses the backend API endpoint for secure uploads
// The backend handles the actual AWS SDK integration

// AWS S3 Configuration
const AWS_S3_ACCESS_KEY_ID = 'AKIA457W7TET5LOMDM6H';
const AWS_S3_SECRET_ACCESS_KEY = '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';
const AWS_S3_BUCKET = 'vetinvoice';
const AWS_S3_REGION = 'eu-north-1';

// Upload file to AWS S3 with public-read ACL via backend API
export const uploadToS3 = async (file, fileName) => {
  try {
    console.log('Uploading to S3 via backend API:', { 
      fileName, 
      fileSize: file.size, 
      fileType: file.type,
      fileName: file.name 
    });
    
    // Validate file
    if (!file || !file.size) {
      throw new Error('Invalid file: file is empty or undefined');
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('contentType', file.type || 'application/pdf');
    
    console.log('FormData created:', {
      hasFile: formData.has('file'),
      hasFileName: formData.has('fileName'),
      hasContentType: formData.has('contentType')
    });
    
    // Upload via backend API
    const response = await fetch('/api/upload-to-s3', {
      method: 'POST',
      body: formData
    });
    
    console.log('Backend response status:', response.status);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('S3 upload failed with status:', response.status, errorData);
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Backend response data:', result);
    
    if (!result.success) {
      console.error('S3 upload failed:', result);
      throw new Error(result.error || 'Upload failed');
    }
    
    console.log('S3 upload successful:', result);
    
    return {
      success: true,
      url: result.url,
      fileName: result.fileName,
      bucket: result.bucket,
      isPublic: result.isPublic,
      acl: result.acl,
      size: result.size
    };
  } catch (error) {
    console.error('Error uploading to S3:', {
      message: error.message,
      stack: error.stack,
      fileName: fileName,
      fileSize: file?.size,
      fileType: file?.type
    });
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// Test S3 connectivity
export const testS3Connectivity = async () => {
  try {
    console.log('Testing S3 connectivity...');
    
    const response = await fetch('/api/test-s3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Test failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'S3 connectivity test failed');
    }
    
    console.log('S3 connectivity test successful:', result);
    return result;
    
  } catch (error) {
    console.error('S3 connectivity test failed:', error);
    throw error;
  }
};

// Generate a unique filename for the invoice PDF
export const generateInvoiceFileName = (invoiceNumber, tenantId) => {
  const timestamp = Date.now();
  const sanitizedInvoiceNumber = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
  return `invoices/${tenantId}/${sanitizedInvoiceNumber}_${timestamp}.pdf`;
};

// Real S3 upload implementation (for backend use)
export const uploadToS3Real = async (fileBuffer, fileName, contentType = 'application/pdf') => {
  try {
    console.log('Real S3 upload starting:', { fileName, contentType, fileSize: fileBuffer.length });
    
    // Use AWS SDK for S3
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
      region: AWS_S3_REGION
    });
    
    const params = {
      Bucket: AWS_S3_BUCKET,
      Key: fileName,
      Body: fileBuffer,
      ACL: 'public-read',  // 👈 key part for public access
      ContentType: contentType,
    };
    
    console.log('S3 upload params:', {
      Bucket: params.Bucket,
      Key: params.Key,
      ACL: params.ACL,
      ContentType: params.ContentType,
      BodySize: fileBuffer.length
    });
    
    const result = await s3.putObject(params).promise();
    
    console.log('S3 upload successful:', result);
    
    const publicUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${fileName}`;
    
    return {
      success: true,
      url: publicUrl,
      fileName: fileName,
      bucket: AWS_S3_BUCKET,
      isPublic: true,
      acl: 'public-read',
      etag: result.ETag
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// Delete file from S3
export const deleteFromS3 = async (fileName) => {
  try {
    console.log('Mock S3 delete:', { fileName });
    
    // In a real implementation, you would use:
    // const params = {
    //   Bucket: AWS_S3_BUCKET,
    //   Key: fileName
    // };
    // 
    // const result = await s3.deleteObject(params).promise();
    
    return {
      success: true,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw new Error('Failed to delete file from S3');
  }
};

// Get file info from S3
export const getFileInfo = async (fileName) => {
  try {
    console.log('Mock S3 file info:', { fileName });
    
    // In a real implementation, you would use:
    // const params = {
    //   Bucket: AWS_S3_BUCKET,
    //   Key: fileName
    // };
    // 
    // const result = await s3.headObject(params).promise();
    
    return {
      success: true,
      fileName: fileName,
      size: 1024, // Mock size
      lastModified: new Date().toISOString(),
      contentType: 'application/pdf'
    };
  } catch (error) {
    console.error('Error getting file info from S3:', error);
    throw new Error('Failed to get file info from S3');
  }
}; 