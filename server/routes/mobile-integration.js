import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';

const router = express.Router();

// MongoDB connection
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'vet-cares';

let db;
MongoClient.connect(mongoUrl)
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to MongoDB for Mobile Integration routes');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Search tenants (clinics)
router.get('/tenants/search', async (req, res) => {
  try {
    const { query, location } = req.query;

    let searchQuery = { status: 'active' };
    
    if (query) {
      searchQuery.name = { $regex: query, $options: 'i' };
    }
    
    if (location) {
      searchQuery.address = { $regex: location, $options: 'i' };
    }

    const tenants = await db.collection('tenants')
      .find(searchQuery)
      .project({
        _id: 1,
        name: 1,
        address: 1,
        phone: 1,
        email: 1,
        subdomain: 1,
        slug: 1
      })
      .limit(20)
      .toArray();

    res.json({
      success: true,
      data: tenants.map(tenant => ({
        id: tenant._id.toString(),
        name: tenant.name,
        address: tenant.address,
        phone: tenant.phone,
        email: tenant.email,
        subdomain: tenant.subdomain,
        slug: tenant.slug
      }))
    });

  } catch (error) {
    console.error('Tenant search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search tenants'
    });
  }
});

// Create clinic link request
router.post('/clinic-link-requests', async (req, res) => {
  try {
    const { clinicId, userId, userName, userEmail, userPhone, message } = req.body;

    if (!clinicId || !userId || !userName) {
      return res.status(400).json({
        success: false,
        message: 'Clinic ID, user ID, and user name are required'
      });
    }

    // Check if request already exists
    const existingRequest = await db.collection('clinic_link_requests').findOne({
      clinicId: new ObjectId(clinicId),
      userId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: 'Link request already exists'
      });
    }

    // Create link request
    const linkRequest = {
      clinicId: new ObjectId(clinicId),
      userId,
      userName,
      userEmail: userEmail || '',
      userPhone: userPhone || '',
      message: message || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('clinic_link_requests').insertOne(linkRequest);

    res.status(201).json({
      success: true,
      message: 'Link request created successfully'
    });

  } catch (error) {
    console.error('Create link request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create link request'
    });
  }
});

// Get user's linked clinics
router.get('/users/:userId/linked-clinics', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get approved link requests for this user
    const linkedClinics = await db.collection('clinic_link_requests')
      .find({
        userId,
        status: 'approved'
      })
      .toArray();

    // Get clinic details for each approved request
    const clinicIds = linkedClinics.map(req => req.clinicId);
    const clinics = await db.collection('tenants')
      .find({ _id: { $in: clinicIds } })
      .project({ _id: 1, name: 1, slug: 1, subdomain: 1 })
      .toArray();

    // Map clinic details to link requests
    const result = linkedClinics.map(link => {
      const clinic = clinics.find(c => c._id.toString() === link.clinicId.toString());
      return {
        id: clinic?._id.toString(),
        name: clinic?.name,
        slug: clinic?.slug,
        subdomain: clinic?.subdomain,
        linkedAt: link.updatedAt
      };
    }).filter(item => item.id); // Remove any without clinic details

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get linked clinics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get linked clinics'
    });
  }
});

// Get user's clinic link requests (including pending)
router.get('/users/:userId/clinic-link-requests', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all link requests for this user (pending and approved)
    const linkRequests = await db.collection('clinic_link_requests')
      .find({ userId })
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    // Get clinic details for each request
    const clinicIds = linkRequests.map(req => req.clinicId);
    const clinics = await db.collection('tenants')
      .find({ _id: { $in: clinicIds } })
      .project({ _id: 1, name: 1, slug: 1, subdomain: 1, address: 1, phone: 1, email: 1 })
      .toArray();

    // Map clinic details to link requests
    const result = linkRequests.map(link => {
      const clinic = clinics.find(c => c._id.toString() === link.clinicId.toString());
      return {
        id: link._id.toString(),
        clinic: clinic ? {
          id: clinic._id.toString(),
          name: clinic.name,
          slug: clinic.slug,
          subdomain: clinic.subdomain,
          address: clinic.address,
          phone: clinic.phone,
          email: clinic.email
        } : null,
        status: link.status,
        message: link.message,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt
      };
    }).filter(item => item.clinic); // Remove any without clinic details

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get clinic link requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get clinic link requests'
    });
  }
});

