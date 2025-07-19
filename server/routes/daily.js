import express from 'express';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const router = express.Router();

// Daily.co API configuration
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

// MongoDB connection
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'vet-cares';

// Connect to MongoDB
let db;
MongoClient.connect(mongoUrl)
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to MongoDB for Daily.co routes');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Email notification functions
async function sendConsultationEmail({ 
  to, 
  patientName, 
  staffName, 
  scheduledTime, 
  duration, 
  roomUrl, 
  tenantName, 
  tenantLogo,
  meetingId,
  userType = 'patient', // 'patient' or 'staff'
  token = null // Add token parameter
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set, skipping email notification');
    return;
  }

  const formattedTime = new Date(scheduledTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const subject = userType === 'patient' 
    ? `Your Online Consultation with ${tenantName} - ${formattedTime}`
    : `New Consultation Scheduled - ${patientName} - ${formattedTime}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7fafc; padding: 32px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        ${tenantLogo ? `<img src="${tenantLogo}" alt="${tenantName}" style="height: 40px; margin-bottom: 12px;">` : ''}
        <h1 style="margin: 0; font-size: 1.8rem; font-weight: bold; letter-spacing: 1px;">
          Online Consultation
        </h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 1.1rem;">
          ${tenantName || 'VetVault'}
        </p>
      </div>
      
      <div style="background: #fff; padding: 32px 24px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="background: #e0f2fe; border: 2px solid #0284c7; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <span style="font-size: 2rem;">📹</span>
          </div>
          <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 1.4rem;">
            ${userType === 'patient' ? 'Your Consultation is Scheduled!' : 'New Consultation Scheduled'}
          </h2>
          <p style="color: #64748b; margin: 0; font-size: 1rem;">
            ${userType === 'patient' ? 'We look forward to seeing you online' : 'Please join the consultation at the scheduled time'}
          </p>
        </div>

        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #1e293b; margin: 0 0 16px 0; font-size: 1.1rem;">📅 Consultation Details</h3>
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: #64748b; min-width: 80px;">👤 Patient:</span>
              <span style="color: #1e293b; font-weight: 500;">${patientName}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: #64748b; min-width: 80px;">👨‍⚕️ Doctor:</span>
              <span style="color: #1e293b; font-weight: 500;">${staffName}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: #64748b; min-width: 80px;">📅 Date:</span>
              <span style="color: #1e293b; font-weight: 500;">${formattedTime}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: #64748b; min-width: 80px;">⏱️ Duration:</span>
              <span style="color: #1e293b; font-weight: 500;">${duration} minutes</span>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${roomUrl}?t=${userType === 'patient' ? 'patient' : 'staff'}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1.1rem; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
            🚀 Join Consultation
          </a>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 1rem;">📋 Important Information</h4>
          <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 0.95rem;">
            <li>Please join 5 minutes before the scheduled time</li>
            <li>Ensure you have a stable internet connection</li>
            <li>Test your camera and microphone beforehand</li>
            <li>Have your pet ready for the consultation</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="color: #64748b; margin: 0 0 8px 0; font-size: 0.9rem;">
            Need to reschedule or have questions?
          </p>
          <p style="color: #2563eb; margin: 0; font-weight: 500; font-size: 0.9rem;">
            Reply to this email or call us directly
          </p>
        </div>

        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; margin: 0; font-size: 0.85rem;">
            Meeting ID: ${meetingId}<br>
            Powered by VetVault - Professional Veterinary Care Management
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'consultations@vetvault.in',
        to,
        subject,
        html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send consultation email:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    console.log(`Consultation email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending consultation email:', error);
    // Don't throw error to avoid breaking the meeting creation
  }
}

// Helper function to get tenant and staff information
async function getTenantAndStaffInfo(tenantId, staffId) {
  try {
    const tenantsCollection = db.collection('tenants');
    const staffCollection = db.collection('staff');

    const [tenant, staff] = await Promise.all([
      tenantsCollection.findOne({ _id: new ObjectId(tenantId) }),
      staffCollection.findOne({ _id: new ObjectId(staffId) })
    ]);

    return {
      tenant: tenant || { name: 'VetVault', logo: null },
      staff: staff || { first_name: 'Doctor', last_name: staffId }
    };
  } catch (error) {
    console.error('Error fetching tenant/staff info:', error);
    return {
      tenant: { name: 'VetVault', logo: null },
      staff: { first_name: 'Doctor', last_name: staffId }
    };
  }
}

