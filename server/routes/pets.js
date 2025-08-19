import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../config/aws.js';
// routes/pets.js
import jwt from 'jsonwebtoken';


const router = express.Router();

// Configure multer for pet photo uploads
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
// routes/pets.js or any protected route
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header received:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted:', token.substring(0, 20) + '...');
    console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.name, error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - JWT verification failed'
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


// GET /api/petss - Get all pets for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, species, needsVaccination } = req.query;
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const query = { 
      ownerId: req.user.userId,
      isActive: true 
    };
    // Add filters
    if (species) {
      query.species = { $regex: species, $options: 'i' };
    }
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const pets = await petsCollection
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .toArray();

    // Generate signed URLs for pet photos
    const petsWithPhotos = await Promise.all(
      pets.map(async (pet) => {
        if (pet.photoMetadata && pet.photoMetadata.s3Key) {
          try {
            pet.photo = await getSignedUrl(pet.photoMetadata.s3Key, 3600);
          } catch (error) {
            console.warn('Failed to generate signed URL for pet photo:', error);
            pet.photo = null;
          }
        }
        return pet;
      })
    );

    const total = await petsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        pets: petsWithPhotos,
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

// POST /api/pets/create - Create new pet
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      species,
      breed,
      age,
      weight,
      gender,
      color,
      microchip,
      diet,
      behavior,
      tags
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
      ownerId: req.user.userId,
      name: name.trim(),
      species: species.trim(),
      breed: breed.trim(),
      age: age || { years: 0, months: 0 },
      weight: weight || null,
      gender: gender || null,
      color: color || null,
      photo: null,
      photoMetadata: null,
      microchip: microchip || null,
      health: {
        status: 'healthy',
        allergies: [],
        conditions: [],
        medications: []
      },
      vaccinations: [],
      diet: diet || null,
      behavior: behavior || null,
      isActive: true,
      tags: tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await petsCollection.insertOne(newPet);
    
    const createdPet = await petsCollection.findOne({ _id: result.insertedId });

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Pet created successfully',
      data: createdPet
    });

  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating pet'
    });
  }
});

// GET /api/pets/:petId - Get specific pet
router.get('/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

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

    // Generate signed URL for pet photo
    if (pet.photoMetadata && pet.photoMetadata.s3Key) {
      try {
        pet.photo = await getSignedUrl(pet.photoMetadata.s3Key, 3600);
      } catch (error) {
        console.warn('Failed to generate signed URL for pet photo:', error);
        pet.photo = null;
      }
    }

    await client.close();

    res.json({
      success: true,
      data: pet
    });

  } catch (error) {
    console.error('Get pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving pet'
    });
  }
});

// PUT /api/pets/:petId - Update pet
router.put('/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.ownerId;
    delete updateData.createdAt;
    delete updateData.photoMetadata;
    
    updateData.updatedAt = new Date();

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const result = await petsCollection.updateOne(
      {
        _id: new ObjectId(petId),
        ownerId: req.user.userId,
        isActive: true
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    const updatedPet = await petsCollection.findOne({ _id: new ObjectId(petId) });

    // Generate signed URL for pet photo
    if (updatedPet.photoMetadata && updatedPet.photoMetadata.s3Key) {
      try {
        updatedPet.photo = await getSignedUrl(updatedPet.photoMetadata.s3Key, 3600);
      } catch (error) {
        console.warn('Failed to generate signed URL for pet photo:', error);
        updatedPet.photo = null;
      }
    }

    await client.close();

    res.json({
      success: true,
      message: 'Pet updated successfully',
      data: updatedPet
    });

  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating pet'
    });
  }
});

// DELETE /api/pets/:petId - Delete pet (soft delete)
router.delete('/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    // Get pet to delete photo from S3
    const pet = await petsCollection.findOne({
      _id: new ObjectId(petId),
      ownerId: req.user.userId
    });

    if (!pet) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    // Delete photo from S3 if exists
    if (pet.photoMetadata && pet.photoMetadata.s3Key) {
      try {
        await deleteFromS3(pet.photoMetadata.s3Key);
        console.log('Pet photo deleted from S3');
      } catch (deleteError) {
        console.warn('Failed to delete pet photo from S3:', deleteError);
      }
    }

    // Soft delete the pet
    const result = await petsCollection.updateOne(
      {
        _id: new ObjectId(petId),
        ownerId: req.user.userId
      },
      {
        $set: {
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

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

// POST /api/pets/:petId/upload-photo - Upload pet photo
router.post('/:petId/upload-photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { petId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    // Check if pet exists and belongs to user
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

    // Delete old photo from S3 if exists
    if (pet.photoMetadata && pet.photoMetadata.s3Key) {
      try {
        await deleteFromS3(pet.photoMetadata.s3Key);
        console.log('Old pet photo deleted from S3');
      } catch (deleteError) {
        console.warn('Failed to delete old pet photo from S3:', deleteError);
      }
    }

    // Upload new photo to S3
    const s3Result = await uploadToS3(req.file, 'pet-photos');

    // Update pet with new photo metadata
    const photoMetadata = {
      s3Key: s3Result.key,
      s3Url: s3Result.url,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date()
    };

    await petsCollection.updateOne(
      { _id: new ObjectId(petId) },
      {
        $set: {
          photoMetadata: photoMetadata,
          updatedAt: new Date()
        }
      }
    );

    // Generate signed URL for immediate use
    const signedUrl = await getSignedUrl(s3Result.key, 3600);

    await client.close();

    res.json({
      success: true,
      message: 'Pet photo uploaded successfully',
      data: {
        photoUrl: signedUrl,
        s3Key: s3Result.key
      }
    });

  } catch (error) {
    console.error('Upload pet photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading photo'
    });
  }
});

// DELETE /api/pets/:petId/photo - Delete pet photo
router.delete('/:petId/photo', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

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

    // Delete photo from S3 if exists
    if (pet.photoMetadata && pet.photoMetadata.s3Key) {
      try {
        await deleteFromS3(pet.photoMetadata.s3Key);
        console.log('Pet photo deleted from S3');
      } catch (deleteError) {
        console.warn('Failed to delete pet photo from S3:', deleteError);
      }
    }

    // Remove photo metadata from pet record
    await petsCollection.updateOne(
      { _id: new ObjectId(petId) },
      {
        $unset: {
          photo: 1,
          photoMetadata: 1
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Pet photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete pet photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting photo'
    });
  }
});

