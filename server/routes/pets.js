import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import path from 'path';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../config/aws.js';

const router = express.Router();

// Configure multer for pet photo uploads (same as reference)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
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
    console.error('JWT verification failed:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

// FIXED: Optional JWT Authentication Middleware
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

// FIXED: Helper function to safely convert to ObjectId
const toObjectId = (id) => {
  try {
    return typeof id === 'string' ? new ObjectId(id) : id;
  } catch (error) {
    console.error('Invalid ObjectId:', id);
    return null;
  }
};

// Helper function to process weight value
const processWeightValue = (weight) => {
  if (weight === null || weight === undefined || weight === "") {
    return null;
  }
  
  if (typeof weight === 'number') {
    return weight;
  }
  
  if (typeof weight === 'string') {
    const parsed = parseFloat(weight);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
};

// Helper function to clean empty strings to null
const cleanEmptyString = (value) => {
  return value === "" ? null : value;
};

// FIXED: Helper function to process pet data consistently
const processPetData = async (pet) => {
  const processedPet = {
    _id: pet._id,
    client_id: pet.client_id || null,
    tenant_id: pet.tenant_id || null,
    pet_id: pet.pet_id || null,
    name: pet.name || '',
    species: pet.species || '',
    breed: pet.breed || '',
    color: cleanEmptyString(pet.color),
    gender: cleanEmptyString(pet.gender),
    birth_date: cleanEmptyString(pet.birth_date),
    weight: processWeightValue(pet.weight),
    microchip_id: cleanEmptyString(pet.microchip_id),
    photo_url: cleanEmptyString(pet.photo_url),
    allergies: cleanEmptyString(pet.allergies),
    special_notes: cleanEmptyString(pet.special_notes),
    created_date: pet.created_date || new Date(),
    updated_date: pet.updated_date || new Date()
  };

  // FIXED: Handle photo URL - since we store full URL, return it directly
  processedPet.photo = processedPet.photo_url;

  return processedPet;
};

// GET /api/pets - Get all pets for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, species } = req.query;
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    // FIXED: Filter by authenticated user with flexible matching
    const query = {
      $or: [
        { client_id: req.user.userId },
        { client_id: toObjectId(req.user.userId) }
      ]
    };
    
    // Add species filter if specified
    if (species) {
      query.species = { $regex: species, $options: 'i' };
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const pets = await petsCollection
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ created_date: -1 })
      .toArray();

    // Process pets to handle photo URLs and weight
    const processedPets = await Promise.all(
      pets.map(async (pet) => await processPetData(pet))
    );

    const total = await petsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        pets: processedPets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get pets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving pets'
    });
  }
});

// POST /api/pets - Create new pet
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      tenant_id,
      pet_id,
      name,
      species,
      breed,
      color,
      gender,
      birth_date,
      weight,
      microchip_id,
      photo_url,
      allergies,
      special_notes
    } = req.body;

    if (!name || !species || !breed) {
      return res.status(400).json({
        success: false,
        message: 'Name, species, and breed are required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const newPet = {
      client_id: req.user.userId, // Store as string initially
      tenant_id: tenant_id || null,
      pet_id: pet_id || null,
      name: name.trim(),
      species: species.trim(),
      breed: breed.trim(),
      color: cleanEmptyString(color),
      gender: cleanEmptyString(gender),
      birth_date: cleanEmptyString(birth_date),
      weight: processWeightValue(weight),
      microchip_id: cleanEmptyString(microchip_id),
      photo_url: cleanEmptyString(photo_url),
      allergies: cleanEmptyString(allergies),
      special_notes: cleanEmptyString(special_notes),
      created_date: new Date(),
      updated_date: new Date()
    };

    const result = await petsCollection.insertOne(newPet);
    const createdPet = await petsCollection.findOne({ _id: result.insertedId });

    // Process the created pet
    const processedPet = await processPetData(createdPet);

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Pet created successfully',
      data: processedPet
    });

  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating pet'
    });
  }
});