// Helper function to get patient information
async function getPatientInfo(patientId) {
  try {
    // First, check if patientId is a valid ObjectId
    if (!patientId || typeof patientId !== 'string' || patientId.length !== 24) {
      console.log('Invalid patientId format, skipping patient lookup:', patientId);
      return null;
    }

    const clientsCollection = db.collection('clients');
    const petsCollection = db.collection('pets');

    // Try to find patient in pets collection first
    let patient = await petsCollection.findOne({ _id: new ObjectId(patientId) });
    
    if (!patient) {
      // If not found in pets, try clients collection
      patient = await clientsCollection.findOne({ _id: new ObjectId(patientId) });
    }

    return patient;
  } catch (error) {
    console.error('Error fetching patient info:', error);
    return null;
  }
}

// Helper function to get or create patient email
async function getPatientEmail(patientId, patientName, tenantId) {
  try {
    // First try to get existing patient info
    const patient = await getPatientInfo(patientId);
    
    if (patient && patient.email) {
      return {
        email: patient.email,
        name: patient.name || patientName,
        isExisting: true
      };
    }

    // If no email found, return null to prompt for email
    return {
      email: null,
      name: patientName,
      isExisting: false
    };
  } catch (error) {
    console.error('Error getting patient email:', error);
    return {
      email: null,
      name: patientName,
      isExisting: false
    };
  }
}

// Helper function to generate Daily.co meeting token
const generateDailyToken = (roomName, userName, tenantId, staffId, meetingId, options = {}) => {
  const {
    exp = Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour default
    nbf = Math.floor(Date.now() / 1000), // Now
    eject_at_token_exp = true,
    eject_after_elapsed = null, // Optional: seconds after joining
    permissions = ['send', 'recv', 'write'] // Default permissions
  } = options;

  const payload = {
    aud: 'daily',
    iss: DAILY_API_KEY,
    sub: roomName,
    room: roomName,
    exp,
    nbf,
    user_name: userName,
    user_id: `${tenantId}-${staffId}-${meetingId}`,
    tenant_id: tenantId,
    staff_id: staffId,
    meeting_id: meetingId,
    eject_at_token_exp,
    permissions
  };

  if (eject_after_elapsed) {
    payload.eject_after_elapsed = eject_after_elapsed;
  }

  return jwt.sign(payload, DAILY_API_KEY, { algorithm: 'HS256' });
};

