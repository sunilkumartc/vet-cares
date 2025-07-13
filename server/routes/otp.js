import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import fetch from 'node-fetch';
import { dbUtils } from '../lib/mongodb.js';

const router = express.Router();

// MyOperator configuration
const MYOPERATOR_API_URL = 'https://publicapi.myoperator.co/chat/messages';
const MYOPERATOR_TOKEN = 'bQBVcdNzGPIThEhPCRtKqISb0c7OrQnE5kVmvfqrfl';
const MYOPERATOR_COMPANY_ID = '685ef0684b5ee840';
const PHONE_NUMBER_ID = '697547396774899';

// Helper function to get current tenant from request
const getCurrentTenant = async (req) => {
  try {
    // First try to get subdomain from query parameter (for frontend requests)
    let slug = req.query.subdomain;
    
    // If no subdomain in query, try to extract from Origin header (for Vercel rewrites)
    if (!slug && req.headers.origin) {
      try {
        const originUrl = new URL(req.headers.origin);
        const hostname = originUrl.hostname;
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127' && parts[0] !== 'api') {
          slug = parts[0];
        }
      } catch (e) {
        console.log('[TENANT DEBUG] Failed to parse Origin header:', e.message);
      }
    }
    
    // If still no subdomain, try Referer header
    if (!slug && req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer);
        const hostname = refererUrl.hostname;
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127' && parts[0] !== 'api') {
          slug = parts[0];
        }
      } catch (e) {
        console.log('[TENANT DEBUG] Failed to parse Referer header:', e.message);
      }
    }
    
    // If still no subdomain, fall back to Host header (for direct API calls)
    let host = req.headers.host; // e.g., 'clinic3.localhost:8090'
    if (!slug) {
      const hostWithoutPort = host.split(':')[0]; // 'clinic3.localhost'

      const parts = hostWithoutPort.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127' && parts[0] !== 'api') {
        slug = parts[0];
      } else {
        slug = 'default';
      }
    }

    await dbUtils.connect();
    const tenantsCollection = dbUtils.getCollection('tenants');
    
    // Try to find tenant by subdomain first
    let tenant = await tenantsCollection.findOne({ subdomain: slug });
    
    // If not found by subdomain, try by domain
    if (!tenant) {
      tenant = await tenantsCollection.findOne({ domain: host });
    }
    
    // If still not found, try by slug
    if (!tenant) {
      tenant = await tenantsCollection.findOne({ slug: slug });
    }
    
    // If still not found and we're on localhost, try to find a tenant with localhost domain
    if (!tenant && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      tenant = await tenantsCollection.findOne({ domain: { $regex: /localhost/ } });
    }
    
    // If still not found, use the first tenant as fallback
    if (!tenant) {
      tenant = await tenantsCollection.findOne({});
    }
    
    return tenant;
  } catch (error) {
    console.error('Error getting current tenant:', error);
    return null;
  }
};

