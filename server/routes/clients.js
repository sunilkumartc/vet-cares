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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId }; // Match reference code structure
    next();
  } catch (error) {
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

// POST /api/clients - create client (keeping existing)
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

    if (!name || !phone ) {
      return res.status(400).json({ error: 'Missing required fields (name, phone)' });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');
    const clientsCollection = db.collection('clients');
    const tenantsCollection = db.collection('tenants');

    const plainPassword = password || '123456';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const newClient = {
      name,
      phone,
      tenant_id,
      last_name: last_name || '',
      email: email || '',
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
      await sendWelcomeEmail({ to: email, name: name, tenantName, welcomeMessage, bookingUrl });
    }

    await client.close();
    res.json({ success: true, client_id: result.insertedId });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/clients/login-phone (keeping existing)
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

    const user = await clientsCollection.findOne({ phone });
    if (!user) {
      await client.close();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      await client.close();
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
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

// GET /api/clients/profile (following reference code pattern)
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

    // Set cache control like reference code
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

// PUT /api/clients/update-profile (following reference code pattern)
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

    // Check for email conflicts (like reference code)
    if (email && email.toLowerCase() !== user.email) {
      const existing = await clientsCollection.findOne({ email: email.toLowerCase() });
      if (existing) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another account'
        });
      }
      updateData.email = email.toLowerCase();
    }

    // Check for phone conflicts
    if (phone && phone !== user.phone) {
      const existing = await clientsCollection.findOne({ phone });
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

// PUT /api/clients/change-password (following reference code pattern)
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

// POST /api/clients/upload-avatar (following reference code pattern exactly)
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

    // Delete old avatar from S3 if it exists (same logic as reference code)
    if (user.avatar && user.avatar.includes('amazonaws.com')) {
      try {
        // Extract S3 key from URL (same as reference code)
        const oldKey = user.avatar.split('/').slice(-2).join('/'); // Get last two parts of the path
        await deleteFromS3(oldKey);
        console.log('Old avatar deleted from S3:', oldKey);
      } catch (deleteError) {
        console.error('Error deleting old avatar:', deleteError);
        // Don't fail the upload if we can't delete the old image
      }
    }

    // Upload new avatar to S3 (same as reference code)
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

// GET /api/clients/avatar/:userId (following reference code pattern)
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

    // If it's an S3 URL, generate a signed URL for better security (same as reference)
    if (user.avatar.includes('amazonaws.com')) {
      try {
        // Extract S3 key from URL
        const s3Key = user.avatar.split('/').slice(-2).join('/');
        const signedUrl = await getSignedUrl(s3Key, 3600); // 1 hour expiry
        
        res.json({
          success: true,
          data: {
            avatarUrl: signedUrl,
            expiresIn: 3600
          }
        });
      } catch (signedUrlError) {
        console.error('Error generating signed URL:', signedUrlError);
        // Fallback to original URL
        res.json({
          success: true,
          data: {
            avatarUrl: user.avatar
          }
        });
      }
    } else {
      // Direct URL (fallback)
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

// DELETE /api/clients/avatar (following reference code pattern)
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

    // Delete from S3 if it exists (same as reference code)
    if (user.avatar && user.avatar.includes('amazonaws.com')) {
      try {
        const s3Key = user.avatar.split('/').slice(-2).join('/');
        await deleteFromS3(s3Key);
        console.log('Avatar deleted from S3:', s3Key);
      } catch (deleteError) {
        console.error('Error deleting avatar from S3:', deleteError);
        // Continue even if S3 delete fails
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

// POST /api/clients/logout (following reference code pattern)
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
