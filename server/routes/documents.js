import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import path from 'path';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../config/aws.js';

const router = express.Router();

// Configure multer for document uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    // Allow various document types
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload PDF, images, or document files.'), false);
    }
  },
});

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper function to calculate document age
const calculateAge = (createdAt) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} days ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

// Helper function to check expiry status
const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return 'no-expiry';
  
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring-soon';
  return 'valid';
};

// GET /api/documents - Get all documents for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, petId, search } = req.query;
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');

    const query = { 
      'ownerId': new ObjectId(req.user.userId),
      isActive: true 
    };

    // Add filters
    if (type) {
      query.type = type;
    }
    
    if (petId) {
      query.petId = new ObjectId(petId);
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Aggregate to populate pet and owner details
    const documents = await documentsCollection.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'pets',
          localField: 'petId',
          foreignField: '_id',
          as: 'petDetails'
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          petId: {
            $cond: {
              if: { $gt: [{ $size: '$petDetails' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$petDetails._id', 0] },
                name: { $arrayElemAt: ['$petDetails.name', 0] },
                species: { $arrayElemAt: ['$petDetails.species', 0] },
                breed: { $arrayElemAt: ['$petDetails.breed', 0] }
              },
              else: null
            }
          },
          ownerId: {
            $cond: {
              if: { $gt: [{ $size: '$ownerDetails' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$ownerDetails._id', 0] },
                name: { $arrayElemAt: ['$ownerDetails.first_name', 0] },
                email: { $arrayElemAt: ['$ownerDetails.email', 0] },
                phone: { $arrayElemAt: ['$ownerDetails.phone', 0] }
              },
              else: null
            }
          },
          fileSizeFormatted: '$file.size',
          age: '$createdAt',
          expiryStatus: '$metadata.expiryDate'
        }
      },
      { $project: { petDetails: 0, ownerDetails: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    // Add virtual fields and generate signed URLs
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        // Add virtual fields
        doc.fileSizeFormatted = formatFileSize(doc.file.size);
        doc.age = calculateAge(doc.createdAt);
        doc.expiryStatus = getExpiryStatus(doc.metadata.expiryDate);
        
        // Generate signed URL for document access
        if (doc.file && doc.file.s3Key) {
          try {
            doc.file.url = await getSignedUrl(doc.file.s3Key, 3600); // 1 hour expiry
          } catch (error) {
            console.warn('Failed to generate signed URL for document:', error);
            doc.file.url = null;
          }
        }
        return doc;
      })
    );

    const total = await documentsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        documents: documentsWithUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving documents'
    });
  }
});

// GET /api/documents/pet/:petId - Get documents for specific pet
router.get('/pet/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');
    const petsCollection = db.collection('pets');

    // Verify pet belongs to user
    const pet = await petsCollection.findOne({
      _id: new ObjectId(petId),
      ownerId: req.user.userId,
      isActive: true
    });

    if (!pet) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    const query = {
      petId: new ObjectId(petId),
      'ownerId': new ObjectId(req.user.userId),
      isActive: true
    };

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Aggregate to populate details
    const documents = await documentsCollection.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'pets',
          localField: 'petId',
          foreignField: '_id',
          as: 'petDetails'
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          petId: {
            _id: { $arrayElemAt: ['$petDetails._id', 0] },
            name: { $arrayElemAt: ['$petDetails.name', 0] },
            species: { $arrayElemAt: ['$petDetails.species', 0] },
            breed: { $arrayElemAt: ['$petDetails.breed', 0] }
          },
          ownerId: {
            _id: { $arrayElemAt: ['$ownerDetails._id', 0] },
            name: { $arrayElemAt: ['$ownerDetails.first_name', 0] },
            email: { $arrayElemAt: ['$ownerDetails.email', 0] },
            phone: { $arrayElemAt: ['$ownerDetails.phone', 0] }
          }
        }
      },
      { $project: { petDetails: 0, ownerDetails: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    // Add virtual fields and generate signed URLs
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        doc.fileSizeFormatted = formatFileSize(doc.file.size);
        doc.age = calculateAge(doc.createdAt);
        doc.expiryStatus = getExpiryStatus(doc.metadata.expiryDate);
        
        if (doc.file && doc.file.s3Key) {
          try {
            doc.file.url = await getSignedUrl(doc.file.s3Key, 3600);
          } catch (error) {
            console.warn('Failed to generate signed URL for document:', error);
            doc.file.url = null;
          }
        }
        return doc;
      })
    );

    const total = await documentsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        documents: documentsWithUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get pet documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving pet documents'
    });
  }
});

