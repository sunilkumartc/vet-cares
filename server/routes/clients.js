import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
// Import your AWS S3 functions (same as reference code)
import { 
  uploadToS3, 
  deleteFromS3, 
  getSignedUrl 
} from '../config/aws.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for avatar uploads (same as reference code)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header received:', authHeader ? 'present' : 'undefined');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { 
      userId: decoded.userId,
      tenantId: decoded.tenant_id || decoded.tenantId,
      role: decoded.role
    };
    console.log('Authenticated user:', req.user);
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

// **NEW: GET /api/clients - List all clients with tenant filtering**
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sort = '-created_at', tenant_id } = req.query;
    
    console.log('Generic entity API - Entity: clients');
    console.log('Generic entity API - Query params:', req.query);
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    // **CRITICAL: Tenant filtering**
    const currentTenantId = tenant_id || req.user.tenantId;
    console.log('Generic entity API - Tenant ID:', currentTenantId);

    if (!currentTenantId) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    const query = { 
      tenant_id: currentTenantId,
      isActive: true 
    };
    console.log('Generic entity API - Final query:', query);

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort handling
    let sortObj = {};
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const clients = await clientsCollection
      .find(query, { projection: { password: 0 } })
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await clientsCollection.countDocuments(query);

    await client.close();

    res.json({
      success: true,
      data: clients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving clients'
    });
  }
});

// **NEW: GET /api/clients/:id - Get specific client**
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    const clientData = await clientsCollection.findOne(
      { 
        _id: new ObjectId(id),
        tenant_id: req.user.tenantId,
        isActive: true
      },
      { projection: { password: 0 } }
    );

    if (!clientData) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      data: clientData
    });

  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving client'
    });
  }
});

// **NEW: PUT /api/clients/:id - Update specific client**
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.password;
    delete updates.created_at;
    delete updates.tenant_id; // Prevent tenant switching
    
    updates.updated_at = new Date();

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    // Check if client exists and belongs to tenant
    const existingClient = await clientsCollection.findOne({
      _id: new ObjectId(id),
      tenant_id: req.user.tenantId,
      isActive: true
    });

    if (!existingClient) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check for email conflicts
    if (updates.email && updates.email !== existingClient.email) {
      const emailExists = await clientsCollection.findOne({
        email: updates.email,
        tenant_id: req.user.tenantId,
        _id: { $ne: new ObjectId(id) }
      });
      
      if (emailExists) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another client'
        });
      }
    }

    // Check for phone conflicts
    if (updates.phone && updates.phone !== existingClient.phone) {
      const phoneExists = await clientsCollection.findOne({
        phone: updates.phone,
        tenant_id: req.user.tenantId,
        _id: { $ne: new ObjectId(id) }
      });
      
      if (phoneExists) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use by another client'
        });
      }
    }

    const result = await clientsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get updated client
    const updatedClient = await clientsCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: updatedClient
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating client'
    });
  }
});

// **NEW: DELETE /api/clients/:id - Delete client (soft delete)**
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    const result = await clientsCollection.updateOne(
      {
        _id: new ObjectId(id),
        tenant_id: req.user.tenantId,
        isActive: true
      },
      {
        $set: {
          isActive: false,
          deletedAt: new Date(),
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting client'
    });
  }
});

// **EXISTING: POST /api/clients - create client (with tenant filtering fix)**
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

    if (!tenant_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Tenant ID is required' 
      });
    }

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

// Utility to send welcome email (keeping existing)
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

// **EXISTING: All other routes remain the same but with improved tenant filtering**

// POST /api/clients/login-phone (existing - with tenant awareness)
router.post('/login-phone', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required'
      });
    }

    const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    const user = await clientsCollection.findOne({ 
      phone,
      isActive: true 
    });
    
    if (!user) {
      await client.close();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await client.close();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    await clientsCollection.updateOne(
      { _id: user._id },
      { 
        $set: { 
          lastLogin: new Date(),
          updated_at: new Date()
        } 
      }
    );

    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        phone: user.phone,
        tenant_id: user.tenant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    await client.close();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// GET /api/clients/profile (existing - unchanged)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    const user = await clientsCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      await client.close();
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    await client.close();

    res.set('Cache-Control', 'no-cache');
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving profile'
    });
  }
});