// POST /api/pets/:petId/vaccinations - Add vaccination record
router.post('/:petId/vaccinations', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { name, date, nextDue, veterinarian, clinic, notes } = req.body;

    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: 'Vaccination name and date are required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const vaccination = {
      _id: new ObjectId(),
      name,
      date,
      nextDue: nextDue || null,
      veterinarian: veterinarian || null,
      clinic: clinic || null,
      notes: notes || null,
      createdAt: new Date()
    };

    const result = await petsCollection.updateOne(
      {
        _id: new ObjectId(petId),
        ownerId: req.user.userId,
        isActive: true
      },
      {
        $push: { vaccinations: vaccination },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Vaccination record added successfully',
      data: vaccination
    });

  } catch (error) {
    console.error('Add vaccination error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding vaccination'
    });
  }
});

// POST /api/pets/:petId/health-conditions - Add health condition
router.post('/:petId/health-conditions', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { condition, diagnosed, status, notes } = req.body;

    if (!condition || !diagnosed) {
      return res.status(400).json({
        success: false,
        message: 'Condition name and diagnosed date are required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const healthCondition = {
      _id: new ObjectId(),
      condition,
      diagnosed,
      status: status || 'active',
      notes: notes || null,
      createdAt: new Date()
    };

    const result = await petsCollection.updateOne(
      {
        _id: new ObjectId(petId),
        ownerId: req.user.userId,
        isActive: true
      },
      {
        $push: { 'health.conditions': healthCondition },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Health condition added successfully',
      data: healthCondition
    });

  } catch (error) {
    console.error('Add health condition error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding health condition'
    });
  }
});

// POST /api/pets/:petId/medications - Add medication
router.post('/:petId/medications', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { name, dosage, frequency, startDate, endDate, notes } = req.body;

    if (!name || !dosage || !frequency || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, dosage, frequency, and start date are required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const medication = {
      _id: new ObjectId(),
      name,
      dosage,
      frequency,
      startDate,
      endDate: endDate || null,
      isActive: true,
      notes: notes || null,
      createdAt: new Date()
    };

    const result = await petsCollection.updateOne(
      {
        _id: new ObjectId(petId),
        ownerId: req.user.userId,
        isActive: true
      },
      {
        $push: { 'health.medications': medication },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      data: medication
    });

  } catch (error) {
    console.error('Add medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding medication'
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

    const query = {
      ownerId: req.user.userId,
      species: { $regex: species, $options: 'i' },
      isActive: true
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const pets = await petsCollection
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .toArray();

    // Generate signed URLs for pet photos
    const petsWithPhotos = await Promise.all(
      pets.map(async (pet) => {
        if (pet.photoMetadata && pet.photoMetadata.s3Key) {
          try {
            pet.photo = await getSignedUrl(pet.photoMetadata.s3Key, 3600);
          } catch (error) {
            pet.photo = null;
          }
        }
        return pet;
      })
    );

    const total = await petsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        pets: petsWithPhotos,
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

// GET /api/pets/needing-vaccination - Get pets needing vaccination
router.get('/needing-vaccination', authenticateToken, async (req, res) => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const petsCollection = db.collection('pets');

    const currentDate = new Date();
    
    // Find pets where vaccination nextDue date has passed or is coming up
    const pets = await petsCollection.find({
      ownerId: req.user.userId,
      isActive: true,
      $or: [
        { 'vaccinations.nextDue': { $lte: currentDate.toISOString() } },
        { 'vaccinations': { $size: 0 } } // Pets with no vaccinations
      ]
    }).toArray();

    // Generate signed URLs for pet photos
    const petsWithPhotos = await Promise.all(
      pets.map(async (pet) => {
        if (pet.photoMetadata && pet.photoMetadata.s3Key) {
          try {
            pet.photo = await getSignedUrl(pet.photoMetadata.s3Key, 3600);
          } catch (error) {
            pet.photo = null;
          }
        }
        return pet;
      })
    );

    await client.close();

    res.json({
      success: true,
      data: {
        pets: petsWithPhotos,
        pagination: {
          page: 1,
          limit: petsWithPhotos.length,
          total: petsWithPhotos.length,
          pages: 1
        }
      }
    });

  } catch (error) {
    console.error('Get pets needing vaccination error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving pets'
    });
  }
});

export default router;
