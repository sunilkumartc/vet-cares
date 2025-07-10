import { z } from 'zod';
import { getMongoClient } from '../../../lib/mongoClient.js';
import { ObjectId } from 'mongodb';

// Input validation schema for feedback submission
const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  tags: z.array(z.enum(['staff_friendliness', 'wait_time', 'cleanliness', 'clarity_of_advice'])).optional(),
  appointment_id: z.string(),
});

// Get feedback for an appointment
export async function getFeedbackHandler(req, res) {
  try {
    const { appointmentId } = req.params;
    
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID is required'
      });
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db('vet-cares');
    
    const appointment = await db.collection('appointments').findOne(
      { _id: new ObjectId(appointmentId) },
      { projection: { feedback: 1, pet_id: 1, staff_id: 1, appointment_date: 1, status: 1 } }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Get pet and staff details for display
    const [pet, staff] = await Promise.all([
      appointment.pet_id ? db.collection('pets').findOne({ _id: new ObjectId(appointment.pet_id) }) : null,
      appointment.staff_id ? db.collection('staff').findOne({ _id: new ObjectId(appointment.staff_id) }) : null
    ]);

    res.json({
      success: true,
      feedback: appointment.feedback || null,
      appointment: {
        id: appointment._id.toString(),
        date: appointment.appointment_date,
        status: appointment.status,
        pet: pet ? {
          id: pet._id.toString(),
          name: pet.name,
          species: pet.species,
          breed: pet.breed
        } : null,
        staff: staff ? {
          id: staff._id.toString(),
          name: `${staff.first_name} ${staff.last_name}`,
          role: staff.role
        } : null
      }
    });
  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback'
    });
  }
}

// Submit feedback for an appointment
export async function submitFeedbackHandler(req, res) {
  try {
    // Validate input
    const body = feedbackSchema.parse(req.body);
    
    const mongoClient = await getMongoClient();
    const db = mongoClient.db('vet-cares');
    
    // Check if appointment exists and is completed
    const appointment = await db.collection('appointments').findOne({
      _id: new ObjectId(body.appointment_id),
      status: 'completed'
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or not completed'
      });
    }

    // Check if feedback already exists
    if (appointment.feedback) {
      return res.status(400).json({
        success: false,
        error: 'Feedback already submitted for this appointment'
      });
    }

    // Update appointment with feedback
    const feedbackData = {
      rating: body.rating,
      comment: body.comment || '',
      tags: body.tags || [],
      submitted_at: new Date(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    const result = await db.collection('appointments').updateOne(
      { _id: new ObjectId(body.appointment_id) },
      { 
        $set: { 
          feedback: feedbackData,
          updated_date: new Date()
        } 
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save feedback'
      });
    }

    // Get updated appointment with pet and staff details
    const updatedAppointment = await db.collection('appointments').findOne(
      { _id: new ObjectId(body.appointment_id) },
      { 
        projection: { 
          feedback: 1, 
          pet_id: 1, 
          staff_id: 1, 
          appointment_date: 1,
          client_id: 1
        } 
      }
    );

    const [pet, staff, client] = await Promise.all([
      updatedAppointment.pet_id ? db.collection('pets').findOne({ _id: new ObjectId(updatedAppointment.pet_id) }) : null,
      updatedAppointment.staff_id ? db.collection('staff').findOne({ _id: new ObjectId(updatedAppointment.staff_id) }) : null,
      updatedAppointment.client_id ? db.collection('clients').findOne({ _id: new ObjectId(updatedAppointment.client_id) }) : null
    ]);

    // Send thank you message via WhatsApp if configured
    if (client?.phone && process.env.WHATSAPP_API_KEY) {
      try {
        await sendThankYouMessage(client.phone, pet?.name || 'your pet', staff?.first_name || 'our team');
      } catch (whatsappError) {
        console.warn('Failed to send WhatsApp thank you message:', whatsappError);
      }
    }

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedback: feedbackData,
      appointment: {
        id: updatedAppointment._id.toString(),
        date: updatedAppointment.appointment_date,
        pet: pet ? {
          name: pet.name,
          species: pet.species
        } : null,
        staff: staff ? {
          name: `${staff.first_name} ${staff.last_name}`
        } : null
      }
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
}

// Get feedback analytics for clinic
export async function getFeedbackAnalyticsHandler(req, res) {
  try {
    const { tenant_id } = req.query;
    
    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db('vet-cares');
    
    // Aggregate feedback data
    const pipeline = [
      {
        $match: {
          tenant_id: tenant_id,
          feedback: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$feedback.rating' },
          ratingDistribution: {
            $push: '$feedback.rating'
          },
          tagCounts: {
            $push: '$feedback.tags'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalFeedback: 1,
          averageRating: { $round: ['$averageRating', 2] },
          ratingDistribution: {
            '1': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 1] } } } },
            '2': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 2] } } } },
            '3': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 3] } } } },
            '4': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 4] } } } },
            '5': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 5] } } } }
          },
          tagCounts: 1
        }
      }
    ];

    const analytics = await db.collection('appointments').aggregate(pipeline).toArray();
    
    // Process tag counts
    const tagCounts = {};
    if (analytics[0]?.tagCounts) {
      analytics[0].tagCounts.flat().forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }

    res.json({
      success: true,
      analytics: {
        ...analytics[0],
        tagCounts
      }
    });
  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback analytics'
    });
  }
}

// Helper function to send thank you WhatsApp message
async function sendThankYouMessage(phone, petName, staffName) {
  if (!process.env.WHATSAPP_API_KEY || !process.env.WHATSAPP_API_URL) {
    return;
  }

  const message = `Thank you for your feedback! 🐾

We're glad you had a great experience with ${staffName} and ${petName}. Your feedback helps us provide better care for all our furry friends.

See you next time! 🐕🐱`;

  const response = await fetch(process.env.WHATSAPP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`
    },
    body: JSON.stringify({
      phone: phone,
      message: message
    })
  });

  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${response.status}`);
  }
} 