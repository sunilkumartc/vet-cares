import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import cron from 'node-cron';
import multer from 'multer';
import { 
  initializeElasticsearch, 
  searchSOAPSuggestions, 
  getCompletionSuggestions,
  bulkIndexSOAPNotes,
  getIndexStats,
  indexSOAPField
} from './src/api/elasticsearch.js';
import AWS from 'aws-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

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

async function initializeServices() {
  try {
    // Initialize Elasticsearch
    await initializeElasticsearch();
    console.log('✅ Elasticsearch initialized');
  } catch (error) {
    console.error('❌ Elasticsearch initialization failed:', error);
    console.log('⚠️  Continuing without Elasticsearch - using fallback suggestions');
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

app.get('/api/:entity/:id', async (req, res) => {
  try {
    const { entity, id } = req.params;
    const { tenant_id } = req.query;
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      return res.status(404).json({ error: `${entity} not found` });
    }
    const query = { _id: objectId };
    if (tenant_id && tenant_id !== 'null' && tenant_id !== 'undefined') query.tenant_id = tenant_id;
    const result = await db.collection(entity).findOne(query);
    if (!result) return res.status(404).json({ error: `${entity} not found` });
    res.json(formatResponse(result));
  } catch (error) {
    res.status(500).json({ error: `Failed to get ${req.params.entity}` });
  }
});

// Create a separate multer instance for S3 uploads that allows both PDF and text files
const s3Upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF and text files for testing
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and text files are allowed'), false);
    }
  }
});

// AWS S3 Upload endpoint - must be before catch-all route
app.post('/api/upload-to-s3', s3Upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // AWS S3 Configuration
    const AWS_S3_ACCESS_KEY_ID = process.env.AWS_S3_ACCESS_KEY_ID;
    const AWS_S3_SECRET_ACCESS_KEY = process.env.AWS_S3_SECRET_ACCESS_KEY;
    const AWS_S3_REGION = process.env.AWS_S3_REGION || 'eu-north-1';
    const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'vetinvoice';

    console.log('AWS S3 Config:', {
      region: AWS_S3_REGION,
      bucket: AWS_S3_BUCKET,
      hasAccessKey: !!AWS_S3_ACCESS_KEY_ID,
      hasSecretKey: !!AWS_S3_SECRET_ACCESS_KEY,
      fileSize: req.file.size,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      customFileName: req.body.fileName,
      bodyKeys: Object.keys(req.body)
    });

    const s3 = new AWS.S3({
      accessKeyId: AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
      region: AWS_S3_REGION
    });

    // Use custom fileName from request body, fallback to original name
    const customFileName = req.body.fileName || req.file.originalname;
    const s3Key = customFileName.startsWith('invoice/') ? customFileName : `invoice/${customFileName}`;
    
    const params = {
      Bucket: AWS_S3_BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    };

    console.log('Uploading to S3 with params:', {
      bucket: params.Bucket,
      key: params.Key,
      contentType: params.ContentType,
      acl: params.ACL,
      bodySize: req.file.buffer.length
    });

    // Upload to S3 with detailed error handling
    const uploadResult = await s3.upload(params).promise();
    
    console.log('S3 upload successful:', uploadResult);

    // Generate public URL
    const publicUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${s3Key}`;
    
    res.json({ 
      success: true, 
      url: publicUrl,
      fileName: customFileName,
      bucket: AWS_S3_BUCKET,
      isPublic: true,
      acl: 'public-read',
      size: req.file.size
    });

  } catch (error) {
    console.error('Error uploading to S3:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload file to S3';
    if (error.code === 'NoSuchBucket') {
      errorMessage = 'S3 bucket does not exist';
    } else if (error.code === 'AccessDenied') {
      errorMessage = 'Access denied to S3 bucket - check credentials and permissions';
    } else if (error.code === 'InvalidAccessKeyId') {
      errorMessage = 'Invalid AWS access key ID';
    } else if (error.code === 'SignatureDoesNotMatch') {
      errorMessage = 'Invalid AWS secret access key';
    } else if (error.code === 'NetworkingError') {
      errorMessage = 'Network error connecting to AWS S3';
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: error.message,
      code: error.code
    });
  }
});

// Test S3 connectivity endpoint - must be before catch-all route
app.post('/api/test-s3', async (req, res) => {
  try {
    // AWS S3 Configuration
    const AWS_S3_ACCESS_KEY_ID = process.env.AWS_S3_ACCESS_KEY_ID;
    const AWS_S3_SECRET_ACCESS_KEY = process.env.AWS_S3_SECRET_ACCESS_KEY;
    const AWS_S3_REGION = process.env.AWS_S3_REGION || 'eu-north-1';
    const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'vetinvoice';

    const s3 = new AWS.S3({
      accessKeyId: AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
      region: AWS_S3_REGION
    });

    // Test 1: Check if bucket exists
    console.log('Testing S3 connectivity...');
    
    try {
      await s3.headBucket({ Bucket: AWS_S3_BUCKET }).promise();
      console.log('✅ Bucket exists and is accessible');
    } catch (bucketError) {
      console.error('❌ Bucket access failed:', bucketError.message);
      return res.status(500).json({
        success: false,
        error: 'Cannot access S3 bucket',
        details: bucketError.message,
        code: bucketError.code
      });
    }

    // Test 2: Upload a test file
    const testContent = `Test upload at ${new Date().toISOString()}`;
    const testKey = `test/test-${Date.now()}.txt`;
    
    const uploadParams = {
      Bucket: AWS_S3_BUCKET,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
      ACL: 'public-read'
    };

    console.log('Uploading test file...');
    const uploadResult = await s3.upload(uploadParams).promise();
    
    const testUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${testKey}`;
    
    console.log('✅ Test upload successful:', testUrl);

    res.json({
      success: true,
      message: 'S3 connectivity test passed',
      testUrl: testUrl,
      uploadResult: uploadResult,
      config: {
        region: AWS_S3_REGION,
        bucket: AWS_S3_BUCKET,
        hasCredentials: true
      }
    });

  } catch (error) {
    console.error('S3 connectivity test failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'S3 connectivity test failed',
      details: error.message,
      code: error.code
    });
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