// PUT /api/clients/update-profile (existing - unchanged)
router.put('/update-profile', authenticateToken, async (req, res) => {
  try {
    console.log('Update profile request body:', req.body);

    const { name, email, phone, address, avatar, preferences } = req.body;

    // Basic validation (like reference code)
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (phone && !/^[\+]?[\d\s\-\(\)]+$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone format'
      });
    }

    if (name && (name.length < 2 || name.length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be 2-50 characters'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    const user = await clientsCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = { updated_at: new Date() };

    // Check for email conflicts within same tenant
    if (email && email.toLowerCase() !== user.email) {
      const existing = await clientsCollection.findOne({ 
        email: email.toLowerCase(),
        tenant_id: user.tenant_id,
        _id: { $ne: user._id }
      });
      if (existing) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another account'
        });
      }
      updateData.email = email.toLowerCase();
    }

    // Check for phone conflicts within same tenant
    if (phone && phone !== user.phone) {
      const existing = await clientsCollection.findOne({ 
        phone,
        tenant_id: user.tenant_id,
        _id: { $ne: user._id }
      });
      if (existing) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use by another account'
        });
      }
      updateData.phone = phone;
    }

    // Update other fields
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (preferences) updateData.preferences = { ...user.preferences, ...preferences };

    const result = await clientsCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: updateData }
    );

    const updatedUser = await clientsCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// PUT /api/clients/change-password (existing - unchanged)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    console.log('Change password request for user:', req.user.userId);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    const user = await clientsCollection.findOne({ _id: new ObjectId(req.user.userId) });
    
    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await clientsCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { 
        $set: { 
          password: hashedNewPassword,
          updated_at: new Date()
        } 
      }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
});

// POST /api/clients/upload-avatar (existing - unchanged)
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    console.log('Upload avatar request received');
    console.log('File:', req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    const user = await clientsCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old avatar from S3 if it exists
    if (user.avatar && user.avatar.includes('amazonaws.com')) {
      try {
        const oldKey = user.avatar.split('/').slice(-2).join('/');
        await deleteFromS3(oldKey);
        console.log('Old avatar deleted from S3:', oldKey);
      } catch (deleteError) {
        console.error('Error deleting old avatar:', deleteError);
      }
    }

    // Upload new avatar to S3
    const s3Result = await uploadToS3(req.file, 'user-avatars');
    console.log('Avatar uploaded to S3:', s3Result);

    // Update user with new avatar URL
    await clientsCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { 
        $set: { 
          avatar: s3Result.url,
          updated_at: new Date()
        } 
      }
    );

    // Get updated user
    const updatedUser = await clientsCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { 
        avatarUrl: s3Result.url,
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB'
      });
    }

    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while uploading avatar'
    });
  }
});

// GET /api/clients/avatar/:userId (existing - unchanged)
router.get('/avatar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');
    
    const user = await clientsCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { avatar: 1 } }
    );
    
    await client.close();

    if (!user || !user.avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    // If it's an S3 URL, generate a signed URL for better security
    if (user.avatar.includes('amazonaws.com')) {
      try {
        const s3Key = user.avatar.split('/').slice(-2).join('/');
        const signedUrl = await getSignedUrl(s3Key, 3600);
        
        res.json({
          success: true,
          data: {
            avatarUrl: signedUrl,
            expiresIn: 3600
          }
        });
      } catch (signedUrlError) {
        console.error('Error generating signed URL:', signedUrlError);
        res.json({
          success: true,
          data: {
            avatarUrl: user.avatar
          }
        });
      }
    } else {
      res.json({
        success: true,
        data: {
          avatarUrl: user.avatar
        }
      });
    }
  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching avatar'
    });
  }
});

// DELETE /api/clients/avatar (existing - unchanged)
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    const user = await clientsCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete from S3 if it exists
    if (user.avatar && user.avatar.includes('amazonaws.com')) {
      try {
        const s3Key = user.avatar.split('/').slice(-2).join('/');
        await deleteFromS3(s3Key);
        console.log('Avatar deleted from S3:', s3Key);
      } catch (deleteError) {
        console.error('Error deleting avatar from S3:', deleteError);
      }
    }

    // Remove avatar from user
    await clientsCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { 
        $unset: { avatar: 1 },
        $set: { updated_at: new Date() }
      }
    );

    // Get updated user
    const updatedUser = await clientsCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Avatar deleted successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting avatar'
    });
  }
});

// POST /api/clients/logout (existing - unchanged)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    console.log('Logout request received for user:', req.user.userId);

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');

    // Update logout time
    await clientsCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { 
        $set: { 
          lastLogout: new Date(),
          updated_at: new Date()
        } 
      }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

export default router;