// Create a new meeting with token
router.post('/create-meeting', async (req, res) => {
  try {
    const {
      tenantId,
      staffId,
      patientName,
      patientId,
      scheduledTime,
      duration = 30, // minutes
      roomName = null
    } = req.body;

    if (!tenantId || !staffId || !patientName || !scheduledTime) {
      return res.status(400).json({
        error: 'Missing required fields: tenantId, staffId, patientName, scheduledTime'
      });
    }

    // Generate unique room name if not provided
    const meetingRoomName = roomName || `vet-consultation-${tenantId}-${Date.now()}`;
    
    // Calculate meeting timeframes
    const meetingStartTime = new Date(scheduledTime);
    const meetingEndTime = new Date(meetingStartTime.getTime() + (duration * 60 * 1000));
    
    // Token expiry settings
    const tokenExpiry = Math.floor(meetingEndTime.getTime() / 1000);
    const tokenNotBefore = Math.floor((meetingStartTime.getTime() - (15 * 60 * 1000)) / 1000); // 15 min before
    const ejectAfterElapsed = duration * 60; // Convert to seconds

    // Create meeting record in MongoDB
    const meetingData = {
      tenantId,
      staffId,
      patientName,
      patientId,
      roomName: meetingRoomName,
      scheduledTime: meetingStartTime,
      endTime: meetingEndTime,
      duration,
      status: 'scheduled',
      createdAt: new Date(),
      tokenExpiry,
      tokenNotBefore,
      ejectAfterElapsed
    };

    const meetingsCollection = db.collection('daily_meetings');
    const result = await meetingsCollection.insertOne(meetingData);
    const meetingId = result.insertedId.toString();

    // Generate tokens for staff and patient
    const staffToken = generateDailyToken(
      meetingRoomName,
      `Dr. ${staffId}`,
      tenantId,
      staffId,
      meetingId,
      {
        exp: tokenExpiry,
        nbf: tokenNotBefore,
        eject_at_token_exp: true,
        eject_after_elapsed: ejectAfterElapsed,
        permissions: ['send', 'recv', 'write', 'admin']
      }
    );

    const patientToken = generateDailyToken(
      meetingRoomName,
      patientName,
      tenantId,
      staffId,
      meetingId,
      {
        exp: tokenExpiry,
        nbf: tokenNotBefore,
        eject_at_token_exp: true,
        eject_after_elapsed: ejectAfterElapsed,
        permissions: ['send', 'recv', 'write'] // Added write permission for patients
      }
    );

    // Create room via Daily.co API
    const roomResponse = await fetch(`${DAILY_API_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: meetingRoomName,
        privacy: 'public', // Changed to public to allow token-based access
        properties: {
          exp: tokenExpiry,
          eject_at_room_exp: true,
          enable_chat: true,
          enable_recording: 'cloud',
          start_video_off: true,
          start_audio_off: false,
          enable_knocking: false,
          enable_screenshare: true,
          enable_people_ui: true,
          lang: 'en'
        }
      })
    });

    if (!roomResponse.ok) {
      throw new Error(`Failed to create Daily.co room: ${roomResponse.statusText}`);
    }

    const roomData = await roomResponse.json();

    // Update meeting record with tokens and room URL
    await meetingsCollection.updateOne(
      { _id: result.insertedId },
      {
        $set: {
          staffToken,
          patientToken,
          roomUrl: roomData.url,
          dailyRoomId: roomData.id
        }
      }
    );

    // Get tenant and staff information for email
    const { tenant, staff } = await getTenantAndStaffInfo(tenantId, staffId);
    const patientEmailInfo = await getPatientEmail(patientId, patientName, tenantId);

    // Send email notifications
    const emailPromises = [];

    // Send email to patient if available
    if (patientEmailInfo.email) {
      emailPromises.push(
        sendConsultationEmail({
          to: patientEmailInfo.email,
          patientName: patientEmailInfo.name,
          staffName: `${staff.first_name} ${staff.last_name}`,
          scheduledTime: meetingStartTime,
          duration: duration,
          roomUrl: roomData.url,
          tenantName: tenant.name,
          tenantLogo: tenant.logo,
          meetingId: meetingId,
          userType: 'patient'
        })
      );
    }

    // Send email to staff if available
    if (staff && staff.email) {
      emailPromises.push(
        sendConsultationEmail({
          to: staff.email,
          patientName: patientName,
          staffName: `${staff.first_name} ${staff.last_name}`,
          scheduledTime: meetingStartTime,
          duration: duration,
          roomUrl: roomData.url,
          tenantName: tenant.name,
          tenantLogo: tenant.logo,
          meetingId: meetingId,
          userType: 'staff'
        })
      );
    }

    // Send emails in parallel (don't wait for completion to avoid blocking)
    if (emailPromises.length > 0) {
      Promise.allSettled(emailPromises).then(results => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Email notification failed:`, result.reason);
          }
        });
      });
    }

    // Return email status for frontend handling
    const emailStatus = {
      patientEmailSent: !!patientEmailInfo.email,
      patientEmailRequired: !patientEmailInfo.email,
      patientEmail: patientEmailInfo.email,
      patientName: patientEmailInfo.name,
      isExistingPatient: patientEmailInfo.isExisting
    };

    res.json({
      success: true,
      meetingId,
      roomName: meetingRoomName,
      roomUrl: roomData.url,
      staffToken,
      patientToken,
      scheduledTime: meetingStartTime,
      endTime: meetingEndTime,
      duration,
      tokenExpiry: new Date(tokenExpiry * 1000),
      tokenNotBefore: new Date(tokenNotBefore * 1000),
      emailStatus
    });

  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      error: 'Failed to create meeting',
      details: error.message
    });
  }
});