// WhatsApp send invoice endpoint - REMOVED (duplicate endpoint)
// The real WhatsApp API endpoint is at line 1754



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

// SOAP Autocomplete API endpoint
app.post('/api/soap/autocomplete', async (req, res) => {
  try {
    const { field, currentText, patient } = req.body;
    
    // Validate required fields
    if (!field || !currentText) {
      return res.status(400).json({
        success: false,
        error: 'Field and currentText are required'
      });
    }

    // Get patient details for context
    let patientData = null;
    if (patient && patient.id) {
      try {
        const pet = await db.collection("pets").findOne({ _id: new ObjectId(patient.id) });
        if (pet) {
          patientData = {
            id: pet._id.toString(),
            species: pet.species,
            breed: pet.breed,
            age: pet.age,
            sex: pet.sex,
            name: pet.name
          };
        }
      } catch (error) {
        console.warn('Could not fetch patient details:', error.message);
      }
    }

    let suggestion = "";
    let source = "fallback";

    try {
      // Try Elasticsearch first
      const elasticsearchSuggestions = await searchSOAPSuggestions(currentText, field, patientData, 3);
      
      if (elasticsearchSuggestions.length > 0) {
        // Use the best match from Elasticsearch
        suggestion = elasticsearchSuggestions[0].text;
        source = "elasticsearch";
        console.log(`✅ Elasticsearch suggestion for ${field}:`, suggestion);
      } else {
        // Fallback to rule-based suggestions
        const patientContext = patientData ? `${patientData.species} ${patientData.breed}, ${patientData.age || 'unknown age'}, ${patientData.sex || 'unknown sex'}` : "";
        suggestion = await generateSOAPSuggestion(field, currentText, patientContext);
        source = "fallback";
        console.log(`⚠️  Using fallback suggestion for ${field}:`, suggestion);
      }
    } catch (elasticsearchError) {
      console.warn('Elasticsearch search failed, using fallback:', elasticsearchError.message);
      
      // Fallback to rule-based suggestions
      const patientContext = patientData ? `${patientData.species} ${patientData.breed}, ${patientData.age || 'unknown age'}, ${patientData.sex || 'unknown sex'}` : "";
      suggestion = await generateSOAPSuggestion(field, currentText, patientContext);
      source = "fallback";
    }
    
    res.json({
      success: true,
      suggestion,
      source,
      patient: patientData
    });
  } catch (error) {
    console.error('Error generating SOAP autocomplete:', error);
    res.status(500).json({
      success: false,
      error: `Failed to generate suggestion: ${error.message}`
    });
  }
});

