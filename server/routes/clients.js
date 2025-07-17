import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import fetch from 'node-fetch';

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

// POST /api/clients - create client and optionally send welcome mail
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address, sendWelcomeMail, tenant_id } = req.body;
    if (!first_name || !last_name || !email || !phone || !tenant_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');
    const tenantsCollection = db.collection('tenants');
    const newClient = {
      first_name,
      last_name,
      email,
      phone,
      address: address || '',
      tenant_id,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      profile_completed: false
    };
    const result = await clientsCollection.insertOne(newClient);
    if (sendWelcomeMail) {
      // Fetch tenant info for custom welcome message
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
      } catch (e) { /* fallback to defaults */ }
      await sendWelcomeEmail({ to: email, name: first_name, tenantName, welcomeMessage, bookingUrl });
    }
    await client.close();
    res.json({ success: true, client_id: result.insertedId });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 