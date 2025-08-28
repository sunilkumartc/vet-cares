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

// Optional JWT Authentication Middleware
const optionalAuthenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { userId: decoded.userId };
      } catch (error) {
        console.warn("Invalid or expired token, continuing without user...");
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error("Token check error:", error);
    req.user = null;
    next();
  }
};

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

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

// Helper function to ensure ObjectId conversion
const toObjectId = (id) => {
  try {
    return typeof id === 'string' ? new ObjectId(id) : id;
  } catch (error) {
    console.error('Invalid ObjectId:', id);
    return null;
  }
};

// FIXED: Helper function to process document data efficiently
const processDocumentData = async (doc) => {
  // Add virtual fields
  doc.fileSizeFormatted = formatFileSize(doc.file.size);
  doc.age = calculateAge(doc.createdAt);
  doc.expiryStatus = getExpiryStatus(doc.metadata?.expiryDate);

  // CRITICAL FIX: Use stored URL first, only generate signed URL if missing
  if (doc.file && doc.file.url) {
    // URL already exists in database - use it directly
    console.log('Using stored URL for document:', doc._id);
    // No need to generate signed URL since we have the full URL stored
  } else if (doc.file && doc.file.s3Key) {
    // Fallback: Generate signed URL only if stored URL is missing
    try {
      doc.file.url = await getSignedUrl(doc.file.s3Key, 3600);
      console.log('Generated signed URL for document:', doc._id);
    } catch (error) {
      console.warn('Failed to generate signed URL for document:', error);
      doc.file.url = null;
    }
  }

  return doc;
};

