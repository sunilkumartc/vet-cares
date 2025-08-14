import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const router = express.Router();

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

// Helper function to populate daily log details
const populateDailyLogDetails = async (db, dailyLogs) => {
  return await Promise.all(
    dailyLogs.map(async (log) => {
      // Populate pet details
      if (log.petId) {
        const pet = await db.collection('pets').findOne({ 
          _id: new ObjectId(log.petId) 
        });
        if (pet) {
          log.petId = {
            _id: pet._id.toString(),
            name: pet.name,
            species: pet.species,
            breed: pet.breed
          };
        }
      }

      // Populate owner details
      if (log.ownerId) {
        const owner = await db.collection('clients').findOne({ 
          _id: new ObjectId(log.ownerId) 
        });
        if (owner) {
          log.ownerId = {
            _id: owner._id.toString(),
            name: owner.first_name || owner.name || 'Unknown',
            email: owner.email,
            phone: owner.phone
          };
        }
      }

      return log;
    })
  );
};

// Helper function to get date range for filtering
const getDateRange = (dateString) => {
  const date = new Date(dateString);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return { startOfDay, endOfDay };
};

// GET /api/daily-logs - Get all daily logs for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, petId, activityType, date } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const dailyLogsCollection = db.collection('daily_logs');

    const query = {
      ownerId: new ObjectId(req.user.userId),
      isActive: true
    };

    // Add filters
    if (petId) {
      query.petId = new ObjectId(petId);
    }

    if (activityType) {
      query.activityType = { $regex: activityType, $options: 'i' };
    }

    if (date) {
      const { startOfDay, endOfDay } = getDateRange(date);
      query.activityTime = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let dailyLogs = await dailyLogsCollection
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ activityTime: -1 })
      .toArray();

    // Populate related details
    dailyLogs = await populateDailyLogDetails(db, dailyLogs);

    const total = await dailyLogsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        dailyLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get daily logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving daily logs'
    });
  }
});

// GET /api/daily-logs/pet/:petId - Get daily logs for specific pet with optional date filter
router.get('/pet/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { date, page = 1, limit = 20, activityType } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const dailyLogsCollection = db.collection('daily_logs');
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
      ownerId: new ObjectId(req.user.userId),
      isActive: true
    };

    // Add date filter if provided
    if (date) {
      const { startOfDay, endOfDay } = getDateRange(date);
      query.activityTime = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    // Add activity type filter if provided
    if (activityType) {
      query.activityType = { $regex: activityType, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let dailyLogs = await dailyLogsCollection
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ activityTime: -1 })
      .toArray();

    // Populate related details
    dailyLogs = await populateDailyLogDetails(db, dailyLogs);

    const total = await dailyLogsCollection.countDocuments(query);

    await client.close();

    // Return logs directly for the service to process
    res.json({
      success: true,
      data: dailyLogs
    });

  } catch (error) {
    console.error('Get pet daily logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving pet daily logs'
    });
  }
});

// GET /api/daily-logs/pet/:petId/recent - Get recent daily logs for pet (last 7 days)
router.get('/pet/:petId/recent', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { limit = 50 } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const dailyLogsCollection = db.collection('daily_logs');
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

    // Get logs from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const query = {
      petId: new ObjectId(petId),
      ownerId: new ObjectId(req.user.userId),
      isActive: true,
      activityTime: { $gte: sevenDaysAgo }
    };

    let dailyLogs = await dailyLogsCollection
      .find(query)
      .limit(parseInt(limit))
      .sort({ activityTime: -1 })
      .toArray();

    // Populate related details
    dailyLogs = await populateDailyLogDetails(db, dailyLogs);

    await client.close();

    // Return logs directly for the service to process
    res.json({
      success: true,
      data: dailyLogs
    });

  } catch (error) {
    console.error('Get recent daily logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving recent daily logs'
    });
  }
});

// GET /api/daily-logs/:logId - Get specific daily log
router.get('/:logId', authenticateToken, async (req, res) => {
  try {
    const { logId } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const dailyLogsCollection = db.collection('daily_logs');

    let dailyLog = await dailyLogsCollection.findOne({
      _id: new ObjectId(logId),
      ownerId: new ObjectId(req.user.userId),
      isActive: true
    });

    if (!dailyLog) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Daily log not found'
      });
    }

    // Populate related details
    const dailyLogs = await populateDailyLogDetails(db, [dailyLog]);
    dailyLog = dailyLogs[0];

    await client.close();

    res.json({
      success: true,
      data: dailyLog
    });

  } catch (error) {
    console.error('Get daily log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving daily log'
    });
  }
});

