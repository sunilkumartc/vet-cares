import express from 'express';
import { dbUtils } from '../lib/mongodb.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Get current tenant - this must come before /:id route
router.get('/current', async (req, res) => {
  try {
    // First try to get subdomain from query parameter (for frontend requests)
    let slug = req.query.subdomain;
    
    // If no subdomain in query, fall back to Host header (for direct API calls)
    if (!slug) {
      const host = req.headers.host; // e.g., 'clinic3.localhost:8090'
      const hostWithoutPort = host.split(':')[0]; // 'clinic3.localhost'

      const parts = hostWithoutPort.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
        slug = parts[0];
      } else {
        slug = 'default';
      }
    }

    // Debug log for domain/subdomain extraction
    console.log('[TENANT DEBUG] Query subdomain:', req.query.subdomain, '| Host header:', req.headers.host, '| Final slug:', slug);
    
    const collection = dbUtils.getCollection('tenants');
    
    // Try to find tenant by subdomain first
    let tenant = await collection.findOne({ subdomain: slug });
    console.log('[TENANT DEBUG] Found by subdomain:', tenant ? tenant.name : 'not found');
    
    // If not found by subdomain, try by domain
    if (!tenant) {
      tenant = await collection.findOne({ domain: host });
      console.log('[TENANT DEBUG] Found by domain:', tenant ? tenant.name : 'not found');
    }
    
    // If still not found, try by slug
    if (!tenant) {
      tenant = await collection.findOne({ slug: slug });
      console.log('[TENANT DEBUG] Found by slug:', tenant ? tenant.name : 'not found');
    }
    
    // If still not found and we're on localhost, try to find a tenant with localhost domain
    if (!tenant && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      tenant = await collection.findOne({ domain: { $regex: /localhost/ } });
      console.log('[TENANT DEBUG] Found by localhost regex:', tenant ? tenant.name : 'not found');
    }
    
    // If still not found, use the first tenant as fallback
    if (!tenant) {
      tenant = await collection.findOne({});
      console.log('[TENANT DEBUG] Found first tenant:', tenant ? tenant.name : 'not found');
    }
    
    // If no tenant exists at all, create a default one
    if (!tenant) {
      const defaultTenant = {
        _id: await dbUtils.generateId(),
        slug: 'default',
        subdomain: 'default',
        name: 'Default Clinic',
        domain: 'localhost',
        status: 'active',
        ...dbUtils.addTimestamps({})
      };
      await collection.insertOne(defaultTenant);
      tenant = defaultTenant;
      console.log('[TENANT DEBUG] Created default tenant');
    }
    
    console.log('Server - Host:', host, 'Slug:', slug);
    console.log('Server - Found tenant:', tenant.name, 'ID:', tenant._id.toString(), 'Subdomain:', tenant.subdomain);
    
    res.json(dbUtils.formatResponse(tenant));
  } catch (error) {
    console.error('Error getting tenant:', error);
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

// Get all tenants
router.get('/', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('tenants');
    const tenants = await collection.find({}).toArray();
    res.json(dbUtils.formatResponse(tenants));
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get tenant by ID
router.get('/:id', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('tenants');
    
    const objectId = await dbUtils.toObjectId(req.params.id);
    let tenant;
    
    if (objectId) {
      // Try to find by ObjectId first
      tenant = await collection.findOne({ _id: objectId });
    }
    
    if (!tenant) {
      // If not found by ObjectId, try to find by slug or other string identifiers
      tenant = await collection.findOne({
        $or: [
          { slug: req.params.id },
          { subdomain: req.params.id },
          { name: req.params.id }
        ]
      });
    }
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(dbUtils.formatResponse(tenant));
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// Get tenant usage statistics
router.get('/:id/usage', async (req, res) => {
  try {
    await dbUtils.connect();
    const tenantId = req.params.id;
    
    // Get counts from different collections
    const staffCount = await dbUtils.getCollection('staff').countDocuments({ tenant_id: tenantId });
    const clientCount = await dbUtils.getCollection('clients').countDocuments({ tenant_id: tenantId });
    const appointmentCount = await dbUtils.getCollection('appointments').countDocuments({ tenant_id: tenantId });
    
    // Calculate storage usage (simplified - in production you'd track actual file sizes)
    const storageUsed = Math.random() * 5; // Mock data
    
    res.json({
      staff_count: staffCount,
      client_count: clientCount,
      appointment_count: appointmentCount,
      storage_used: storageUsed,
      last_activity: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching tenant usage:', error);
    res.status(500).json({ error: 'Failed to fetch tenant usage' });
  }
});

// Create new tenant
router.post('/', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('tenants');
    
    const tenantData = {
      _id: await dbUtils.generateId(),
      ...dbUtils.addTimestamps(req.body)
    };
    
    await collection.insertOne(tenantData);
    res.status(201).json(dbUtils.formatResponse(tenantData));
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Update tenant
router.put('/:id', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('tenants');
    
    const objectId = await dbUtils.toObjectId(req.params.id);
    let query;
    
    if (objectId) {
      query = { _id: objectId };
    } else {
      // If not a valid ObjectId, try to find by slug or other identifiers
      query = {
        $or: [
          { slug: req.params.id },
          { subdomain: req.params.id },
          { name: req.params.id }
        ]
      };
    }
    
    const updateData = dbUtils.addTimestamps(req.body, true);
    const result = await collection.updateOne(query, { $set: updateData });
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const updatedTenant = await collection.findOne(query);
    res.json(dbUtils.formatResponse(updatedTenant));
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// Delete tenant
router.delete('/:id', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('tenants');
    
    const objectId = await dbUtils.toObjectId(req.params.id);
    let query;
    
    if (objectId) {
      query = { _id: objectId };
    } else {
      // If not a valid ObjectId, try to find by slug or other identifiers
      query = {
        $or: [
          { slug: req.params.id },
          { subdomain: req.params.id },
          { name: req.params.id }
        ]
      };
    }
    
    const result = await collection.deleteOne(query);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// Suspend tenant
router.post('/:id/suspend', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('tenants');
    
    const objectId = await dbUtils.toObjectId(req.params.id);
    let query;
    
    if (objectId) {
      query = { _id: objectId };
    } else {
      // If not a valid ObjectId, try to find by slug or other identifiers
      query = {
        $or: [
          { slug: req.params.id },
          { subdomain: req.params.id },
          { name: req.params.id }
        ]
      };
    }
    
    await collection.updateOne(query, { 
      $set: { 
        status: 'suspended',
        suspension_reason: req.body.reason,
        suspended_at: new Date().toISOString(),
        updated_date: new Date().toISOString()
      }
    });

    // Log the suspension
    await dbUtils.getCollection('security_logs').insertOne({
      tenant_id: req.params.id,
      event: 'tenant_suspended',
      details: { reason: req.body.reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error suspending tenant:', error);
    res.status(500).json({ error: 'Failed to suspend tenant' });
  }
});

// Activate tenant
router.post('/:id/activate', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('tenants');
    
    const objectId = await dbUtils.toObjectId(req.params.id);
    let query;
    
    if (objectId) {
      query = { _id: objectId };
    } else {
      // If not a valid ObjectId, try to find by slug or other identifiers
      query = {
        $or: [
          { slug: req.params.id },
          { subdomain: req.params.id },
          { name: req.params.id }
        ]
      };
    }
    
    await collection.updateOne(query, { 
      $set: { 
        status: 'active',
        activated_at: new Date().toISOString(),
        updated_date: new Date().toISOString()
      },
      $unset: { suspension_reason: "", suspended_at: "" }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error activating tenant:', error);
    res.status(500).json({ error: 'Failed to activate tenant' });
  }
});

// Update tenant limits
router.put('/:id/limits', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('tenants');
    
    const objectId = await dbUtils.toObjectId(req.params.id);
    let query;
    
    if (objectId) {
      query = { _id: objectId };
    } else {
      // If not a valid ObjectId, try to find by slug or other identifiers
      query = {
        $or: [
          { slug: req.params.id },
          { subdomain: req.params.id },
          { name: req.params.id }
        ]
      };
    }
    
    await collection.updateOne(query, { 
      $set: { 
        ...req.body,
        updated_date: new Date().toISOString()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating tenant limits:', error);
    res.status(500).json({ error: 'Failed to update tenant limits' });
  }
});

// Create tenant backup
router.post('/:id/backup', async (req, res) => {
  try {
    await dbUtils.connect();
    
    // In production, you'd implement actual backup logic
    const backupData = {
      tenant_id: req.params.id,
      timestamp: new Date().toISOString(),
      collections: ['clients', 'pets', 'appointments', 'staff', 'invoices'],
      status: 'completed',
      size: '2.5MB' // Mock data
    };

    const collection = dbUtils.getCollection('backups');
    await collection.insertOne(backupData);

    res.json(dbUtils.formatResponse(backupData));
  } catch (error) {
    console.error('Error creating tenant backup:', error);
    res.status(500).json({ error: 'Failed to create tenant backup' });
  }
});

// Get tenant backups
router.get('/:id/backups', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('backups');
    const backups = await collection.find({ tenant_id: req.params.id }).sort({ timestamp: -1 }).toArray();
    res.json(dbUtils.formatResponse(backups));
  } catch (error) {
    console.error('Error fetching tenant backups:', error);
    res.status(500).json({ error: 'Failed to fetch tenant backups' });
  }
});

// Log security event
router.post('/:id/security-log', async (req, res) => {
  try {
    await dbUtils.connect();
    const collection = dbUtils.getCollection('security_logs');
    
    await collection.insertOne({
      tenant_id: req.params.id,
      event: req.body.event,
      details: req.body.details,
      ip_address: req.body.ip || req.ip,
      user_agent: req.body.userAgent || req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging security event:', error);
    res.status(500).json({ error: 'Failed to log security event' });
  }
});

export default router; 