// Get pending link requests for a clinic
router.get('/clinics/:clinicId/link-requests', async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { status } = req.query;

    const filter = { clinicId: new ObjectId(clinicId) };
    if (status) {
      filter.status = status;
    }

    const requests = await db.collection('clinic_link_requests')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error('Get link requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get link requests'
    });
  }
});

// Approve or reject a link request
router.patch('/clinic-link-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, responseMessage } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    const result = await db.collection('clinic_link_requests').updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status,
          responseMessage: responseMessage || '',
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Link request not found'
      });
    }

    // Send notification to mobile app user
    try {
      const notificationService = require('../../vetvault-mobile/api/services/notificationService');
      
      // Get clinic name for notification
      const clinic = await db.collection('tenants').findOne({ _id: new ObjectId(clinicId) });
      const clinicName = clinic?.name || 'Clinic';
      
      await notificationService.sendLinkRequestNotification(
        userId,
        clinicName,
        status,
        responseMessage
      );
    } catch (error) {
      console.error('Error sending notification:', error);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: `Link request ${status} successfully`
    });

  } catch (error) {
    console.error('Update link request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update link request'
    });
  }
});

// Get link request statistics for a clinic
router.get('/clinics/:clinicId/link-stats', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const stats = await db.collection('clinic_link_requests')
      .aggregate([
        { $match: { clinicId: new ObjectId(clinicId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

    const result = {
      pending: 0,
      approved: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get link stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get link statistics'
    });
  }
});

// Create appointment
router.post('/appointments', async (req, res) => {
  try {
    const { 
      clinicId, 
      userId, 
      petId, 
      petName, 
      scheduledTime, 
      type, 
      reason, 
      notes 
    } = req.body;

    if (!clinicId || !userId || !petName || !scheduledTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Clinic ID, user ID, pet name, scheduled time, and reason are required'
      });
    }

    const appointment = {
      tenant_id: clinicId, // Use clinicId as tenant_id for compatibility with dashboard
      clinicId: new ObjectId(clinicId),
      userId,
      petId: petId || null,
      petName,
      scheduledTime: new Date(scheduledTime),
      type: type || 'consultation',
      reason,
      notes: notes || '',
      status: 'pending',
      // Add fields expected by vet-cares admin dashboard
      appointment_date: new Date(scheduledTime).toISOString().split('T')[0], // YYYY-MM-DD format
      appointment_time: new Date(scheduledTime).toTimeString().split(' ')[0], // HH:MM:SS format
      service_type: type || 'consultation',
      client_id: userId, // Map userId to client_id for dashboard compatibility
      pet_id: petId || null, // Map petId to pet_id for dashboard compatibility
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('appointments').insertOne(appointment);

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: {
        id: result.insertedId.toString(),
        ...appointment,
        clinicId: appointment.clinicId.toString()
      }
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment'
    });
  }
});

// Get appointments for user
router.get('/appointments', async (req, res) => {
  try {
    const { userId, clinicId, status } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let query = { userId };
    if (clinicId) {
      query.$or = [
        { clinicId: new ObjectId(clinicId) },
        { tenant_id: clinicId }
      ];
    }
    if (status) {
      query.status = status;
    }

    const appointments = await db.collection('appointments')
      .find(query)
      .sort({ scheduledTime: -1 })
      .toArray();

    res.json({
      success: true,
      data: appointments.map(apt => ({
        id: apt._id.toString(),
        petName: apt.petName,
        scheduledTime: apt.scheduledTime,
        status: apt.status,
        type: apt.type,
        reason: apt.reason,
        notes: apt.notes
      }))
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get appointments'
    });
  }
});