// Get meeting token for joining
router.post('/get-meeting-token', async (req, res) => {
  try {
    const { meetingId, userId, userType } = req.body;

    if (!meetingId || !userId || !userType) {
      return res.status(400).json({
        error: 'Missing required fields: meetingId, userId, userType'
      });
    }

    const meetingsCollection = db.collection('daily_meetings');
    const meeting = await meetingsCollection.findOne({ _id: new ObjectId(meetingId) });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if meeting is still valid
    const now = Math.floor(Date.now() / 1000);
    if (now > meeting.tokenExpiry) {
      return res.status(400).json({ error: 'Meeting has expired' });
    }

    if (now < meeting.tokenNotBefore) {
      return res.status(400).json({ 
        error: 'Meeting has not started yet',
        startTime: new Date(meeting.tokenNotBefore * 1000)
      });
    }

    // Return appropriate token based on user type
    const token = userType === 'staff' ? meeting.staffToken : meeting.patientToken;
    const userName = userType === 'staff' ? `Dr. ${meeting.staffId}` : meeting.patientName;

    res.json({
      success: true,
      token,
      roomUrl: meeting.roomUrl,
      roomName: meeting.roomName,
      userName,
      meetingData: {
        scheduledTime: meeting.scheduledTime,
        endTime: meeting.endTime,
        duration: meeting.duration,
        patientName: meeting.patientName
      }
    });

  } catch (error) {
    console.error('Error getting meeting token:', error);
    res.status(500).json({
      error: 'Failed to get meeting token',
      details: error.message
    });
  }
});

// List meetings for a tenant/staff
router.get('/meetings/:tenantId/:staffId', async (req, res) => {
  try {
    const { tenantId, staffId } = req.params;
    const { status = 'all' } = req.query;

    const meetingsCollection = db.collection('daily_meetings');
    let query = { tenantId, staffId };

    if (status !== 'all') {
      query.status = status;
    }

    const meetings = await meetingsCollection
      .find(query)
      .sort({ scheduledTime: -1 })
      .toArray();

    res.json({
      success: true,
      meetings: meetings.map(meeting => ({
        id: meeting._id,
        roomName: meeting.roomName,
        patientName: meeting.patientName,
        patientId: meeting.patientId,
        scheduledTime: meeting.scheduledTime,
        endTime: meeting.endTime,
        duration: meeting.duration,
        status: meeting.status,
        roomUrl: meeting.roomUrl,
        tokenExpiry: new Date(meeting.tokenExpiry * 1000),
        tokenNotBefore: new Date(meeting.tokenNotBefore * 1000)
      }))
    });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      error: 'Failed to fetch meetings',
      details: error.message
    });
  }
});

// Update meeting status
router.patch('/meetings/:meetingId/status', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const meetingsCollection = db.collection('daily_meetings');
    const result = await meetingsCollection.updateOne(
      { _id: new ObjectId(meetingId) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({ success: true, status });

  } catch (error) {
    console.error('Error updating meeting status:', error);
    res.status(500).json({
      error: 'Failed to update meeting status',
      details: error.message
    });
  }
});