// POST /api/daily-logs - Create new daily log
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      petId,
      activityType,
      activityTime,
      details,
      notes
    } = req.body;

    if (!petId || !activityType || !activityTime) {
      return res.status(400).json({
        success: false,
        message: 'Pet ID, activity type, and activity time are required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const dailyLogsCollection = db.collection('daily_logs');
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

    const newDailyLog = {
      ownerId: new ObjectId(req.user.userId),
      petId: new ObjectId(petId),
      activityType: activityType.toLowerCase(),
      activityTime: new Date(activityTime),
      details: details || null,
      notes: notes || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await dailyLogsCollection.insertOne(newDailyLog);
    
    // Get created daily log with populated details
    let createdDailyLog = await dailyLogsCollection.findOne({ 
      _id: result.insertedId 
    });

    // Populate related details
    const dailyLogs = await populateDailyLogDetails(db, [createdDailyLog]);
    createdDailyLog = dailyLogs[0];

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Daily log created successfully',
      data: createdDailyLog
    });

  } catch (error) {
    console.error('Create daily log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating daily log'
    });
  }
});

// PUT /api/daily-logs/:logId - Update daily log
router.put('/:logId', authenticateToken, async (req, res) => {
  try {
    const { logId } = req.params;
    const updates = { ...req.body };
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.ownerId;
    delete updates.petId;
    delete updates.createdAt;
    
    updates.updatedAt = new Date();

    // Convert activityTime to Date if present
    if (updates.activityTime) {
      updates.activityTime = new Date(updates.activityTime);
    }

    // Convert activityType to lowercase if present
    if (updates.activityType) {
      updates.activityType = updates.activityType.toLowerCase();
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const dailyLogsCollection = db.collection('daily_logs');

    const result = await dailyLogsCollection.updateOne(
      {
        _id: new ObjectId(logId),
        ownerId: new ObjectId(req.user.userId),
        isActive: true
      },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Daily log not found'
      });
    }

    // Get updated daily log with populated details
    let updatedDailyLog = await dailyLogsCollection.findOne({ 
      _id: new ObjectId(logId) 
    });

    // Populate related details
    const dailyLogs = await populateDailyLogDetails(db, [updatedDailyLog]);
    updatedDailyLog = dailyLogs[0];

    await client.close();

    res.json({
      success: true,
      message: 'Daily log updated successfully',
      data: updatedDailyLog
    });

  } catch (error) {
    console.error('Update daily log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating daily log'
    });
  }
});

// DELETE /api/daily-logs/:logId - Delete daily log (soft delete)
router.delete('/:logId', authenticateToken, async (req, res) => {
  try {
    const { logId } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const dailyLogsCollection = db.collection('daily_logs');

    const result = await dailyLogsCollection.updateOne(
      {
        _id: new ObjectId(logId),
        ownerId: new ObjectId(req.user.userId),
        isActive: true
      },
      {
        $set: {
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Daily log not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Daily log deleted successfully'
    });

  } catch (error) {
    console.error('Delete daily log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting daily log'
    });
  }
});

// GET /api/daily-logs/pet/:petId/summary - Get daily activity summary for pet
router.get('/pet/:petId/summary', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { date } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const dailyLogsCollection = db.collection('daily_logs');
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

    let matchQuery = {
      petId: new ObjectId(petId),
      ownerId: new ObjectId(req.user.userId),
      isActive: true
    };

    // Add date filter if provided
    if (date) {
      const { startOfDay, endOfDay } = getDateRange(date);
      matchQuery.activityTime = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const summary = await dailyLogsCollection.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          lastActivity: { $max: '$activityTime' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const totalActivities = await dailyLogsCollection.countDocuments(matchQuery);

    await client.close();

    res.json({
      success: true,
      data: {
        totalActivities,
        activitiesByType: summary,
        date: date || new Date().toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Get daily log summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving daily log summary'
    });
  }
});

// GET /api/daily-logs/stats - Get daily log statistics for user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const dailyLogsCollection = db.collection('daily_logs');

    const stats = await dailyLogsCollection.aggregate([
      {
        $match: {
          ownerId: new ObjectId(req.user.userId),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          lastActivity: { $max: '$activityTime' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const totalLogs = await dailyLogsCollection.countDocuments({
      ownerId: new ObjectId(req.user.userId),
      isActive: true
    });

    // Get today's logs count
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todayLogs = await dailyLogsCollection.countDocuments({
      ownerId: new ObjectId(req.user.userId),
      isActive: true,
      activityTime: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    await client.close();

    res.json({
      success: true,
      data: {
        totalLogs,
        todayLogs,
        activitiesByType: stats
      }
    });

  } catch (error) {
    console.error('Get daily log stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving daily log statistics'
    });
  }
});

export default router;
