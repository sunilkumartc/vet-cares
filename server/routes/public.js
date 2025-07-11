import express from 'express';
import { dbUtils } from '../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Public tenant creation endpoint
router.post('/signup', async (req, res) => {
  try {
    const { 
      clinicName, 
      email, 
      password, 
      ownerName, 
      phone, 
      address,
      plan = 'trial'
    } = req.body;

    // Validate required fields
    if (!clinicName || !email || !password || !ownerName) {
      return res.status(400).json({ 
        error: 'Missing required fields: clinicName, email, password, ownerName' 
      });
    }

    // Check if email already exists
    const existingTenant = await dbUtils.getCollection('tenants').findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { slug: clinicName.toLowerCase().replace(/\s+/g, '-') }
      ]
    });

    if (existingTenant) {
      return res.status(409).json({ 
        error: 'A clinic with this email or name already exists' 
      });
    }

    // Create tenant
    const tenantData = {
      _id: new ObjectId(),
      name: clinicName,
      slug: clinicName.toLowerCase().replace(/\s+/g, '-'),
      email: email.toLowerCase(),
      subdomain: clinicName.toLowerCase().replace(/\s+/g, '-'),
      domain: `${clinicName.toLowerCase().replace(/\s+/g, '-')}.vetvault.in`,
      status: 'active',
      plan: plan,
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      owner: {
        name: ownerName,
        email: email,
        phone: phone
      },
      address: address,
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        language: 'en'
      },
      limits: {
        max_staff: plan === 'trial' ? 3 : plan === 'starter' ? 5 : plan === 'professional' ? 15 : 999,
        max_clients: plan === 'trial' ? 100 : plan === 'starter' ? 500 : plan === 'professional' ? 2000 : 99999,
        max_storage_gb: plan === 'trial' ? 1 : plan === 'starter' ? 5 : plan === 'professional' ? 20 : 100
      },
      created_date: new Date(),
      updated_date: new Date()
    };

    // Insert tenant
    await dbUtils.getCollection('tenants').insertOne(tenantData);

    // Create admin user for the tenant
    const hashedPassword = await bcrypt.hash(password, 12);
    const adminUser = {
      _id: new ObjectId(),
      tenant_id: tenantData._id.toString(),
      username: email.split('@')[0],
      email: email.toLowerCase(),
      password: hashedPassword,
      first_name: ownerName.split(' ')[0],
      last_name: ownerName.split(' ').slice(1).join(' ') || '',
      role: 'admin',
      permissions: ['all'],
      status: 'active',
      phone: phone,
      created_date: new Date(),
      updated_date: new Date()
    };

    await dbUtils.getCollection('staff').insertOne(adminUser);

    // Create default settings for the tenant
    const defaultSettings = {
      _id: new ObjectId(),
      tenant_id: tenantData._id.toString(),
      type: 'clinic_settings',
      data: {
        clinic_name: clinicName,
        address: address,
        phone: phone,
        email: email,
        business_hours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '09:00', close: '14:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true }
        },
        appointment_duration: 30,
        auto_confirm_appointments: true,
        send_reminders: true,
        reminder_hours: 24
      },
      created_date: new Date(),
      updated_date: new Date()
    };

    await dbUtils.getCollection('settings').insertOne(defaultSettings);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Clinic created successfully',
      tenant: {
        id: tenantData._id.toString(),
        name: tenantData.name,
        slug: tenantData.slug,
        subdomain: tenantData.subdomain,
        domain: tenantData.domain,
        plan: tenantData.plan,
        trial_ends_at: tenantData.trial_ends_at
      },
      login_url: `https://${tenantData.subdomain}.vetvault.in/login`
    });

  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ 
      error: 'Failed to create clinic. Please try again.' 
    });
  }
});

// Public clinic lookup endpoint
router.get('/clinic/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const tenant = await dbUtils.getCollection('tenants').findOne({ 
      $or: [
        { slug: slug },
        { subdomain: slug }
      ]
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Return public clinic info
    res.json({
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.plan,
      trial_ends_at: tenant.trial_ends_at,
      login_url: `https://${tenant.subdomain}.vetvault.in/login`
    });

  } catch (error) {
    console.error('Error fetching clinic:', error);
    res.status(500).json({ error: 'Failed to fetch clinic information' });
  }
});

// Public pricing plans endpoint
router.get('/pricing', async (req, res) => {
  try {
    const plans = [
      {
        id: 'trial',
        name: 'Free Trial',
        price: 0,
        period: '14 days',
        description: 'Try VetVault free for 14 days',
        features: [
          'Up to 3 staff members',
          'Up to 100 pets',
          'Basic appointment scheduling',
          'Email support',
          'Mobile app access'
        ],
        limits: {
          max_staff: 3,
          max_clients: 100,
          max_storage_gb: 1
        }
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 29,
        period: 'per month',
        description: 'Perfect for small clinics',
        features: [
          'Up to 5 staff members',
          'Up to 500 pets',
          'Basic appointment scheduling',
          'Email support',
          'Mobile app access',
          'Basic reporting'
        ],
        limits: {
          max_staff: 5,
          max_clients: 500,
          max_storage_gb: 5
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 79,
        period: 'per month',
        description: 'Ideal for growing practices',
        features: [
          'Up to 15 staff members',
          'Up to 2000 pets',
          'Advanced reporting',
          'Priority support',
          'Custom branding',
          'API access',
          'Advanced analytics'
        ],
        limits: {
          max_staff: 15,
          max_clients: 2000,
          max_storage_gb: 20
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 199,
        period: 'per month',
        description: 'For large veterinary groups',
        features: [
          'Unlimited staff',
          'Unlimited pets',
          'Multi-location support',
          '24/7 phone support',
          'Custom integrations',
          'Dedicated account manager',
          'White-label options'
        ],
        limits: {
          max_staff: 999,
          max_clients: 99999,
          max_storage_gb: 100
        }
      }
    ];

    res.json({ plans });

  } catch (error) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({ error: 'Failed to fetch pricing information' });
  }
});

// Public features endpoint
router.get('/features', async (req, res) => {
  try {
    const features = [
      {
        category: 'Practice Management',
        items: [
          'Staff management with role-based permissions',
          'Patient records and medical history',
          'Appointment scheduling and calendar',
          'Billing and invoicing',
          'Inventory management',
          'Reporting and analytics'
        ]
      },
      {
        category: 'Patient Care',
        items: [
          'Comprehensive medical records',
          'Vaccination tracking',
          'Treatment plans',
          'Prescription management',
          'Lab results tracking',
          'Surgery scheduling'
        ]
      },
      {
        category: 'Communication',
        items: [
          'Client portal',
          'Email and SMS notifications',
          'WhatsApp integration',
          'Automated reminders',
          'Client feedback system',
          'Multi-language support'
        ]
      },
      {
        category: 'Security & Compliance',
        items: [
          'HIPAA compliance',
          'Data encryption',
          'Regular backups',
          'Audit trails',
          'Role-based access control',
          'GDPR compliance'
        ]
      }
    ];

    res.json({ features });

  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: 'Failed to fetch features information' });
  }
});

export default router; 