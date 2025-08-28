import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Utility to send email via Resend
async function sendWelcomeEmail({ to, name, tenantName, welcomeMessage, bookingUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'info@vetvault.in',
      to,
      subject: `Welcome to ${tenantName || 'VetVault'}!`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7fafc; padding: 32px; border-radius: 12px; max-width: 520px; margin: 0 auto;">
          <div style="background: #2563eb; color: #fff; padding: 18px 0; border-radius: 8px 8px 0 0; text-align: center; font-size: 1.5rem; font-weight: bold; letter-spacing: 1px;">
            Welcome to ${tenantName || 'VetVault'}!
          </div>
          <div style="background: #fff; padding: 28px 24px 20px 24px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <p style="font-size: 1.1rem; margin-bottom: 18px;">Hi <strong>${name || 'Pet Parent'}</strong>,</p>
            <p style="margin-bottom: 16px;">${welcomeMessage || `We're thrilled to welcome you and your furry family to <strong>${tenantName || 'our clinic'}</strong>! 🐾<br/><br/>Our team is dedicated to providing compassionate, expert care for your pets. Whether it's a routine checkup, a health concern, or just a friendly visit, we're here for you every step of the way.`}</p>
            <p style="margin-bottom: 16px; color: #2563eb; font-weight: 500;">Have questions or want to book your first appointment? Just reply to this email or call us anytime!</p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${bookingUrl || '#'}" style="background: #2563eb; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 1rem;">Book Appointment</a>
            </div>
            <p style="font-size: 0.98rem; color: #555;">We can't wait to meet you and your pet.<br/>Warm regards,<br/><span style="color: #2563eb; font-weight: 600;">${tenantName || 'The VetVault Team'}</span></p>
          </div>
        </div>
      `
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}

router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      last_name, 
      email, 
      phone, 
      address, 
      sendWelcomeMail, 
      tenant_id,
      password,
      role,
      avatar,
      avatarMetadata,
      isActive,
      lastLogin,
      preferences,
      pushToken,
      linkedClinic
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields (name, phone)' 
      });
    }

    // if (!tenant_id) {
    //   return res.status(400).json({ 
    //     success: false,
    //     message: 'Tenant ID is required' 
    //   });
    // }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');
    const tenantsCollection = db.collection('tenants');

    // Check for existing phone in same tenant
    const existingPhone = await clientsCollection.findOne({ 
      phone, 
      tenant_id,
      isActive: true 
    });
    
    if (existingPhone) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists for this clinic'
      });
    }

    // Check for existing email in same tenant
    if (email) {
      const existingEmail = await clientsCollection.findOne({ 
        email: email.toLowerCase(), 
        tenant_id,
        isActive: true 
      });
      
      if (existingEmail) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: 'Email already exists for this clinic'
        });
      }
    }

    const plainPassword = password || '123456';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const newClient = {
      name,
      phone,
      tenant_id, // **CRITICAL: Include tenant_id**
      first_name: name,              // ✅ duplicate into first_name
      last_name: last_name || '',
      email: email ? email.toLowerCase() : '',
      address: address || '',
      password: hashedPassword,
      role: role || 'owner',
      avatar: avatar || null,
      avatarMetadata: avatarMetadata || null,
      isActive: isActive !== undefined ? isActive : true,
      lastLogin: lastLogin || null,
      preferences: preferences || {
        notifications: { email: true, push: true, sms: false },
        language: 'en',
        timezone: 'UTC'
      },
      pushToken: pushToken || null,
      linkedClinic: linkedClinic || null,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      profile_completed: false
    };

    const result = await clientsCollection.insertOne(newClient);

    if (sendWelcomeMail && email) {
      let tenantName = 'VetVault';
      let welcomeMessage = '';
      let bookingUrl = '';

      try {
        const tenant = await tenantsCollection.findOne({ _id: new ObjectId(tenant_id) });
        if (tenant) {
          tenantName = tenant.name || tenantName;
          welcomeMessage = tenant.welcome_message || '';
          if (tenant.subdomain) {
            bookingUrl = `https://${tenant.subdomain}.vetvault.in`;
          }
        }
      } catch (e) {
        console.warn('Tenant lookup failed:', e);
      }
      
      try {
        await sendWelcomeEmail({ to: email, name: name, tenantName, welcomeMessage, bookingUrl });
      } catch (emailError) {
        console.error('Welcome email failed:', emailError);
        // Don't fail client creation if email fails
      }
    }

    // Get created client without password
    const createdClient = await clientsCollection.findOne(
      { _id: result.insertedId },
      { projection: { password: 0 } }
    );

    await client.close();
    
    res.status(201).json({ 
      success: true, 
      message: 'Client created successfully',
      data: createdClient
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});



export default router; 