// GET /api/pets/:petId - Get specific pet with photo
router.get('/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;

    const petObjectId = toObjectId(petId);
    if (!petObjectId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

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

    console.log('Retrieved pet photo_url from DB:', pet.photo_url);

    // Process the pet data including photo URL generation
    const processedPet = await processPetData(pet);
    
    console.log('Processed pet photo:', processedPet.photo);

    await client.close();

    res.json({
      success: true,
      data: processedPet
    });

  } catch (error) {
    console.error('Get pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving pet'
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

    // FIXED: Safe ObjectId conversion
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

    // FIXED: Build pet query with flexible client_id matching
    const petQuery = {
      _id: petObjectId
      // Removed isActive check to allow fetching documents for all pets
    };

    // Only filter by owner if user is authenticated
    if (req.user) {
      petQuery.$or = [
        { client_id: req.user.userId }, // String match
        { client_id: new ObjectId(req.user.userId) } // ObjectId match
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

    // FIXED: Build documents query with proper ObjectId handling
    const docQuery = {
      petId: petObjectId,
      isActive: true
    };

    // Only filter by owner if user is authenticated
    if (req.user) {
      docQuery.$or = [
        { client_id: req.user.userId }, // String match
        { client_id: new ObjectId(req.user.userId) } // ObjectId match
      ];
    }

    if (type) {
      docQuery.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // FIXED: Improved aggregation pipeline with proper null handling
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
          from: 'users', // FIXED: Changed from 'clients' to 'users' (adjust as needed)
          localField: 'client_id',
          foreignField: '_id',
          as: 'ownerDetails'
        }
      },
      {
        $addFields: {
          // FIXED: Use $cond to handle empty arrays properly
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
                name: { $arrayElemAt: ['$ownerDetails.first_name', 0] },
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

    // Add virtual fields and generate signed URLs
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        // Add virtual fields
        doc.fileSizeFormatted = formatFileSize(doc.file.size);
        doc.age = calculateAge(doc.createdAt);
        doc.expiryStatus = getExpiryStatus(doc.metadata?.expiryDate);

        // Generate signed URL for document access
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

// PUT /api/pets/:petId - Update pet
router.put('/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const updateData = { ...req.body };
    
    // FIXED: Safe ObjectId conversion
    const petObjectId = toObjectId(petId);
    if (!petObjectId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }
    
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.client_id;
    delete updateData.created_date;
    
    // Process weight if it's being updated
    if (updateData.weight !== undefined) {
      updateData.weight = processWeightValue(updateData.weight);
    }

    // Clean empty strings
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === "") {
        updateData[key] = null;
      }
    });
    
    updateData.updated_date = new Date();

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    // FIXED: Verify ownership before update
    const result = await petsCollection.updateOne(
      { 
        _id: petObjectId,
        $or: [
          { client_id: req.user.userId },
          { client_id: toObjectId(req.user.userId) }
        ]
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found or access denied'
      });
    }

    const updatedPet = await petsCollection.findOne({ _id: petObjectId });
    const processedPet = await processPetData(updatedPet);

    await client.close();

    res.json({
      success: true,
      message: 'Pet updated successfully',
      data: processedPet
    });

  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating pet'
    });
  }
});

// DELETE /api/pets/:petId - Delete pet
router.delete('/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;

    // FIXED: Safe ObjectId conversion
    const petObjectId = toObjectId(petId);
    if (!petObjectId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    // FIXED: Verify ownership before deletion
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

    // FIXED: Delete photo from S3 if exists - extract key from URL
    if (pet.photo_url && pet.photo_url.includes('amazonaws.com')) {
      try {
        // Extract S3 key from full URL (similar to client avatar code)
        const s3Key = pet.photo_url.split('/').slice(-2).join('/');
        await deleteFromS3(s3Key);
        console.log('Pet photo deleted from S3');
      } catch (deleteError) {
        console.warn('Failed to delete pet photo from S3:', deleteError);
      }
    }

    // Delete the pet document
    const result = await petsCollection.deleteOne({
      _id: petObjectId
    });

    await client.close();

    res.json({
      success: true,
      message: 'Pet deleted successfully'
    });

  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting pet'
    });
  }
});

// FIXED: POST /api/pets/upload-ph - General upload (stores full S3 URL)
router.post('/upload-ph', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    console.log('General pet photo upload request received');
    console.log('File:', req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload photo to S3
    const s3Result = await uploadToS3(req.file, 'pet-photos');
    console.log('Pet photo uploaded to S3:', s3Result);

    res.json({
      success: true,
      message: 'Pet photo uploaded successfully',
      data: {
        photoUrl: s3Result.url, // Return full URL for immediate use
        s3Key: s3Result.key,
        originalUrl: s3Result.url
      }
    });
  } catch (error) {
    console.error('Upload pet photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading photo',
      error: error.message
    });
  }
});