// POST /api/documents/upload - Upload document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { petId, type, title, description, expiryDate } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    if (!petId || !type || !title) {
      return res.status(400).json({
        success: false,
        message: 'Pet ID, type, and title are required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');
    const petsCollection = db.collection('pets');

    // Verify pet belongs to user
    const pet = await petsCollection.findOne({
      _id: new ObjectId(petId),
      ownerId: req.user.userId,
      isActive: true
    });

    if (!pet) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    // Upload file to S3
    const s3Result = await uploadToS3(req.file, 'pet-documents');

    // Get file extension
    const extension = path.extname(req.file.originalname).toLowerCase();

    // Create document record
    const newDocument = {
      petId: new ObjectId(petId),
      ownerId: new ObjectId(req.user.userId),
      type: type.trim(),
      title: title.trim(),
      description: description ? description.trim() : null,
      file: {
        originalName: req.file.originalname,
        fileName: s3Result.fileName,
        s3Key: s3Result.key,
        url: s3Result.url,
        size: req.file.size,
        mimeType: req.file.mimetype,
        extension: extension
      },
      metadata: {
        uploadedBy: req.user.userId,
        source: 'owner',
        date: new Date().toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        tags: []
      },
      access: {
        isPublic: false,
        sharedWith: []
      },
      status: 'active',
      version: 1,
      isActive: true,
      previousVersions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await documentsCollection.insertOne(newDocument);

    // Fetch the created document with populated fields
    const createdDocument = await documentsCollection.aggregate([
      { $match: { _id: result.insertedId } },
      {
        $lookup: {
          from: 'pets',
          localField: 'petId',
          foreignField: '_id',
          as: 'petDetails'
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          petId: {
            _id: { $arrayElemAt: ['$petDetails._id', 0] },
            name: { $arrayElemAt: ['$petDetails.name', 0] },
            species: { $arrayElemAt: ['$petDetails.species', 0] },
            breed: { $arrayElemAt: ['$petDetails.breed', 0] }
          },
          ownerId: {
            _id: { $arrayElemAt: ['$ownerDetails._id', 0] },
            name: { $arrayElemAt: ['$ownerDetails.first_name', 0] },
            email: { $arrayElemAt: ['$ownerDetails.email', 0] },
            phone: { $arrayElemAt: ['$ownerDetails.phone', 0] }
          }
        }
      },
      { $project: { petDetails: 0, ownerDetails: 0 } }
    ]).toArray();

    const document = createdDocument[0];

    // Add virtual fields
    document.fileSizeFormatted = formatFileSize(document.file.size);
    document.age = calculateAge(document.createdAt);
    document.expiryStatus = getExpiryStatus(document.metadata.expiryDate);

    // Generate signed URL
    try {
      document.file.url = await getSignedUrl(document.file.s3Key, 3600);
    } catch (error) {
      console.warn('Failed to generate signed URL for uploaded document:', error);
    }

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document
    });

  } catch (error) {
    console.error('Upload document error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB'
      });
    }

    if (error.message === 'File type not allowed. Please upload PDF, images, or document files.') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while uploading document'
    });
  }
});