// Send OTP via MyOperator
router.post('/send', async (req, res) => {
  try {
    const { phoneNumber, countryCode = '91', otp, myopRefId } = req.body;
    
    if (!phoneNumber || !otp || !myopRefId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Sending OTP via MyOperator:', { phoneNumber, countryCode, otp, myopRefId });

    // Call MyOperator API
    const myoperatorPayload = {
      phone_number_id: PHONE_NUMBER_ID,
      myop_ref_id: myopRefId,
      customer_country_code: countryCode,
      customer_number: phoneNumber,
      data: {
        type: "template",
        context: {
          template_name: "opt",
          body: {
            otp: otp
          },
          buttons: [
            {
              otp: otp,
              index: 0
            }
          ]
        }
      }
    };

    const myoperatorResponse = await fetch(MYOPERATOR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${MYOPERATOR_TOKEN}`,
        'X-MYOP-COMPANY-ID': MYOPERATOR_COMPANY_ID
      },
      body: JSON.stringify(myoperatorPayload)
    });

    if (!myoperatorResponse.ok) {
      const errorData = await myoperatorResponse.text();
      console.error('MyOperator API error:', errorData);
      throw new Error(`MyOperator API failed: ${myoperatorResponse.status}`);
    }

    const myoperatorResult = await myoperatorResponse.json();
    console.log('MyOperator response:', myoperatorResult);

    // Get current tenant
    await dbUtils.connect();
    const tenantsCollection = dbUtils.getCollection('tenants');
    const currentTenant = await getCurrentTenant(req);
    const tenantId = currentTenant ? currentTenant._id.toString() : null;
    
    console.log('OTP Send - Current tenant:', currentTenant ? currentTenant.name : 'null');
    console.log('OTP Send - Tenant ID:', tenantId, 'type:', typeof tenantId);

    // Store OTP in database with expiry
    const otpCollection = dbUtils.getCollection('otp_verifications');
    
    const otpData = {
      phone_number: phoneNumber,
      country_code: countryCode,
      otp: otp,
      myop_ref_id: myopRefId,
      tenant_id: tenantId,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      verified: false,
      attempts: 0
    };

    await otpCollection.insertOne(otpData);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      myopRefId,
      expiresIn: '10 minutes'
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: `Failed to send OTP: ${error.message}` });
  }
});

// Verify OTP
router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber, otp, myopRefId } = req.body;
    
    if (!phoneNumber || !otp || !myopRefId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Verifying OTP:', { phoneNumber, otp, myopRefId });

    // Get OTP from database
    await dbUtils.connect();
    const otpCollection = dbUtils.getCollection('otp_verifications');
    const clientsCollection = dbUtils.getCollection('clients');
    
    const otpRecord = await otpCollection.findOne({
      phone_number: phoneNumber,
      myop_ref_id: myopRefId,
      verified: false
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid OTP or OTP expired' });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expires_at) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Check if too many attempts
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await otpCollection.updateOne(
        { _id: otpRecord._id },
        { $inc: { attempts: 1 } }
      );
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark OTP as verified
    await otpCollection.updateOne(
      { _id: otpRecord._id },
      { $set: { verified: true, verified_at: new Date() } }
    );

    // Debug: Log OTP record tenant_id
    console.log('OTP Record tenant_id:', otpRecord.tenant_id, 'type:', typeof otpRecord.tenant_id);
    
    // Check if client exists with the correct tenant_id
    let client = await clientsCollection.findOne({
      phone: phoneNumber,
      tenant_id: otpRecord.tenant_id
    });

    if (!client) {
      // Check if client exists with any tenant_id (including null)
      client = await clientsCollection.findOne({
        phone: phoneNumber
      });
      
      if (client) {
        // Update existing client with correct tenant_id
        await clientsCollection.updateOne(
          { _id: client._id },
          { $set: { tenant_id: otpRecord.tenant_id, updated_at: new Date() } }
        );
        client.tenant_id = otpRecord.tenant_id;
        console.log('Updated existing client:', client._id, 'with tenant_id:', client.tenant_id);
      } else {
        // Create new client
        client = {
          _id: new ObjectId(),
          tenant_id: otpRecord.tenant_id,
          phone: phoneNumber,
          first_name: '',
          last_name: '',
          email: '',
          address: '',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
          profile_completed: false
        };

        await clientsCollection.insertOne(client);
        console.log('New client created:', client._id, 'with tenant_id:', client.tenant_id);
      }
    }

    // Create session data
    const sessionData = {
      id: client._id.toString(),
      client_id: client._id.toString(),
      tenant_id: client.tenant_id,
      phone: client.phone,
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      full_name: client.first_name && client.last_name ? `${client.first_name} ${client.last_name}` : '',
      email: client.email || '',
      role: 'user',
      authenticated: true,
      login_time: new Date().toISOString(),
      profile_completed: client.profile_completed || false
    };

    res.json({
      success: true,
      message: 'OTP verified successfully',
      client: {
        id: client._id.toString(),
        phone: client.phone,
        profile_completed: client.profile_completed || false
      },
      session: sessionData
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: `Failed to verify OTP: ${error.message}` });
  }
});

// Check if phone number exists
router.get('/check-phone', async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    await dbUtils.connect();
    const clientsCollection = dbUtils.getCollection('clients');
    
    // Get current tenant
    const currentTenant = await getCurrentTenant(req);
    const tenantId = currentTenant ? currentTenant._id.toString() : null;
    
    const client = await clientsCollection.findOne({ 
      phone: phoneNumber,
      tenant_id: tenantId
    });

    res.json({
      exists: !!client,
      profile_completed: client?.profile_completed || false
    });

  } catch (error) {
    console.error('Error checking phone:', error);
    res.status(500).json({ error: `Failed to check phone: ${error.message}` });
  }
});

// Update customer profile
router.post('/update-profile', async (req, res) => {
  try {
    const { clientId, first_name, last_name, email, address } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    await dbUtils.connect();
    const clientsCollection = dbUtils.getCollection('clients');
    
    // Get current tenant
    const currentTenant = await getCurrentTenant(req);
    const tenantId = currentTenant ? currentTenant._id.toString() : null;
    
    const updateData = {
      first_name: first_name || '',
      last_name: last_name || '',
      email: email || '',
      address: address || '',
      profile_completed: true,
      updated_at: new Date()
    };

    const result = await clientsCollection.updateOne(
      { 
        _id: new ObjectId(clientId),
        tenant_id: tenantId
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: `Failed to update profile: ${error.message}` });
  }
});

export default router; 