// AI SOAP Suggestion Generator
async function generateSOAPSuggestion(field, currentText, patientContext) {
  // Veterinary knowledge base for different SOAP fields
  const knowledgeBase = {
    subjective: {
      patterns: [
        "Owner reports {symptom} for {duration}",
        "Client noticed {symptom} {timeframe}",
        "Patient presents with {symptom}",
        "History of {condition}",
        "Previous treatment: {treatment}"
      ],
      symptoms: [
        "head shaking", "ear scratching", "lethargy", "decreased appetite", 
        "vomiting", "diarrhea", "coughing", "sneezing", "limping", 
        "excessive thirst", "frequent urination", "weight loss", "hair loss",
        "skin lesions", "behavioral changes", "difficulty breathing"
      ],
      timeframes: [
        "for the past 3 days", "for 1 week", "for 2 weeks", "since yesterday",
        "for several days", "for the past month", "recently"
      ]
    },
    objective: {
      patterns: [
        "{finding} present", "{finding} observed", "{finding} noted",
        "Temperature: {temp}°F", "Heart rate: {hr} bpm", "Respiratory rate: {rr} rpm",
        "Weight: {weight} kg", "CRT: {crt} seconds", "BP: {bp} mmHg"
      ],
      findings: [
        "ear canal erythema", "aural discharge", "otitis externa", "pyoderma",
        "alopecia", "pruritus", "erythema", "edema", "pain on palpation",
        "dehydration", "mucous membrane color", "lymph node enlargement",
        "abdominal distension", "joint swelling", "lameness"
      ],
      vitals: {
        temp: ["101.5", "102.1", "103.2", "104.0", "100.8"],
        hr: ["120", "140", "160", "180", "100"],
        rr: ["20", "25", "30", "35", "15"],
        weight: ["5.2", "12.5", "25.0", "35.8", "8.3"],
        crt: ["1.5", "2.0", "2.5", "3.0", "1.0"],
        bp: ["120/80", "140/90", "160/100", "110/70", "130/85"]
      }
    },
    assessment: {
      patterns: [
        "Probable {diagnosis}",
        "Differential diagnoses: {differentials}",
        "Rule out: {ruleOut}",
        "Primary diagnosis: {diagnosis}",
        "Secondary: {secondary}"
      ],
      diagnoses: [
        "otitis externa - bacterial", "otitis externa - yeast", "otitis media",
        "pyoderma", "dermatitis", "allergic skin disease", "parasitic infestation",
        "gastroenteritis", "pancreatitis", "hepatitis", "renal disease",
        "cardiac disease", "respiratory infection", "orthopedic injury"
      ],
      differentials: [
        "bacterial vs yeast infection", "allergic vs parasitic", "viral vs bacterial",
        "primary vs secondary disease", "acute vs chronic condition"
      ]
    },
    plan: {
      patterns: [
        "{test} today", "Start {medication} {frequency} for {duration}",
        "Recheck in {timeframe}", "Follow up in {timeframe}",
        "Continue {treatment} as prescribed", "Discontinue {medication}"
      ],
      tests: [
        "Cytology", "Culture and sensitivity", "Blood work", "Radiographs",
        "Ultrasound", "Skin scraping", "Ear cytology", "Fecal examination"
      ],
      medications: [
        "OticClean BID", "Enrofloxacin drops", "Prednisolone", "Amoxicillin",
        "Metronidazole", "Fenbendazole", "Ivermectin", "Cephalexin"
      ],
      frequencies: ["BID", "TID", "QID", "once daily", "twice daily"],
      durations: ["7 days", "10 days", "14 days", "21 days", "30 days"],
      timeframes: ["3 days", "1 week", "2 weeks", "1 month", "3 months"]
    }
  };

  // Get field-specific knowledge
  const fieldKnowledge = knowledgeBase[field];
  if (!fieldKnowledge) {
    return "";
  }

  // Analyze current text to understand context
  const words = currentText.toLowerCase().split(/\s+/);
  const lastWord = words[words.length - 1] || "";
  
  // Generate contextual suggestion
  let suggestion = "";
  
  if (field === 'subjective') {
    if (words.length < 3) {
      // Start with a basic pattern
      const pattern = fieldKnowledge.patterns[Math.floor(Math.random() * fieldKnowledge.patterns.length)];
      const symptom = fieldKnowledge.symptoms[Math.floor(Math.random() * fieldKnowledge.symptoms.length)];
      const timeframe = fieldKnowledge.timeframes[Math.floor(Math.random() * fieldKnowledge.timeframes.length)];
      
      suggestion = pattern
        .replace('{symptom}', symptom)
        .replace('{duration}', timeframe)
        .replace('{timeframe}', timeframe);
    } else if (lastWord.includes('ear') || lastWord.includes('scratch')) {
      suggestion = "head shaking and scratching for 3 days";
    } else if (lastWord.includes('vomit') || lastWord.includes('throw')) {
      suggestion = "decreased appetite and lethargy";
    }
  } else if (field === 'objective') {
    if (words.length < 2) {
      const finding = fieldKnowledge.findings[Math.floor(Math.random() * fieldKnowledge.findings.length)];
      suggestion = `${finding} present`;
    } else if (lastWord.includes('ear') || lastWord.includes('canal')) {
      suggestion = "erythematous; aural discharge present; temp 102.1°F";
    } else if (lastWord.includes('temp') || lastWord.includes('temperature')) {
      const temp = fieldKnowledge.vitals.temp[Math.floor(Math.random() * fieldKnowledge.vitals.temp.length)];
      suggestion = `${temp}°F`;
    }
  } else if (field === 'assessment') {
    if (words.length < 2) {
      const diagnosis = fieldKnowledge.diagnoses[Math.floor(Math.random() * fieldKnowledge.diagnoses.length)];
      suggestion = `Probable ${diagnosis}`;
    } else if (lastWord.includes('otitis') || lastWord.includes('ear')) {
      suggestion = "otitis externa – bacterial, r/o yeast";
    } else if (lastWord.includes('skin') || lastWord.includes('dermat')) {
      suggestion = "allergic skin disease, r/o parasitic infestation";
    }
  } else if (field === 'plan') {
    if (words.length < 2) {
      const test = fieldKnowledge.tests[Math.floor(Math.random() * fieldKnowledge.tests.length)];
      const medication = fieldKnowledge.medications[Math.floor(Math.random() * fieldKnowledge.medications.length)];
      const frequency = fieldKnowledge.frequencies[Math.floor(Math.random() * fieldKnowledge.frequencies.length)];
      const duration = fieldKnowledge.durations[Math.floor(Math.random() * fieldKnowledge.durations.length)];
      
      suggestion = `${test} today; start ${medication} ${frequency} for ${duration}`;
    } else if (lastWord.includes('cytology') || lastWord.includes('test')) {
      suggestion = "start OticClean BID + Enrofloxacin drops 10d; recheck in 14d";
    } else if (lastWord.includes('medication') || lastWord.includes('treatment')) {
      suggestion = "recheck in 14 days";
    }
  }

  // Add patient context if available
  if (patientContext && suggestion) {
    suggestion = `${patientContext}: ${suggestion}`;
  }

  return suggestion;
}