// CRITICAL FIX: POST /api/pets/:petId/upload-photo - Store full S3 URL in database
router.post('/:petId/upload-photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    console.log('Upload pet photo request received');
    console.log('File:', req.file);
    console.log('Pet ID:', req.params.petId);

    const { petId } = req.params;

    // FIXED: Validate ObjectId format
    if (!ObjectId.isValid(petId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }

    if (!ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    // FIXED: Proper ownership verification
    const pet = await petsCollection.findOne({ 
      _id: new ObjectId(petId),
      $or: [
        { client_id: req.user.userId },
        { client_id: new ObjectId(req.user.userId) }
      ]
    });

    if (!pet) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    // FIXED: Delete old photo from S3 if it exists - extract key from URL
    if (pet.photo_url && pet.photo_url.includes('amazonaws.com')) {
      try {
        // Extract S3 key from full URL (same pattern as client avatar code)
        const oldKey = pet.photo_url.split('/').slice(-2).join('/');
        await deleteFromS3(oldKey);
        console.log('Old pet photo deleted from S3:', oldKey);
      } catch (deleteError) {
        console.error('Error deleting old pet photo:', deleteError);
      }
    }

    // FIXED: Upload new photo to S3
    const s3Result = await uploadToS3(req.file, 'pet-photos');
    console.log('Pet photo uploaded to S3:', s3Result);

    // CRITICAL FIX: Store full S3 URL in database (same as client avatar pattern)
    const updateResult = await petsCollection.updateOne(
      { _id: new ObjectId(petId) },
      { 
        $set: { 
          photo_url: s3Result.url, // Store FULL S3 URL, not key
          updated_date: new Date()
        } 
      }
    );

    console.log('Database update result:', {
      acknowledged: updateResult.acknowledged,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });

    if (updateResult.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Failed to update pet photo in database'
      });
    }

    // Get updated pet
    const updatedPet = await petsCollection.findOne({ _id: new ObjectId(petId) });

    await client.close();

    res.json({
      success: true,
      message: 'Pet photo uploaded successfully',
      data: { 
        photoUrl: s3Result.url, // Return full URL
        s3Key: s3Result.key,
        pet: updatedPet,
        dbUpdated: updateResult.modifiedCount > 0
      }
    });
  } catch (error) {
    console.error('Upload pet photo error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB'
      });
    }
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while uploading photo'
    });
  }
});

// DEBUG: GET /api/pets/:petId/debug - Debug pet data
router.get('/:petId/debug', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const petObjectId = new ObjectId(petId);
    const pet = await petsCollection.findOne({ _id: petObjectId });
    
    await client.close();

    res.json({
      success: true,
      data: {
        petId: petId,
        petObjectId: petObjectId,
        userId: req.user.userId,
        userObjectId: toObjectId(req.user.userId),
        pet: pet,
        petFound: !!pet,
        photoUrl: pet?.photo_url,
        clientIdMatch: pet?.client_id === req.user.userId,
        clientIdObjectIdMatch: pet?.client_id?.toString() === req.user.userId
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// FIXED: DELETE /api/pets/:petId/photo - Delete pet photo
router.delete('/:petId/photo', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;

    // FIXED: Validate ObjectId format
    if (!ObjectId.isValid(petId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const pet = await petsCollection.findOne({
      _id: new ObjectId(petId),
      $or: [
        { client_id: req.user.userId },
        { client_id: new ObjectId(req.user.userId) }
      ]
    });

    if (!pet) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    // FIXED: Delete from S3 if it exists - extract key from URL
    if (pet.photo_url && pet.photo_url.includes('amazonaws.com')) {
      try {
        // Extract S3 key from full URL (same pattern as client avatar code)
        const s3Key = pet.photo_url.split('/').slice(-2).join('/');
        await deleteFromS3(s3Key);
        console.log('Pet photo deleted from S3:', s3Key);
      } catch (deleteError) {
        console.error('Error deleting pet photo from S3:', deleteError);
      }
    }

    // Remove photo from pet
    await petsCollection.updateOne(
      { _id: new ObjectId(petId) },
      { 
        $unset: { photo_url: 1 },
        $set: { updated_date: new Date() }
      }
    );

    // Get updated pet
    const updatedPet = await petsCollection.findOne({ _id: new ObjectId(petId) });

    await client.close();

    res.json({
      success: true,
      message: 'Pet photo deleted successfully',
      data: updatedPet
    });
  } catch (error) {
    console.error('Delete pet photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting photo'
    });
  }
});

// GET /api/pets/species/:species - Get pets by species
router.get('/species/:species', authenticateToken, async (req, res) => {
  try {
    const { species } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    // FIXED: Filter by user and species
    const query = {
      $or: [
        { client_id: req.user.userId },
        { client_id: toObjectId(req.user.userId) }
      ],
      species: { $regex: species, $options: 'i' }
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const pets = await petsCollection
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ created_date: -1 })
      .toArray();

    // Process pets
    const processedPets = await Promise.all(
      pets.map(async (pet) => await processPetData(pet))
    );

    const total = await petsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        pets: processedPets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get pets by species error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving pets'
    });
  }
});

// ADDED: GET /api/pets/user/stats - Get user's pet statistics
router.get('/user/stats', authenticateToken, async (req, res) => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const query = {
      $or: [
        { client_id: req.user.userId },
        { client_id: toObjectId(req.user.userId) }
      ]
    };

    const stats = await petsCollection.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$species',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const totalPets = await petsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        totalPets,
        petsBySpecies: stats
      }
    });

  } catch (error) {
    console.error('Get pet stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving pet statistics'
    });
  }
});

export default router;
