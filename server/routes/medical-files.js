import express from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import { ObjectId } from 'mongodb';
import { dbUtils } from '../lib/mongodb.js';

const router = express.Router();

// Configure multer for medical file uploads
const medicalFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit for medical files
  },
  fileFilter: (req, file, cb) => {
    // Allow medical file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/tiff',
      'image/bmp',
      'application/dicom', // DICOM files for radiology
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed for medical documents`), false);
    }
  }
});

// AWS S3 Configuration
const getS3Config = () => {
  const AWS_S3_ACCESS_KEY_ID = process.env.AWS_S3_ACCESS_KEY_ID;
  const AWS_S3_SECRET_ACCESS_KEY = process.env.AWS_S3_SECRET_ACCESS_KEY;
  const AWS_S3_REGION = process.env.AWS_S3_REGION || 'eu-north-1';
  const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'vetinvoice';

  return {
    accessKeyId: AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
    region: AWS_S3_REGION,
    bucket: AWS_S3_BUCKET
  };
};

// Upload medical file endpoint
router.post('/upload-medical-file', medicalFileUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { fileName, category, tenant_id, ...metadataFields } = req.body;
    
    if (!fileName || !category || !tenant_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: fileName, category, tenant_id' 
      });
    }

    const s3Config = getS3Config();
    
    console.log('Medical file upload config:', {
      region: s3Config.region,
      bucket: s3Config.bucket,
      hasAccessKey: !!s3Config.accessKeyId,
      hasSecretKey: !!s3Config.secretAccessKey,
      fileSize: req.file.size,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      s3Path: fileName,
      category,
      tenant_id
    });

    const s3 = new AWS.S3({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region
    });

    // Extract metadata from form fields
    const metadata = {};
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('metadata_')) {
        const metadataKey = key.replace('metadata_', '');
        metadata[metadataKey] = req.body[key];
      }
    });

    const params = {
      Bucket: s3Config.bucket,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
      Metadata: {
        ...metadata,
        originalName: req.file.originalname,
        category: category,
        tenantId: tenant_id,
        uploadedAt: new Date().toISOString()
      }
    };

    console.log('Uploading to S3 with params:', {
      bucket: params.Bucket,
      key: params.Key,
      contentType: params.ContentType,
      acl: params.ACL,
      bodySize: req.file.buffer.length,
      metadata: params.Metadata
    });

    // Upload to S3
    const uploadResult = await s3.upload(params).promise();
    
    console.log('S3 upload successful:', uploadResult);

    // Generate public URL
    const publicUrl = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${fileName}`;
    
    // Save file record to database
    const fileRecord = {
      fileId: uploadResult.ETag.replace(/"/g, ''),
      fileName: req.file.originalname,
      s3Path: fileName,
      s3Key: uploadResult.Key,
      url: publicUrl,
      category: category,
      tenant_id: new ObjectId(tenant_id),
      size: req.file.size,
      contentType: req.file.mimetype,
      uploadedAt: new Date(),
      metadata: metadata,
      status: 'active'
    };

    const medicalFilesCollection = dbUtils.getCollection('medical_files');
    const dbResult = await medicalFilesCollection.insertOne(fileRecord);

    console.log('File record saved to database:', dbResult.insertedId);

    res.json({ 
      success: true, 
      fileId: fileRecord.fileId,
      url: publicUrl,
      fileName: req.file.originalname,
      s3Path: fileName,
      size: req.file.size,
      uploadedAt: fileRecord.uploadedAt,
      metadata: metadata,
      dbId: dbResult.insertedId
    });

  } catch (error) {
    console.error('Error uploading medical file:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId
    });
    
    // Provide specific error messages
    let errorMessage = 'Failed to upload medical file';
    if (error.code === 'NoSuchBucket') {
      errorMessage = 'S3 bucket does not exist';
    } else if (error.code === 'AccessDenied') {
      errorMessage = 'Access denied to S3 bucket - check credentials and permissions';
    } else if (error.code === 'InvalidAccessKeyId') {
      errorMessage = 'Invalid AWS access key ID';
    } else if (error.code === 'SignatureDoesNotMatch') {
      errorMessage = 'Invalid AWS secret access key';
    } else if (error.code === 'NetworkingError') {
      errorMessage = 'Network error connecting to AWS S3';
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: error.message 
    });
  }
});

// Delete medical file endpoint
router.delete('/delete-medical-file', async (req, res) => {
  try {
    const { fileId, category, tenant_id } = req.body;
    
    if (!fileId || !category || !tenant_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: fileId, category, tenant_id' 
      });
    }

    const s3Config = getS3Config();
    const s3 = new AWS.S3({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region
    });

    // Find file record in database
    const medicalFilesCollection = dbUtils.getCollection('medical_files');
    const fileRecord = await medicalFilesCollection.findOne({
      fileId: fileId,
      category: category,
      tenant_id: new ObjectId(tenant_id)
    });

    if (!fileRecord) {
      return res.status(404).json({ 
        success: false, 
        error: 'File record not found' 
      });
    }

    // Delete from S3
    const deleteParams = {
      Bucket: s3Config.bucket,
      Key: fileRecord.s3Path
    };

    await s3.deleteObject(deleteParams).promise();
    console.log('File deleted from S3:', fileRecord.s3Path);

    // Mark as deleted in database (soft delete)
    await medicalFilesCollection.updateOne(
      { _id: fileRecord._id },
      { $set: { status: 'deleted', deletedAt: new Date() } }
    );

    console.log('File marked as deleted in database:', fileRecord._id);

    res.json({ 
      success: true, 
      message: 'File deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting medical file:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete medical file',
      details: error.message 
    });
  }
});

// Get medical files endpoint
router.get('/medical-files', async (req, res) => {
  try {
    const { category, tenant_id, ...filters } = req.query;
    
    if (!category || !tenant_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: category, tenant_id' 
      });
    }

    const medicalFilesCollection = dbUtils.getCollection('medical_files');
    
    const query = {
      category: category,
      tenant_id: new ObjectId(tenant_id),
      status: 'active',
      ...filters
    };

    const files = await medicalFilesCollection.find(query)
      .sort({ uploadedAt: -1 })
      .toArray();

    console.log(`Found ${files.length} medical files for category: ${category}`);

    res.json({
      success: true,
      files: files,
      count: files.length
    });

  } catch (error) {
    console.error('Error getting medical files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get medical files',
      details: error.message 
    });
  }
});

// Get file metadata endpoint
router.get('/medical-files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { tenant_id } = req.query;
    
    if (!tenant_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameter: tenant_id' 
      });
    }

    const medicalFilesCollection = dbUtils.getCollection('medical_files');
    
    const fileRecord = await medicalFilesCollection.findOne({
      fileId: fileId,
      tenant_id: new ObjectId(tenant_id),
      status: 'active'
    });

    if (!fileRecord) {
      return res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }

    res.json({
      success: true,
      file: fileRecord
    });

  } catch (error) {
    console.error('Error getting file metadata:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get file metadata',
      details: error.message 
    });
  }
});

export default router; 