// WhatsApp Invoice API endpoint (backend proxy to avoid CORS)
app.post('/api/whatsapp/send-invoice', async (req, res) => {
  try {
    const { phone, customer_name, amount, pdf_url, invoice_id, medical_record_id, pet_name, record_type, tenant_id } = req.body;
    
    console.log('WhatsApp send invoice request:', {
      phone,
      customer_name,
      amount,
      pdf_url,
      invoice_id,
      medical_record_id,
      pet_name,
      record_type,
      tenant_id
    });
    
    // Validate required fields
    if (!phone || !customer_name) {
      return res.status(400).json({ error: 'Phone and customer name are required' });
    }
    
    // WhatsApp API configuration
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://publicapi.myoperator.co/chat/messages';
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'bQBVcdNzGPIThEhPCRtKqISb0c7OrQnE5kVmvfqrfl';
    const COMPANY_ID = process.env.WHATSAPP_COMPANY_ID || '685ef0684b5ee840';
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '697547396774899';
    
    // Extract phone number (remove country code if present)
    let phoneNumber = phone;
    if (phoneNumber.startsWith('+91')) {
      phoneNumber = phoneNumber.substring(3);
    } else if (phoneNumber.startsWith('91')) {
      phoneNumber = phoneNumber.substring(2);
    }
    
    // Get tenant details if tenant_id is provided
    let tenantDetails = {
      clinicName: "VetVault",
      contactPhone: "+91 1234567890"
    };
    
    if (tenant_id) {
      try {
        const tenant = await db.collection("tenants").findOne({ 
          _id: new ObjectId(tenant_id) 
        });
        if (tenant) {
          tenantDetails = {
            clinicName: tenant.name || tenant.clinic_name || "VetVault",
            contactPhone: tenant.phone || tenant.contact_phone || "+91 1234567890"
          };
          console.log('Found tenant details for invoice:', tenantDetails.clinicName);
        }
      } catch (tenantError) {
        console.warn('Could not fetch tenant for invoice:', tenantError.message);
      }
    }
    
    // Determine message type and prepare payload
    let payload;
    let messageType = 'invoice';
    
    if (invoice_id) {
      // Invoice message using template
      payload = {
        phone_number_id: PHONE_NUMBER_ID,
        customer_country_code: "91",
        customer_number: phoneNumber,
        data: {
          type: "template",
          context: {
            template_name: "send_bill",
            language: "en",
            body: {
              customername: customer_name || "Customer",
              amt: amount?.toString() || "0",
              invoicelink: pdf_url || "", // This will be the short URL
              clinicname: tenantDetails.clinicName,
              clinicphone: tenantDetails.contactPhone
            }
          }
        },
        reply_to: null,
        myop_ref_id: `invoice_${invoice_id}_${Date.now()}`
      };
      messageType = 'invoice';
    } else if (medical_record_id) {
      // Medical record message using custom text
      const messageContent = `Dear ${customer_name},

Your pet ${pet_name || 'pet'}'s medical record is ready.

📋 Medical Record: ${pdf_url || 'Not available'}
📅 Record Type: ${record_type || 'General Checkup'}

For any queries, please contact us at ${tenantDetails.contactPhone}.

Thank you for choosing ${tenantDetails.clinicName}! 🐾`;
      
      payload = {
        phone_number_id: PHONE_NUMBER_ID,
        customer_country_code: "91",
        customer_number: phoneNumber,
        data: {
          type: "text",
          text: {
            body: messageContent
          }
        },
        reply_to: null,
        myop_ref_id: `medical_${medical_record_id}_${Date.now()}`
      };
      messageType = 'medical_record';
    } else {
      // Generic document message
      const messageContent = `Dear ${customer_name},

Please find your document attached: ${pdf_url || 'Not available'}

For any queries, please contact us at ${tenantDetails.contactPhone}.

Thank you for choosing ${tenantDetails.clinicName}! 🐾`;
      
      payload = {
        phone_number_id: PHONE_NUMBER_ID,
        customer_country_code: "91",
        customer_number: phoneNumber,
        data: {
          type: "text",
          text: {
            body: messageContent
          }
        },
        reply_to: null,
        myop_ref_id: `document_${Date.now()}_${Date.now()}`
      };
      messageType = 'document';
    }
    
    console.log('WhatsApp API payload:', payload);
    
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'X-MYOP-COMPANY-ID': COMPANY_ID
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${result.message || response.statusText}`);
    }
    
    console.log('WhatsApp API response:', result);
    
    // Store the message in database for tracking
    const messageRecord = {
      _id: new ObjectId(),
      message_id: result.message_id || result.id || `wa-msg-${Date.now()}`,
      phone: phone,
      customer_name,
      message_type: messageType,
      pdf_url,
      invoice_id,
      medical_record_id,
      pet_name,
      record_type,
      tenant_id,
      status: 'sent',
      sent_date: new Date(),
      created_date: new Date(),
      api_response: result
    };
    
    // Insert into messages collection for tracking
    await db.collection('whatsapp_messages').insertOne(messageRecord);
    
    res.json({
      success: true,
      messageId: result.message_id || result.id || `wa-msg-${Date.now()}`,
      message: 'WhatsApp message sent successfully',
      phone: phone,
      messageType,
      apiResponse: result,
      details: {
        customer_name,
        amount,
        pdf_url,
        invoice_id,
        medical_record_id,
        pet_name,
        record_type,
        tenant_id
      }
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({
      success: false,
      error: `Failed to send WhatsApp message: ${error.message}`
    });
  }
});

// SOAP Note Indexing API endpoints
app.post('/api/soap/index', async (req, res) => {
  try {
    const { medicalRecord } = req.body;
    
    if (!medicalRecord || !medicalRecord.pet_id) {
      return res.status(400).json({
        success: false,
        error: 'Medical record with pet_id is required'
      });
    }

    // Get pet details
    const pet = await db.collection("pets").findOne({ _id: new ObjectId(medicalRecord.pet_id) });
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Pet not found'
      });
    }

    // Index each SOAP field
    const fields = ['subjective', 'objective', 'assessment', 'plan'];
    const indexedFields = [];

    for (const field of fields) {
      if (medicalRecord[field] && medicalRecord[field].trim()) {
        try {
          await indexSOAPField({
            field,
            text: medicalRecord[field],
            pet: {
              id: pet._id.toString(),
              species: pet.species,
              breed: pet.breed,
              age: pet.age,
              sex: pet.sex,
              name: pet.name
            },
            tenant_id: medicalRecord.tenant_id
          });
          indexedFields.push(field);
        } catch (error) {
          console.error(`Error indexing ${field} field:`, error);
        }
      }
    }

    res.json({
      success: true,
      message: `Indexed ${indexedFields.length} SOAP fields`,
      indexedFields
    });
  } catch (error) {
    console.error('Error indexing SOAP note:', error);
    res.status(500).json({
      success: false,
      error: `Failed to index SOAP note: ${error.message}`
    });
  }
});

// Bulk index all SOAP notes from MongoDB
app.post('/api/soap/bulk-index', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    
    // Get all medical records from MongoDB
    const collection = db.collection('medical_records');
    const query = tenant_id ? { tenant_id } : {};
    
    const medicalRecords = await collection.find(query).toArray();
    
    if (medicalRecords.length === 0) {
      return res.json({
        success: true,
        message: 'No medical records found to index',
        indexedCount: 0
      });
    }

    // Get pet details for each record
    const recordsWithPets = [];
    for (const record of medicalRecords) {
      if (record.pet_id) {
        const pet = await db.collection("pets").findOne({ _id: new ObjectId(record.pet_id) });
        if (pet) {
          recordsWithPets.push({
            ...record,
            pet: {
              id: pet._id.toString(),
              species: pet.species,
              breed: pet.breed,
              age: pet.age,
              sex: pet.sex,
              name: pet.name
            }
          });
        }
      }
    }

    // Bulk index all records
    await bulkIndexSOAPNotes(recordsWithPets);

    res.json({
      success: true,
      message: `Bulk indexed ${recordsWithPets.length} medical records`,
      indexedCount: recordsWithPets.length
    });
  } catch (error) {
    console.error('Error bulk indexing SOAP notes:', error);
    res.status(500).json({
      success: false,
      error: `Failed to bulk index SOAP notes: ${error.message}`
    });
  }
});

// Get Elasticsearch index statistics
app.get('/api/soap/stats', async (req, res) => {
  try {
    const stats = await getIndexStats();
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Elasticsearch index not found or not accessible'
      });
    }

    res.json({
      success: true,
      stats: {
        totalDocs: stats.total?.docs?.count || 0,
        indexSize: stats.total?.store?.size_in_bytes || 0,
        fieldStats: stats.total?.fielddata?.memory_size_in_bytes || 0
      }
    });
  } catch (error) {
    console.error('Error getting Elasticsearch stats:', error);
    res.status(500).json({
      success: false,
      error: `Failed to get stats: ${error.message}`
    });
  }
});

// Feedback API endpoints
app.get('/api/feedback/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID is required'
      });
    }

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
});

app.post('/api/feedback/submit', async (req, res) => {
  try {
    const { rating, comment, tags, appointment_id } = req.body;
    
    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    if (!appointment_id) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID is required'
      });
    }
    
    // Check if appointment exists and is completed
    const appointment = await db.collection('appointments').findOne({
      _id: new ObjectId(appointment_id),
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
      rating: rating,
      comment: comment || '',
      tags: tags || [],
      submitted_at: new Date(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    const result = await db.collection('appointments').updateOne(
      { _id: new ObjectId(appointment_id) },
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
      { _id: new ObjectId(appointment_id) },
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
        const message = `Thank you for your feedback! 🐾

We're glad you had a great experience with ${staff?.first_name || 'our team'} and ${pet?.name || 'your pet'}. Your feedback helps us provide better care for all our furry friends.

See you next time! 🐕🐱`;

        const response = await fetch(process.env.WHATSAPP_API_URL || 'https://publicapi.myoperator.co/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`
          },
          body: JSON.stringify({
            phone: client.phone,
            message: message
          })
        });

        if (!response.ok) {
          console.warn('Failed to send WhatsApp thank you message:', response.status);
        }
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
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