// GET /api/document - Get all documents for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, petId, search } = req.query;
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');

    // Ensure proper ObjectId conversion
    const query = { 
      client_id: toObjectId(req.user.userId),
      isActive: true 
    };

    // Add filters
    if (type) {
      query.type = type;
    }
    
    if (petId) {
      query.petId = toObjectId(petId);
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
    
    // Improved aggregation with proper null handling
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
          from: 'clients', // Change to 'users' if needed based on your collection name
          localField: 'client_id',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          pet: {
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
          owner: {
            $cond: {
              if: { $gt: [{ $size: '$ownerDetails' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$ownerDetails._id', 0] },
                name: { $arrayElemAt: ['$ownerDetails.name', 0] },
                email: { $arrayElemAt: ['$ownerDetails.email', 0] },
                phone: { $arrayElemAt: ['$ownerDetails.phone', 0] }
              },
              else: null
            }
          }
        }
      },
      { $project: { petDetails: 0, ownerDetails: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    // FIXED: Use the new processing function
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => await processDocumentData(doc))
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

// GET /api/document/pet/:petId - Get documents for specific pet
router.get('/pet/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');
    const petsCollection = db.collection('pets');

    // Proper ObjectId conversion and flexible client_id matching
    const petObjectId = toObjectId(petId);
    if (!petObjectId) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID'
      });
    }

    // Verify pet belongs to user with flexible type matching
    const pet = await petsCollection.findOne({
      _id: petObjectId,
      $or: [
        { client_id: req.user.userId },
        { client_id: toObjectId(req.user.userId) }
      ]
    });

    if (!pet) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found or access denied'
      });
    }

    const query = {
      petId: petObjectId,
      client_id: toObjectId(req.user.userId),
      isActive: true
    };

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
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
          localField: 'client_id',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          pet: {
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
          owner: {
            $cond: {
              if: { $gt: [{ $size: '$ownerDetails' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$ownerDetails._id', 0] },
                name: { $arrayElemAt: ['$ownerDetails.name', 0] },
                email: { $arrayElemAt: ['$ownerDetails.email', 0] },
                phone: { $arrayElemAt: ['$ownerDetails.phone', 0] }
              },
              else: null
            }
          }
        }
      },
      { $project: { petDetails: 0, ownerDetails: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    // FIXED: Use the new processing function
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => await processDocumentData(doc))
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

// GET /api/document/petdoc/:petId - Get documents for specific pet with optional authentication
router.get('/petdoc/:petId', optionalAuthenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');
    const petsCollection = db.collection('pets');

    // Safe ObjectId conversion
    let petObjectId;
    try {
      petObjectId = new ObjectId(petId);
    } catch (error) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }

    // Build pet query with flexible client_id matching
    const petQuery = {
      _id: petObjectId
    };

    // Only filter by owner if user is authenticated
    if (req.user) {
      petQuery.$or = [
        { client_id: req.user.userId },
        { client_id: new ObjectId(req.user.userId) }
      ];
    }

    const pet = await petsCollection.findOne(petQuery);

    if (!pet) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found or access denied'
      });
    }

    // Build documents query with proper ObjectId handling
    const docQuery = {
      petId: petObjectId,
      isActive: true
    };

    // Only filter by owner if user is authenticated
    if (req.user) {
      docQuery.$or = [
        { client_id: req.user.userId },
        { client_id: new ObjectId(req.user.userId) }
      ];
    }

    if (type) {
      docQuery.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Improved aggregation pipeline with proper null handling
    const documents = await documentsCollection.aggregate([
      { $match: docQuery },
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
          localField: 'client_id',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          pet: {
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
          owner: {
            $cond: {
              if: { $gt: [{ $size: '$ownerDetails' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$ownerDetails._id', 0] },
                name: { $arrayElemAt: ['$ownerDetails.name', 0] },
                email: { $arrayElemAt: ['$ownerDetails.email', 0] },
                phone: { $arrayElemAt: ['$ownerDetails.phone', 0] }
              },
              else: null
            }
          }
        }
      },
      { $project: { petDetails: 0, ownerDetails: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    // FIXED: Use the new processing function
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => await processDocumentData(doc))
    );

    const total = await documentsCollection.countDocuments(docQuery);

    await client.close();

    res.json({
      success: true,
      data: {
        documents: documentsWithUrls,
        pet: {
          _id: pet._id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed
        },
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

// POST /api/document/upload - Upload document
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

    // Proper ObjectId conversion and flexible matching
    const petObjectId = toObjectId(petId);
    if (!petObjectId) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID'
      });
    }

    // Verify pet belongs to user with flexible type matching
    const pet = await petsCollection.findOne({
      _id: petObjectId,
      $or: [
        { client_id: req.user.userId },
        { client_id: toObjectId(req.user.userId) }
      ]
    });

    if (!pet) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found or access denied'
      });
    }

    // Upload file to S3
    const s3Result = await uploadToS3(req.file, 'pet-documents');

    // Get file extension
    const extension = path.extname(req.file.originalname).toLowerCase();

    // Create document record
    const newDocument = {
      petId: petObjectId,
      client_id: toObjectId(req.user.userId),
      type: type.trim(),
      title: title.trim(),
      description: description ? description.trim() : null,
      file: {
        originalName: req.file.originalname,
        fileName: s3Result.fileName,
        s3Key: s3Result.key,
        url: s3Result.url, // CRITICAL: Store the full URL, not just key
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
          localField: 'client_id',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          pet: {
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
          owner: {
            $cond: {
              if: { $gt: [{ $size: '$ownerDetails' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$ownerDetails._id', 0] },
                name: { $arrayElemAt: ['$ownerDetails.name', 0] },
                email: { $arrayElemAt: ['$ownerDetails.email', 0] },
                phone: { $arrayElemAt: ['$ownerDetails.phone', 0] }
              },
              else: null
            }
          }
        }
      },
      { $project: { petDetails: 0, ownerDetails: 0 } }
    ]).toArray();

    const document = createdDocument[0];

    // FIXED: Use the new processing function
    const processedDocument = await processDocumentData(document);

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: processedDocument
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

// GET /api/document/:documentId - Get specific document
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
          'client_id': new ObjectId(req.user.userId),
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
          localField: 'client_id',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          pet: {
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
          owner: {
            $cond: {
              if: { $gt: [{ $size: '$ownerDetails' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$ownerDetails._id', 0] },
                name: { $arrayElemAt: ['$ownerDetails.name', 0] },
                email: { $arrayElemAt: ['$ownerDetails.email', 0] },
                phone: { $arrayElemAt: ['$ownerDetails.phone', 0] }
              },
              else: null
            }
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

    // FIXED: Use the new processing function
    const processedDocument = await processDocumentData(document);

    await client.close();

    res.json({
      success: true,
      data: processedDocument
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving document'
    });
  }
});

// PUT /api/document/:documentId - Update document
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
        'client_id': new ObjectId(req.user.userId),
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

    // FIXED: Use the new processing function
    const processedDocument = await processDocumentData(updatedDocument);

    await client.close();

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: processedDocument
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating document'
    });
  }
});

// DELETE /api/document/:documentId - Delete document
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
      'client_id': new ObjectId(req.user.userId),
      isActive: true
    });

    if (!document) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from S3 - use the s3Key for deletion
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

// GET /api/document/stats - Get document statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const documentsCollection = db.collection('documents');

    const stats = await documentsCollection.aggregate([
      {
        $match: {
          'client_id': new ObjectId(req.user.userId),
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
      'client_id': new ObjectId(req.user.userId),
      isActive: true
    });

    const totalSize = await documentsCollection.aggregate([
      {
        $match: {
          'client_id': new ObjectId(req.user.userId),
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
        totalSizeFormatted: formatFileSize(totalSize?.totalSize || 0),
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