// GET /api/documents/:documentId - Get specific document
router.get('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');

    // Get document with populated fields
    const documents = await documentsCollection.aggregate([
      { 
        $match: { 
          _id: new ObjectId(documentId),
          'ownerId': new ObjectId(req.user.userId),
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'pets',
          localField: 'petId',
          foreignField: '_id',
          as: 'petDetails'
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          petId: {
            _id: { $arrayElemAt: ['$petDetails._id', 0] },
            name: { $arrayElemAt: ['$petDetails.name', 0] },
            species: { $arrayElemAt: ['$petDetails.species', 0] },
            breed: { $arrayElemAt: ['$petDetails.breed', 0] }
          },
          ownerId: {
            _id: { $arrayElemAt: ['$ownerDetails._id', 0] },
            name: { $arrayElemAt: ['$ownerDetails.first_name', 0] },
            email: { $arrayElemAt: ['$ownerDetails.email', 0] },
            phone: { $arrayElemAt: ['$ownerDetails.phone', 0] }
          }
        }
      },
      { $project: { petDetails: 0, ownerDetails: 0 } }
    ]).toArray();

    if (documents.length === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = documents[0];

    // Add virtual fields
    document.fileSizeFormatted = formatFileSize(document.file.size);
    document.age = calculateAge(document.createdAt);
    document.expiryStatus = getExpiryStatus(document.metadata.expiryDate);

    // Generate signed URL
    if (document.file && document.file.s3Key) {
      try {
        document.file.url = await getSignedUrl(document.file.s3Key, 3600);
      } catch (error) {
        console.warn('Failed to generate signed URL for document:', error);
        document.file.url = null;
      }
    }

    await client.close();

    res.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving document'
    });
  }
});

// PUT /api/documents/:documentId - Update document
router.put('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { title, description, type, expiryDate, tags } = req.body;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');

    const updateData = {
      updatedAt: new Date()
    };

    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (type) updateData.type = type.trim();
    if (expiryDate !== undefined) {
      updateData['metadata.expiryDate'] = expiryDate ? new Date(expiryDate).toISOString() : null;
    }
    if (tags) updateData['metadata.tags'] = tags;

    const result = await documentsCollection.updateOne(
      {
        _id: new ObjectId(documentId),
        'ownerId': new ObjectId(req.user.userId),
        isActive: true
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Get updated document
    const updatedDocument = await documentsCollection.findOne({ _id: new ObjectId(documentId) });

    await client.close();

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: updatedDocument
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating document'
    });
  }
});

// DELETE /api/documents/:documentId - Delete document
router.delete('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');

    // Get document to delete file from S3
    const document = await documentsCollection.findOne({
      _id: new ObjectId(documentId),
      'ownerId': new ObjectId(req.user.userId),
      isActive: true
    });

    if (!document) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from S3
    if (document.file && document.file.s3Key) {
      try {
        await deleteFromS3(document.file.s3Key);
        console.log('Document file deleted from S3');
      } catch (deleteError) {
        console.warn('Failed to delete document file from S3:', deleteError);
      }
    }

    // Soft delete the document
    const result = await documentsCollection.updateOne(
      { _id: new ObjectId(documentId) },
      {
        $set: {
          isActive: false,
          status: 'deleted',
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting document'
    });
  }
});

// GET /api/documents/stats - Get document statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');

    const stats = await documentsCollection.aggregate([
      {
        $match: {
          'ownerId': new ObjectId(req.user.userId),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSize: { $sum: '$file.size' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    const totalDocuments = await documentsCollection.countDocuments({
      'ownerId': new ObjectId(req.user.userId),
      isActive: true
    });

    const totalSize = await documentsCollection.aggregate([
      {
        $match: {
          'ownerId': new ObjectId(req.user.userId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$file.size' }
        }
      }
    ]).toArray();

    await client.close();

    res.json({
      success: true,
      data: {
        totalDocuments,
        totalSize: totalSize[0]?.totalSize || 0,
        totalSizeFormatted: formatFileSize(totalSize[0]?.totalSize || 0),
        documentsByType: stats
      }
    });

  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving document statistics'
    });
  }
});

export default router;