app.get('/api/feedback/analytics', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    
    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
    }

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
});

// Invoice PDF serving endpoint
app.get('/api/invoice/:invoiceId/pdf', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Get invoice from database
    const collection = db.collection('invoices');
    const invoice = await collection.findOne({ _id: new ObjectId(invoiceId) });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get client and pet information
    const clientCollection = db.collection('clients');
    const petCollection = db.collection('pets');
    
    const [client, pet] = await Promise.all([
      invoice.client_id ? clientCollection.findOne({ _id: new ObjectId(invoice.client_id) }) : null,
      invoice.pet_id ? petCollection.findOne({ _id: new ObjectId(invoice.pet_id) }) : null
    ]);
    
    // For now, return a simple HTML page with invoice details
    // In production, you would generate and serve an actual PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            .items { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dr. Ravi Pet Portal</h1>
            <p>No. 32, 4th temple Street road, Malleshwaram, Bengaluru</p>
            <p>Phone: 082961 43115</p>
          </div>
          
          <div class="invoice-details">
            <h2>INVOICE #${invoice.invoice_number}</h2>
            <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
            
            <div style="display: flex; justify-content: space-between;">
              <div>
                <h3>Bill To:</h3>
                <p>${client ? `${client.first_name} ${client.last_name}` : 'Walk-in Customer'}</p>
                <p>${client?.phone || 'N/A'}</p>
                <p>${client?.email || 'N/A'}</p>
              </div>
              <div>
                <h3>Patient:</h3>
                <p>${pet ? pet.name : 'N/A'}</p>
                <p>${pet ? pet.species : 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div class="items">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items ? invoice.items.map(item => `
                  <tr>
                    <td>${item.service}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unit_price?.toFixed(2)}</td>
                    <td>₹${item.total?.toFixed(2)}</td>
                  </tr>
                `).join('') : ''}
              </tbody>
            </table>
          </div>
          
          <div class="total">
            <p>Subtotal: ₹${invoice.subtotal?.toFixed(2)}</p>
            <p>Tax: ₹${invoice.tax_amount?.toFixed(2)}</p>
            <p>Total: ₹${invoice.total_amount?.toFixed(2)}</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <p>Thank you for choosing Dr. Ravi Pet Portal!</p>
            <p>For any queries, please contact us at 082961 43115</p>
          </div>
        </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('Error serving invoice PDF:', error);
    res.status(500).json({ error: 'Failed to serve invoice PDF' });
  }
});