// Get prescriptions for user
router.get('/prescriptions', async (req, res) => {
  try {
    const { userId, clinicId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let query = { userId };
    if (clinicId) {
      query.clinicId = new ObjectId(clinicId);
    }

    const prescriptions = await db.collection('prescriptions')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: prescriptions.map(pres => ({
        id: pres._id.toString(),
        petName: pres.petName,
        diagnosis: pres.diagnosis,
        medications: pres.medications || [],
        instructions: pres.instructions,
        createdAt: pres.createdAt
      }))
    });

  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prescriptions'
    });
  }
});

// Get vaccinations for user
router.get('/vaccinations', async (req, res) => {
  try {
    const { userId, clinicId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let query = { userId };
    if (clinicId) {
      query.clinicId = new ObjectId(clinicId);
    }

    const vaccinations = await db.collection('vaccinations')
      .find(query)
      .sort({ date: -1 })
      .toArray();

    res.json({
      success: true,
      data: vaccinations.map(vacc => ({
        id: vacc._id.toString(),
        petName: vacc.petName,
        vaccineName: vacc.vaccineName,
        date: vacc.date,
        nextDueDate: vacc.nextDueDate,
        status: vacc.status
      }))
    });

  } catch (error) {
    console.error('Get vaccinations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vaccinations'
    });
  }
});

// Get health tips
router.get('/health-tips', async (req, res) => {
  try {
    const { clinicId } = req.query;

    let query = { isActive: true };
    if (clinicId) {
      query.clinicId = new ObjectId(clinicId);
    }

    const healthTips = await db.collection('health_tips')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    res.json({
      success: true,
      data: healthTips.map(tip => ({
        id: tip._id.toString(),
        title: tip.title,
        content: tip.content,
        category: tip.category,
        image: tip.image,
        createdAt: tip.createdAt
      }))
    });

  } catch (error) {
    console.error('Get health tips error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get health tips'
    });
  }
});

// Create pet
router.post('/pets', async (req, res) => {
  try {
    const { 
      userId, 
      name, 
      species, 
      breed, 
      age, 
      weight, 
      gender, 
      color, 
      photo 
    } = req.body;

    if (!userId || !name || !species) {
      return res.status(400).json({
        success: false,
        message: 'User ID, name, and species are required'
      });
    }

    const pet = {
      userId,
      name,
      species,
      breed: breed || '',
      age: age || '',
      weight: weight || '',
      gender: gender || 'unknown',
      color: color || '',
      photo: photo || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('pets').insertOne(pet);

    res.status(201).json({
      success: true,
      message: 'Pet created successfully',
      data: {
        id: result.insertedId.toString(),
        ...pet
      }
    });

  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pet'
    });
  }
});

// Get all pending link requests for admin dashboard
router.get('/admin/link-requests', async (req, res) => {
  try {
    const { status, clinicId } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }
    if (clinicId) {
      query.clinicId = new ObjectId(clinicId);
    }

    const linkRequests = await db.collection('clinic_link_requests')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Get clinic details for each request
    const clinicIds = [...new Set(linkRequests.map(req => req.clinicId.toString()))];
    const clinics = await db.collection('tenants')
      .find({ _id: { $in: clinicIds.map(id => new ObjectId(id)) } })
      .project({ _id: 1, name: 1, slug: 1, subdomain: 1 })
      .toArray();

    // Map clinic details to link requests
    const result = linkRequests.map(link => {
      const clinic = clinics.find(c => c._id.toString() === link.clinicId.toString());
      return {
        id: link._id.toString(),
        clinicId: link.clinicId.toString(),
        clinicName: clinic?.name || 'Unknown Clinic',
        clinicSlug: clinic?.slug || '',
        clinicSubdomain: clinic?.subdomain || '',
        userId: link.userId,
        userName: link.userName,
        userEmail: link.userEmail,
        userPhone: link.userPhone,
        message: link.message,
        status: link.status,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt
      };
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get admin link requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin link requests'
    });
  }
});

// Approve or reject a clinic link request
router.put('/admin/link-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, adminNotes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    const result = await db.collection('clinic_link_requests').updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status,
          adminNotes: adminNotes || '',
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Link request not found'
      });
    }

    res.json({
      success: true,
      message: `Link request ${status} successfully`
    });

  } catch (error) {
    console.error('Update link request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update link request'
    });
  }
});

export default router; 