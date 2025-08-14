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

// Helper function to populate appointment details
const populateAppointmentDetails = async (db, appointments) => {
  return await Promise.all(
    appointments.map(async (appointment) => {
      // Populate pet details
      if (appointment.petId) {
        const pet = await db.collection('pets').findOne({ 
          _id: new ObjectId(appointment.petId) 
        });
        if (pet) {
          appointment.petId = {
            _id: pet._id.toString(),
            name: pet.name,
            species: pet.species,
            breed: pet.breed
          };
        }
      }

      // Populate owner details
      if (appointment.ownerId) {
        const owner = await db.collection('clients').findOne({ 
          _id: new ObjectId(appointment.ownerId) 
        });
        if (owner) {
          appointment.ownerId = {
            _id: owner._id.toString(),
            name: owner.first_name || owner.name || 'Unknown',
            email: owner.email,
            phone: owner.phone
          };
        }
      }

      // Populate doctor details if doctorId exists
      if (appointment.doctorId) {
        const doctor = await db.collection('doctors').findOne({ 
          _id: new ObjectId(appointment.doctorId) 
        });
        if (doctor) {
          appointment.doctorId = {
            _id: doctor._id.toString(),
            name: doctor.name || doctor.first_name || 'Unknown Doctor',
            email: doctor.email,
            phone: doctor.phone
          };
        }
      }

      return appointment;
    })
  );
};

// GET /api/appointments - Get all appointments for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, petId, upcoming } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');

    const query = {
      ownerId: new ObjectId(req.user.userId),
      isActive: true
    };

    // Add filters
    if (status) {
      query.status = status;
    }

    if (petId) {
      query.petId = new ObjectId(petId);
    }

    if (upcoming === 'true') {
      query.scheduledAt = { $gte: new Date() };
      query.status = { $in: ['scheduled', 'confirmed'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let appointments = await appointmentsCollection
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ scheduledAt: upcoming === 'true' ? 1 : -1 })
      .toArray();

    // Populate related details
    appointments = await populateAppointmentDetails(db, appointments);

    const total = await appointmentsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving appointments'
    });
  }
});

// GET /api/appointments/upcoming - Get upcoming appointments
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');

    const query = {
      ownerId: new ObjectId(req.user.userId),
      isActive: true,
      scheduledAt: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] }
    };
    
    let appointments = await appointmentsCollection
      .find(query)
      .limit(parseInt(limit))
      .sort({ scheduledAt: 1 })
      .toArray();

    // Populate related details
    appointments = await populateAppointmentDetails(db, appointments);

    await client.close();

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          page: 1,
          limit: parseInt(limit),
          total: appointments.length,
          pages: 1
        }
      }
    });

  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving upcoming appointments'
    });
  }
});

// GET /api/appointments/pet/:petId - Get appointments for specific pet
router.get('/pet/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let appointments = await appointmentsCollection
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ scheduledAt: -1 })
      .toArray();

    // Populate related details
    appointments = await populateAppointmentDetails(db, appointments);

    const total = await appointmentsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get pet appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving pet appointments'
    });
  }
});

// GET /api/appointments/:id - Get specific appointment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');

    let appointment = await appointmentsCollection.findOne({
      _id: new ObjectId(id),
      ownerId: new ObjectId(req.user.userId),
      isActive: true
    });

    if (!appointment) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Populate related details
    const appointments = await populateAppointmentDetails(db, [appointment]);
    appointment = appointments[0];

    await client.close();

    res.json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving appointment'
    });
  }
});