// Pet Vitals API - Extract from Medical Records
app.get('/api/pets/:petId/vitals', async (req, res) => {
  try {
    const { petId } = req.params;
    const { metric, start_date, end_date, resolution = 'day', tenant_id } = req.query;
    
    // Validate inputs
    if (!petId) {
      return res.status(400).json({ success: false, error: 'Pet ID is required' });
    }
    
    if (!metric) {
      return res.status(400).json({ success: false, error: 'Metric is required' });
    }
    
    const validMetrics = ['weight', 'blood_pressure', 'heart_rate', 'temperature'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ success: false, error: 'Invalid metric. Must be one of: weight, blood_pressure, heart_rate, temperature' });
    }
    
    const validResolutions = ['day', 'week', 'month'];
    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({ success: false, error: 'Invalid resolution. Must be one of: day, week, month' });
    }
    
    let objectId;
    try {
      objectId = new ObjectId(petId);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid pet ID format' });
    }
    
    // Build date range filter
    const dateFilter = {};
    if (start_date) {
      dateFilter.$gte = new Date(start_date);
    }
    if (end_date) {
      dateFilter.$lte = new Date(end_date + 'T23:59:59.999Z');
    }
    
    // Query medical records for the pet
    const query = { pet_id: objectId };
    if (tenant_id && tenant_id !== 'null' && tenant_id !== 'undefined') {
      query.tenant_id = tenant_id;
    }
    if (Object.keys(dateFilter).length > 0) {
      query.visit_date = dateFilter;
    }
    
    const medicalRecords = await db.collection('medical_records')
      .find(query)
      .sort({ visit_date: 1 })
      .toArray();
    
    // Extract vital data from medical records
    const vitalData = extractVitalsFromMedicalRecords(medicalRecords, metric);
    
    // Aggregate data based on resolution
    const aggregatedData = aggregateVitalData(vitalData, resolution, metric);
    
    res.json({
      success: true,
      data: aggregatedData
    });
  } catch (error) {
    console.error('Error getting pet vitals:', error);
    res.status(500).json({ success: false, error: 'Failed to get pet vitals' });
  }
});