// Delete/expire meeting
router.delete('/meetings/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meetingsCollection = db.collection('daily_meetings');
    const meeting = await meetingsCollection.findOne({ _id: new ObjectId(meetingId) });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Delete room from Daily.co
    if (meeting.dailyRoomId) {
      await fetch(`${DAILY_API_URL}/rooms/${meeting.dailyRoomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      });
    }

    // Delete from MongoDB
    await meetingsCollection.deleteOne({ _id: new ObjectId(meetingId) });

    res.json({ success: true, message: 'Meeting deleted successfully' });

  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      error: 'Failed to delete meeting',
      details: error.message
    });
  }
});

// Validate meeting token
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Decode token to check expiry
    const decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    const now = Math.floor(Date.now() / 1000);
    const isValid = decoded.exp > now && decoded.nbf <= now;

    res.json({
      success: true,
      isValid,
      tokenData: {
        roomName: decoded.room,
        userName: decoded.user_name,
        userId: decoded.user_id,
        tenantId: decoded.tenant_id,
        staffId: decoded.staff_id,
        meetingId: decoded.meeting_id,
        exp: new Date(decoded.exp * 1000),
        nbf: new Date(decoded.nbf * 1000),
        permissions: decoded.permissions
      }
    });

  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({
      error: 'Failed to validate token',
      details: error.message
    });
  }
});

// Resend consultation email
router.post('/resend-email', async (req, res) => {
  try {
    const { meetingId, userType, email } = req.body;

    if (!meetingId || !userType || !email) {
      return res.status(400).json({
        error: 'Missing required fields: meetingId, userType, email'
      });
    }

    const meetingsCollection = db.collection('daily_meetings');
    const meeting = await meetingsCollection.findOne({ _id: new ObjectId(meetingId) });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get tenant and staff information
    const { tenant, staff } = await getTenantAndStaffInfo(meeting.tenantId, meeting.staffId);
    const patient = await getPatientInfo(meeting.patientId);

    // Send email
    await sendConsultationEmail({
      to: email,
      patientName: patient?.name || meeting.patientName,
      staffName: `${staff.first_name} ${staff.last_name}`,
      scheduledTime: meeting.scheduledTime,
      duration: meeting.duration,
      roomUrl: meeting.roomUrl,
      tenantName: tenant.name,
      tenantLogo: tenant.logo,
      meetingId: meetingId,
      userType: userType
    });

    res.json({
      success: true,
      message: 'Consultation email sent successfully'
    });

  } catch (error) {
    console.error('Error resending consultation email:', error);
    res.status(500).json({
      error: 'Failed to resend email',
      details: error.message
    });
  }
});

// Get consultations for a specific client
router.post('/client-consultations', async (req, res) => {
  try {
    const { tenantId, clientId, petIds } = req.body;

    if (!tenantId || !clientId) {
      return res.status(400).json({
        error: 'Missing required fields: tenantId, clientId'
      });
    }

    const meetingsCollection = db.collection('daily_meetings');
    
    // Build query to find consultations for this client's pets
    const query = {
      tenantId: tenantId,
      $or: [
        { patientId: clientId }, // Direct client consultation
        { patientId: { $in: petIds || [] } } // Pet consultations
      ]
    };

    const consultations = await meetingsCollection
      .find(query)
      .sort({ scheduledTime: 1 })
      .toArray();

    // Enrich consultations with staff information
    const enrichedConsultations = await Promise.all(
      consultations.map(async (consultation) => {
        try {
          const { staff } = await getTenantAndStaffInfo(consultation.tenantId, consultation.staffId);
          const patient = await getPatientInfo(consultation.patientId);
          
          return {
            ...consultation,
            staffName: `${staff.first_name} ${staff.last_name}`,
            patientEmail: patient?.email,
            clientEmail: patient?.email
          };
        } catch (error) {
          console.error('Error enriching consultation:', error);
          return consultation;
        }
      })
    );

    res.json({
      success: true,
      consultations: enrichedConsultations
    });

  } catch (error) {
    console.error('Error getting client consultations:', error);
    res.status(500).json({
      error: 'Failed to get consultations',
      details: error.message
    });
  }
});

// Send consultation email with provided email address
router.post('/send-consultation-email', async (req, res) => {
  try {
    const { meetingId, email, patientName } = req.body;

    if (!meetingId || !email || !patientName) {
      return res.status(400).json({
        error: 'Missing required fields: meetingId, email, patientName'
      });
    }

    const meetingsCollection = db.collection('daily_meetings');
    const meeting = await meetingsCollection.findOne({ _id: new ObjectId(meetingId) });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get tenant and staff information
    const { tenant, staff } = await getTenantAndStaffInfo(meeting.tenantId, meeting.staffId);

    // Send email
    await sendConsultationEmail({
      to: email,
      patientName: patientName,
      staffName: `${staff.first_name} ${staff.last_name}`,
      scheduledTime: meeting.scheduledTime,
      duration: meeting.duration,
      roomUrl: meeting.roomUrl,
      tenantName: tenant.name,
      tenantLogo: tenant.logo,
      meetingId: meetingId,
      userType: 'patient'
    });

    res.json({
      success: true,
      message: 'Consultation email sent successfully'
    });

  } catch (error) {
    console.error('Error sending consultation email:', error);
    res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
});

export default router; 