// POST /api/appointments - Create new appointment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      petId,
      doctorId,
      clinicId,
      type,
      scheduledAt,
      duration = 30,
      reason,
      notes
    } = req.body;

    if (!petId || !type || !scheduledAt || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Pet ID, type, scheduled time, and reason are required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');
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

    const newAppointment = {
      petId: new ObjectId(petId),
      ownerId: new ObjectId(req.user.userId),
      doctorId: doctorId ? new ObjectId(doctorId) : null,
      clinicId: clinicId || null,
      type,
      scheduledAt: new Date(scheduledAt),
      duration: parseInt(duration),
      status: 'scheduled',
      priority: 'normal',
      reason,
      notes: notes ? { owner: notes } : {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await appointmentsCollection.insertOne(newAppointment);
    
    // Get created appointment with populated details
    let createdAppointment = await appointmentsCollection.findOne({ 
      _id: result.insertedId 
    });

    // Populate related details
    const appointments = await populateAppointmentDetails(db, [createdAppointment]);
    createdAppointment = appointments[0];

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: createdAppointment
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating appointment'
    });
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.ownerId;
    delete updates.createdAt;
    
    updates.updatedAt = new Date();

    // Convert IDs to ObjectId if present
    if (updates.petId) updates.petId = new ObjectId(updates.petId);
    if (updates.doctorId) updates.doctorId = new ObjectId(updates.doctorId);
    if (updates.scheduledAt) updates.scheduledAt = new Date(updates.scheduledAt);

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');

    const result = await appointmentsCollection.updateOne(
      {
        _id: new ObjectId(id),
        ownerId: new ObjectId(req.user.userId),
        isActive: true
      },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Get updated appointment with populated details
    let updatedAppointment = await appointmentsCollection.findOne({ 
      _id: new ObjectId(id) 
    });

    // Populate related details
    const appointments = await populateAppointmentDetails(db, [updatedAppointment]);
    updatedAppointment = appointments[0];

    await client.close();

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating appointment'
    });
  }
});

// PUT /api/appointments/:id/confirm - Confirm appointment
router.put('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');

    const result = await appointmentsCollection.updateOne(
      {
        _id: new ObjectId(id),
        ownerId: new ObjectId(req.user.userId),
        isActive: true
      },
      {
        $set: {
          status: 'confirmed',
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Appointment confirmed successfully'
    });

  } catch (error) {
    console.error('Confirm appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while confirming appointment'
    });
  }
});

// PUT /api/appointments/:id/reschedule - Reschedule appointment
router.put('/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, reason } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'New scheduled time is required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');

    const updateData = {
      scheduledAt: new Date(scheduledAt),
      status: 'rescheduled',
      updatedAt: new Date()
    };

    if (reason) {
      updateData['notes.reschedule_reason'] = reason;
    }

    const result = await appointmentsCollection.updateOne(
      {
        _id: new ObjectId(id),
        ownerId: new ObjectId(req.user.userId),
        isActive: true
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully'
    });

  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rescheduling appointment'
    });
  }
});

// PUT /api/appointments/:id/complete - Complete appointment
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');

    const updateData = {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    };

    if (notes) {
      updateData['notes.completion_notes'] = notes;
    }

    const result = await appointmentsCollection.updateOne(
      {
        _id: new ObjectId(id),
        ownerId: new ObjectId(req.user.userId),
        isActive: true
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Appointment completed successfully'
    });

  } catch (error) {
    console.error('Complete appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing appointment'
    });
  }
});

// DELETE /api/appointments/:id - Cancel/Delete appointment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');

    const updateData = {
      status: 'cancelled',
      isActive: false,
      cancelledAt: new Date(),
      updatedAt: new Date()
    };

    if (reason) {
      updateData['notes.cancellation_reason'] = reason;
    }

    const result = await appointmentsCollection.updateOne(
      {
        _id: new ObjectId(id),
        ownerId: new ObjectId(req.user.userId),
        isActive: true
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling appointment'
    });
  }
});

// GET /api/appointments/stats - Get appointment statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const appointmentsCollection = db.collection('appointments');

    const stats = await appointmentsCollection.aggregate([
      {
        $match: {
          ownerId: new ObjectId(req.user.userId),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const upcomingCount = await appointmentsCollection.countDocuments({
      ownerId: new ObjectId(req.user.userId),
      isActive: true,
      scheduledAt: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    const totalAppointments = await appointmentsCollection.countDocuments({
      ownerId: new ObjectId(req.user.userId),
      isActive: true
    });

    await client.close();

    res.json({
      success: true,
      data: {
        totalAppointments,
        upcomingAppointments: upcomingCount,
        appointmentsByStatus: stats
      }
    });

  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving appointment statistics'
    });
  }
});

export default router;