// Function to extract vitals from medical records
function extractVitalsFromMedicalRecords(medicalRecords, metric) {
  const vitalData = [];
  
  medicalRecords.forEach(record => {
    const visitDate = new Date(record.visit_date);
    
    // Extract vitals from different fields based on metric
    switch (metric) {
      case 'weight':
        // Look for weight in objective, assessment, or plan fields
        const weightMatch = extractWeightFromText(record.objective || record.assessment || record.plan || '');
        if (weightMatch) {
          vitalData.push({
            recorded_at: visitDate,
            value: weightMatch,
            unit: 'kg'
          });
        }
        break;
        
      case 'blood_pressure':
        // Look for blood pressure in objective field
        const bpMatch = extractBloodPressureFromText(record.objective || '');
        if (bpMatch) {
          vitalData.push({
            recorded_at: visitDate,
            value: bpMatch,
            unit: 'mmHg'
          });
        }
        break;
        
      case 'heart_rate':
        // Look for heart rate in objective field
        const hrMatch = extractHeartRateFromText(record.objective || '');
        if (hrMatch) {
          vitalData.push({
            recorded_at: visitDate,
            value: hrMatch,
            unit: 'bpm'
          });
        }
        break;
        
      case 'temperature':
        // Look for temperature in objective field
        const tempMatch = extractTemperatureFromText(record.objective || '');
        if (tempMatch) {
          vitalData.push({
            recorded_at: visitDate,
            value: tempMatch,
            unit: '°C'
          });
        }
        break;
    }
  });
  
  return vitalData;
}

