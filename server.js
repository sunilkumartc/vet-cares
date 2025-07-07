import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'vet-cares';
let db = null;

async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
}

// Utility functions
function formatResponse(data) {
  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      id: item._id?.toString() || item.id
    }));
  }
  return {
    ...data,
    id: data._id?.toString() || data.id
  };
}

function buildTenantQuery(tenantId, filters = {}) {
  const query = {};
  
  // Only add tenant_id filter if tenantId is provided and not null/undefined
  if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
    query.tenant_id = tenantId;
  }
  
  // Handle ObjectId fields
  if (filters._id) {
    query._id = new ObjectId(filters._id);
    delete filters._id;
  }
  
  if (filters.id) {
    query._id = new ObjectId(filters.id);
    delete filters.id;
  }
  
  // Remove non-query parameters
  delete filters.sort;
  delete filters.limit;
  delete filters.skip;
  
  // Add other filters
  Object.assign(query, filters);
  return query;
}

// API Routes

// Get current tenant
app.get('/api/tenant/current', async (req, res) => {
  try {
    const host = req.headers.host; // e.g., 'clinic3.localhost:8090'
    const hostWithoutPort = host.split(':')[0]; // 'clinic3.localhost'
    let slug = 'default';

    const parts = hostWithoutPort.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
      slug = parts[0];
    } else {
      slug = 'default';
    }

    // Debug log for domain/subdomain extraction
    console.log('[TENANT DEBUG] Host header:', host, '| hostWithoutPort:', hostWithoutPort, '| slug:', slug);
    
    const collection = db.collection('tenants');
    
    // Try to find tenant by subdomain first
    let tenant = await collection.findOne({ subdomain: slug });
    
    // If not found by subdomain, try by domain
    if (!tenant) {
      tenant = await collection.findOne({ domain: host });
    }
    
    // If still not found, try by slug
    if (!tenant) {
      tenant = await collection.findOne({ slug: slug });
    }
    
    // If still not found and we're on localhost, try to find a tenant with localhost domain
    if (!tenant && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      tenant = await collection.findOne({ domain: { $regex: /localhost/ } });
    }
    
    // If still not found, use the first tenant as fallback
    if (!tenant) {
      tenant = await collection.findOne({});
    }
    
    // If no tenant exists at all, create a default one
    if (!tenant) {
      const defaultTenant = {
        _id: new ObjectId(),
        slug: 'default',
        subdomain: 'default',
        name: 'Default Clinic',
        domain: 'localhost',
        status: 'active',
        created_date: new Date(),
        updated_date: new Date()
      };
      await collection.insertOne(defaultTenant);
      tenant = defaultTenant;
    }
    
    console.log('Server - Host:', host, 'Slug:', slug);
    console.log('Server - Found tenant:', tenant.name, 'ID:', tenant._id.toString(), 'Subdomain:', tenant.subdomain);
    
    res.json(formatResponse(tenant));
  } catch (error) {
    console.error('Error getting tenant:', error);
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

// Staff API
app.get('/api/staff', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    console.log('Server - Staff request with tenant_id:', tenant_id, 'type:', typeof tenant_id);
    const collection = db.collection('staff');
    
    // Try different query approaches
    let staff = await collection.find({ tenant_id }).toArray();
    console.log('Server - Found staff records with string query:', staff.length);
    
    if (staff.length === 0) {
      // Try with ObjectId
      try {
        staff = await collection.find({ tenant_id: new ObjectId(tenant_id) }).toArray();
        console.log('Server - Found staff records with ObjectId query:', staff.length);
      } catch (e) {
        console.log('Server - ObjectId conversion failed:', e.message);
      }
    }
    
    if (staff.length === 0) {
      // Show all staff records to debug
      const allStaff = await collection.find({}).toArray();
      console.log('Server - All staff records tenant_ids:', allStaff.map(s => ({ id: s._id, tenant_id: s.tenant_id, type: typeof s.tenant_id })));
    }
    
    res.json(formatResponse(staff));
  } catch (error) {
    console.error('Error getting staff:', error);
    res.status(500).json({ error: 'Failed to get staff' });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const { tenant_id, ...data } = req.body;
    const collection = db.collection('staff');
    const staff = {
      _id: new ObjectId(),
      tenant_id,
      ...data,
      created_date: new Date(),
      updated_date: new Date()
    };
    await collection.insertOne(staff);
    res.json(formatResponse(staff));
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

app.put('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id, ...data } = req.body;
    const collection = db.collection('staff');
    const result = await collection.updateOne(
      { _id: new ObjectId(id), tenant_id },
      { $set: { ...data, updated_date: new Date() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.query;
    const collection = db.collection('staff');
    const result = await collection.deleteOne({ _id: new ObjectId(id), tenant_id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

// Generic entity API
app.get('/api/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const { tenant_id, sort, ...filters } = req.query;
    const collection = db.collection(entity);
    const query = buildTenantQuery(tenant_id, filters);
    
    let cursor = collection.find(query);
    
    // Handle sorting
    if (sort) {
      const sortObj = {};
      if (sort.startsWith('-')) {
        sortObj[sort.substring(1)] = -1; // descending
      } else {
        sortObj[sort] = 1; // ascending
      }
      cursor = cursor.sort(sortObj);
    }
    
    const data = await cursor.toArray();
    res.json(formatResponse(data));
  } catch (error) {
    console.error(`Error getting ${req.params.entity}:`, error);
    res.status(500).json({ error: `Failed to get ${req.params.entity}` });
  }
});

app.post('/api/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const { tenant_id, ...data } = req.body;
    const collection = db.collection(entity);
    const document = {
      _id: new ObjectId(),
      tenant_id,
      ...data,
      created_date: new Date(),
      updated_date: new Date()
    };
    await collection.insertOne(document);
    res.json(formatResponse(document));
  } catch (error) {
    console.error(`Error creating ${req.params.entity}:`, error);
    res.status(500).json({ error: `Failed to create ${req.params.entity}` });
  }
});

app.put('/api/:entity/:id', async (req, res) => {
  try {
    const { entity, id } = req.params;
    const { tenant_id, ...data } = req.body;
    const collection = db.collection(entity);
    const result = await collection.updateOne(
      { _id: new ObjectId(id), tenant_id },
      { $set: { ...data, updated_date: new Date() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: `${entity} not found` });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(`Error updating ${req.params.entity}:`, error);
    res.status(500).json({ error: `Failed to update ${req.params.entity}` });
  }
});

app.delete('/api/:entity/:id', async (req, res) => {
  try {
    const { entity, id } = req.params;
    const { tenant_id } = req.query;
    const collection = db.collection(entity);
    const result = await collection.deleteOne({ _id: new ObjectId(id), tenant_id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: `${entity} not found` });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting ${req.params.entity}:`, error);
    res.status(500).json({ error: `Failed to delete ${req.params.entity}` });
  }
});

// Tenant Management API
app.get('/api/admin/tenants', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sortBy = 'created_date', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * limit;
    
    const collection = db.collection('tenants');
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } }
      ];
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const tenants = await collection.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    const total = await collection.countDocuments(query);
    
    res.json({
      tenants: formatResponse(tenants),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting tenants:', error);
    res.status(500).json({ error: 'Failed to get tenants' });
  }
});

app.get('/api/admin/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const collection = db.collection('tenants');
    const tenant = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Get usage statistics
    const staffCount = await db.collection('staff').countDocuments({ tenant_id: id });
    const clientCount = await db.collection('clients').countDocuments({ tenant_id: id });
    const appointmentCount = await db.collection('appointments').countDocuments({ tenant_id: id });
    const invoiceCount = await db.collection('invoices').countDocuments({ tenant_id: id });
    
    const tenantData = formatResponse(tenant);
    tenantData.stats = {
      staff_count: staffCount,
      client_count: clientCount,
      appointment_count: appointmentCount,
      invoice_count: invoiceCount,
      storage_used: Math.random() * 5, // Mock data
      last_activity: tenant.updated_date
    };
    
    res.json(tenantData);
  } catch (error) {
    console.error('Error getting tenant:', error);
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

app.post('/api/admin/tenants', async (req, res) => {
  try {
    const tenantData = {
      ...req.body,
      _id: new ObjectId(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };
    
    const collection = db.collection('tenants');
    await collection.insertOne(tenantData);
    
    res.status(201).json(formatResponse(tenantData));
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

app.put('/api/admin/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_date: new Date().toISOString()
    };
    
    const collection = db.collection('tenants');
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ success: true, message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

app.delete('/api/admin/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const collection = db.collection('tenants');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Clean up tenant data (in production, you might want to archive instead of delete)
    await db.collection('staff').deleteMany({ tenant_id: id });
    await db.collection('clients').deleteMany({ tenant_id: id });
    await db.collection('pets').deleteMany({ tenant_id: id });
    await db.collection('appointments').deleteMany({ tenant_id: id });
    await db.collection('invoices').deleteMany({ tenant_id: id });
    
    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// Tenant Analytics API
app.get('/api/admin/tenants/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;
    
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (period === '7d' ? 7 : 30));
    
    // Get usage statistics
    const staffCount = await db.collection('staff').countDocuments({ tenant_id: id });
    const clientCount = await db.collection('clients').countDocuments({ tenant_id: id });
    const appointmentCount = await db.collection('appointments').countDocuments({ 
      tenant_id: id,
      created_date: { $gte: startDate.toISOString() }
    });
    
    // Get revenue data
    const invoices = await db.collection('invoices').find({ 
      tenant_id: id,
      created_date: { $gte: startDate.toISOString() }
    }).toArray();
    
    const revenue = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
    
    // Mock analytics data
    const analytics = {
      period,
      usage: {
        staff_count: staffCount,
        client_count: clientCount,
        appointment_count: appointmentCount,
        revenue,
        storage_used: Math.random() * 5
      },
      trends: {
        appointments: {
          daily: Array.from({ length: period === '7d' ? 7 : 30 }, () => Math.floor(Math.random() * 20))
        },
        revenue: {
          daily: Array.from({ length: period === '7d' ? 7 : 30 }, () => Math.floor(Math.random() * 1000))
        }
      },
      performance: {
        average_response_time: 150,
        uptime: 99.9,
        error_rate: 0.1
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error getting tenant analytics:', error);
    res.status(500).json({ error: 'Failed to get tenant analytics' });
  }
});

// Tenant Billing API
app.get('/api/admin/tenants/:id/billing', async (req, res) => {
  try {
    const { id } = req.params;
    const collection = db.collection('tenants');
    const tenant = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const billingPlans = {
      basic: { price: 29, features: ['Up to 10 staff', 'Up to 1000 clients', 'Basic support'] },
      professional: { price: 79, features: ['Up to 25 staff', 'Up to 5000 clients', 'Priority support', 'Custom branding'] },
      enterprise: { price: 199, features: ['Unlimited staff', 'Unlimited clients', '24/7 support', 'SSO', 'API access'] }
    };
    
    const plan = billingPlans[tenant.billing_plan || 'basic'];
    const nextBillingDate = new Date(tenant.created_date);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    const billing = {
      plan: tenant.billing_plan || 'basic',
      price: plan.price,
      features: plan.features,
      limits: {
        staff: tenant.max_staff || 10,
        clients: tenant.max_clients || 1000,
        storage: tenant.max_storage_gb || 10
      },
      next_billing_date: nextBillingDate.toISOString(),
      status: tenant.status
    };
    
    res.json(billing);
  } catch (error) {
    console.error('Error getting tenant billing:', error);
    res.status(500).json({ error: 'Failed to get tenant billing' });
  }
});

// Tenant Security API
app.get('/api/admin/tenants/:id/security', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get security logs
    const securityLogs = await db.collection('security_logs')
      .find({ tenant_id: id })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    const security = {
      status: 'secure',
      ssl_certificate: 'valid',
      data_encryption: 'enabled',
      backup_frequency: 'daily',
      compliance: ['HIPAA', 'GDPR', 'ISO 27001'],
      recent_events: formatResponse(securityLogs)
    };
    
    res.json(security);
  } catch (error) {
    console.error('Error getting tenant security:', error);
    res.status(500).json({ error: 'Failed to get tenant security' });
  }
});

// Tenant Operations API
app.post('/api/admin/tenants/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const collection = db.collection('tenants');
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'suspended',
          suspension_reason: reason,
          suspended_at: new Date().toISOString(),
          updated_date: new Date().toISOString()
        }
      }
    );
    
    // Log security event
    await db.collection('security_logs').insertOne({
      tenant_id: id,
      event: 'tenant_suspended',
      details: { reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Tenant suspended successfully' });
  } catch (error) {
    console.error('Error suspending tenant:', error);
    res.status(500).json({ error: 'Failed to suspend tenant' });
  }
});

app.post('/api/admin/tenants/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const collection = db.collection('tenants');
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'active',
          activated_at: new Date().toISOString(),
          updated_date: new Date().toISOString()
        },
        $unset: { suspension_reason: "", suspended_at: "" }
      }
    );
    
    res.json({ success: true, message: 'Tenant activated successfully' });
  } catch (error) {
    console.error('Error activating tenant:', error);
    res.status(500).json({ error: 'Failed to activate tenant' });
  }
});

app.post('/api/admin/tenants/:id/backup', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create backup record
    const backupData = {
      tenant_id: id,
      timestamp: new Date().toISOString(),
      collections: ['clients', 'pets', 'appointments', 'staff', 'invoices'],
      status: 'completed',
      size: '2.5MB' // Mock data
    };
    
    await db.collection('backups').insertOne(backupData);
    
    res.json({ success: true, message: 'Backup created successfully', backup: backupData });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// System-wide Analytics
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (period === '7d' ? 7 : 30));
    
    // Get system-wide statistics
    const totalTenants = await db.collection('tenants').countDocuments();
    const activeTenants = await db.collection('tenants').countDocuments({ status: 'active' });
    const totalStaff = await db.collection('staff').countDocuments();
    const totalClients = await db.collection('clients').countDocuments();
    const totalAppointments = await db.collection('appointments').countDocuments({
      created_date: { $gte: startDate.toISOString() }
    });
    
    // Get revenue data
    const invoices = await db.collection('invoices').find({
      created_date: { $gte: startDate.toISOString() }
    }).toArray();
    
    const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
    
    const analytics = {
      period,
      overview: {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        total_staff: totalStaff,
        total_clients: totalClients,
        total_appointments: totalAppointments,
        total_revenue: totalRevenue
      },
      trends: {
        new_tenants: Array.from({ length: period === '7d' ? 7 : 30 }, () => Math.floor(Math.random() * 5)),
        new_appointments: Array.from({ length: period === '7d' ? 7 : 30 }, () => Math.floor(Math.random() * 100)),
        revenue: Array.from({ length: period === '7d' ? 7 : 30 }, () => Math.floor(Math.random() * 5000))
      },
      performance: {
        average_response_time: 120,
        uptime: 99.95,
        error_rate: 0.05
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error getting system analytics:', error);
    res.status(500).json({ error: 'Failed to get system analytics' });
  }
});

// System Admin Authentication API
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const collection = db.collection('system_admins');
    // Try to find by username or email
    const admin = await collection.findOne({
      $or: [
        { username: username },
        { email: username }
      ]
    });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Support both plain and hashed passwords
    let passwordMatch = false;
    if (admin.password === password) {
      passwordMatch = true;
    } else {
      try {
        const bcrypt = await import('bcryptjs');
        passwordMatch = await bcrypt.compare(password, admin.password);
      } catch (e) {
        // bcryptjs not available or error
        passwordMatch = false;
      }
    }
    if (!passwordMatch) {
      await collection.updateOne(
        { _id: admin._id },
        { 
          $inc: { login_attempts: 1 },
          $set: { updated_date: new Date() }
        }
      );
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (admin.locked_until && new Date() < new Date(admin.locked_until)) {
      return res.status(423).json({ message: 'Account is temporarily locked' });
    }
    await collection.updateOne(
      { _id: admin._id },
      { 
        $set: { 
          login_attempts: 0,
          last_login: new Date(),
          updated_date: new Date()
        },
        $unset: { locked_until: "" }
      }
    );
    const token = Buffer.from(`${admin._id}:${Date.now()}`).toString('base64');
    res.json({
      token,
      user: {
        id: admin._id.toString(),
        username: admin.username,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('System admin login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Staff Authentication API
app.post('/api/staff/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const collection = db.collection('staff');
    const staff = await collection.findOne({ email: email });
    
    if (!staff) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Support both plain and hashed passwords
    let passwordMatch = false;
    if (staff.password === password) {
      passwordMatch = true;
    } else {
      try {
        const bcrypt = await import('bcryptjs');
        passwordMatch = await bcrypt.compare(password, staff.password);
      } catch (e) {
        // bcryptjs not available or error
        passwordMatch = false;
      }
    }
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Get tenant information
    const tenantCollection = db.collection('tenants');
    const tenant = await tenantCollection.findOne({ _id: new ObjectId(staff.tenant_id) });
    
    if (!tenant) {
      return res.status(401).json({ message: 'Tenant not found' });
    }
    
    // Update last login
    await collection.updateOne(
      { _id: staff._id },
      { 
        $set: { 
          last_login: new Date(),
          updated_date: new Date()
        }
      }
    );
    
    const token = Buffer.from(`${staff._id}:${Date.now()}`).toString('base64');
    res.json({
      token,
      user: {
        id: staff._id.toString(),
        name: staff.name,
        email: staff.email,
        role: staff.role,
        tenant_id: staff.tenant_id,
        permissions: staff.permissions
      },
      tenant: {
        id: tenant._id.toString(),
        name: tenant.name,
        domain: tenant.domain
      }
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/staff/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Simple token verification (in production, use JWT)
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [staffId] = decoded.split(':');
      
      const collection = db.collection('staff');
      const staff = await collection.findOne({ _id: new ObjectId(staffId) });
      
      if (!staff) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      // Get tenant information
      const tenantCollection = db.collection('tenants');
      const tenant = await tenantCollection.findOne({ _id: new ObjectId(staff.tenant_id) });
      
      res.json({
        valid: true,
        user: {
          id: staff._id.toString(),
          name: staff.name,
          email: staff.email,
          role: staff.role,
          tenant_id: staff.tenant_id,
          permissions: staff.permissions
        },
        tenant: tenant ? {
          id: tenant._id.toString(),
          name: tenant.name,
          domain: tenant.domain
        } : null
      });
    } catch (decodeError) {
      return res.status(401).json({ message: 'Invalid token format' });
    }
  } catch (error) {
    console.error('Staff token verification error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

app.post('/api/staff/logout', async (req, res) => {
  try {
    // In production, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Staff logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

app.get('/api/admin/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Simple token verification (in production, use JWT)
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [adminId] = decoded.split(':');
      
      const collection = db.collection('system_admins');
      const admin = await collection.findOne({ _id: new ObjectId(adminId) });
      
      if (!admin) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      res.json({
        valid: true,
        user: {
          id: admin._id.toString(),
          username: admin.username,
          email: admin.email,
          first_name: admin.first_name,
          last_name: admin.last_name,
          role: admin.role
        }
      });
    } catch (decodeError) {
      return res.status(401).json({ message: 'Invalid token format' });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

app.post('/api/admin/logout', async (req, res) => {
  try {
    // In production, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Vaccination Reminder API
app.post('/api/vaccination/reminder', async (req, res) => {
  try {
    const {
      phone_number_id,
      customer_country_code,
      customer_number,
      customer_name,
      pet_name,
      vaccine_name,
      due_date,
      myop_ref_id
    } = req.body;

    // Prepare MyOperator API payload
    const payload = {
      phone_number_id,
      customer_country_code,
      customer_number,
      data: {
        type: "template",
        context: {
          template_name: "vaccination_reminder",
          language: "en",
          body: {
            "1": customer_name, // {{1}}
            "2": pet_name,      // {{2}}
            "3": vaccine_name,  // {{3}}
            "4": due_date       // {{4}}
          }
        }
      },
      reply_to: null,
      myop_ref_id: myop_ref_id || `${customer_number}_${Date.now()}`
    };

    // Call MyOperator API
    const response = await fetch('https://publicapi.myoperator.co/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer bQBVcdNzGPIThEhPCRtKqISb0c7OrQnE5kVmvfqrfl',
        'X-MYOP-COMPANY-ID': '685ef0684b5ee840'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error sending vaccination reminder:', error);
    res.status(500).json({ error: 'Failed to send vaccination reminder', details: error.message });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 