// Helper functions to extract specific vital values from text
function extractWeightFromText(text) {
  // Look for weight patterns like "25.5 kg", "weight: 25.5", "25.5kg", etc.
  const weightPatterns = [
    /weight[:\s]*(\d+\.?\d*)\s*kg/i,
    /(\d+\.?\d*)\s*kg.*weight/i,
    /weight[:\s]*(\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*kg/i
  ];
  
  for (const pattern of weightPatterns) {
    const match = text.match(pattern);
    if (match) {
      const weight = parseFloat(match[1]);
      if (weight > 0 && weight < 200) { // Reasonable weight range
        return weight;
      }
    }
  }
  return null;
}

function extractBloodPressureFromText(text) {
  // Look for BP patterns like "120/80", "BP: 120/80", "120/80 mmHg", etc.
  const bpPatterns = [
    /bp[:\s]*(\d+)\/(\d+)/i,
    /blood\s*pressure[:\s]*(\d+)\/(\d+)/i,
    /(\d+)\/(\d+)\s*mmhg/i,
    /(\d+)\/(\d+)/i
  ];
  
  for (const pattern of bpPatterns) {
    const match = text.match(pattern);
    if (match) {
      const systolic = parseInt(match[1]);
      const diastolic = parseInt(match[2]);
      if (systolic > 60 && systolic < 300 && diastolic > 30 && diastolic < 200) {
        return systolic; // Return systolic pressure
      }
    }
  }
  
  return null;
}

function extractHeartRateFromText(text) {
  // Look for HR patterns like "80 bpm", "HR: 80", "heart rate: 80", etc.
  const hrPatterns = [
    /hr[:\s]*(\d+)/i,
    /heart\s*rate[:\s]*(\d+)/i,
    /(\d+)\s*bpm/i,
    /pulse[:\s]*(\d+)/i
  ];
  
  for (const pattern of hrPatterns) {
    const match = text.match(pattern);
    if (match) {
      const hr = parseInt(match[1]);
      if (hr > 30 && hr < 300) { // Reasonable heart rate range
        return hr;
      }
    }
  }
  return null;
}

function extractTemperatureFromText(text) {
  // Look for temperature patterns like "38.5°C", "temp: 38.5", "temperature: 38.5", etc.
  const tempPatterns = [
    /temp[:\s]*(\d+\.?\d*)/i,
    /temperature[:\s]*(\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*°c/i,
    /(\d+\.?\d*)\s*celsius/i
  ];
  
  for (const pattern of tempPatterns) {
    const match = text.match(pattern);
    if (match) {
      const temp = parseFloat(match[1]);
      if (temp > 30 && temp < 45) { // Reasonable temperature range
        return temp;
      }
    }
  }
  return null;
}

// Function to aggregate vital data by resolution
function aggregateVitalData(vitalData, resolution, metric) {
  if (vitalData.length === 0) {
    return [];
  }
  
  // Group data by date based on resolution
  const groupedData = {};
  
  vitalData.forEach(vital => {
    let dateKey;
    const date = new Date(vital.recorded_at);
    
    switch (resolution) {
      case 'day':
        dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        break;
    }
    
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = [];
    }
    groupedData[dateKey].push(vital.value);
  });
  
  // Calculate aggregated values for each group
  const aggregatedData = Object.entries(groupedData).map(([dateKey, values]) => {
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    return {
      t: new Date(dateKey + 'T00:00:00.000Z').toISOString(),
      v: Math.round(avgValue * 100) / 100, // Round to 2 decimal places
      min: minValue,
      max: maxValue,
      count: values.length
    };
  });
  
  return aggregatedData.sort((a, b) => new Date(a.t) - new Date(b.t));
}





// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
connectDB().then(async () => {
  await initializeServices();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
  // Schedule vaccination reminders job to run daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('🕘 Running scheduled vaccination reminders job...');
    try {
      const { runVaccinationReminders } = await import('./src/jobs/sendVaccinationReminders.js');
      await runVaccinationReminders();
      console.log('✅ Scheduled vaccination reminders job completed');
    } catch (error) {
      console.error('❌ Scheduled vaccination reminders job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  
  console.log('📅 Vaccination reminders scheduled to run daily at 9:00 AM IST');
}); 