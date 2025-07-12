import express from 'express';
import multer from 'multer';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/clinic-logos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${tenantId}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get clinic profile
router.get('/profile', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');

    const tenant = await db.collection('tenants').findOne(
      { _id: new ObjectId(tenantId) },
      { 
        projection: {
          name: 1,
          clinic_name: 1,
          tagline: 1,
          logo_url: 1,
          address: 1,
          phone: 1,
          email: 1,
          website: 1,
          description: 1
        }
      }
    );

    await client.close();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      success: true,
      profile: {
        clinicName: tenant.clinic_name || tenant.name,
        tagline: tenant.tagline || '',
        logoUrl: tenant.logo_url || null,
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        website: tenant.website || '',
        description: tenant.description || ''
      }
    });
  } catch (error) {
    console.error('Error fetching clinic profile:', error);
    res.status(500).json({ error: 'Failed to fetch clinic profile' });
  }
});

// Update clinic profile
router.put('/profile', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const {
      clinicName,
      tagline,
      logo_url,
      address,
      phone,
      email,
      website,
      description
    } = req.body;

    if (!clinicName || !clinicName.trim()) {
      return res.status(400).json({ error: 'Clinic name is required' });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');

    const updateData = {
      clinic_name: clinicName.trim(),
      tagline: tagline?.trim() || '',
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      website: website?.trim() || '',
      description: description?.trim() || '',
      updated_at: new Date()
    };

    // Only update logo_url if provided
    if (logo_url) {
      updateData.logo_url = logo_url;
    }

    const result = await db.collection('tenants').updateOne(
      { _id: new ObjectId(tenantId) },
      { $set: updateData }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      success: true,
      message: 'Clinic profile updated successfully',
      profile: {
        clinicName: updateData.clinic_name,
        tagline: updateData.tagline,
        logoUrl: updateData.logo_url,
        address: updateData.address,
        phone: updateData.phone,
        email: updateData.email,
        website: updateData.website,
        description: updateData.description
      }
    });
  } catch (error) {
    console.error('Error updating clinic profile:', error);
    res.status(500).json({ error: 'Failed to update clinic profile' });
  }
});

// Upload clinic logo
router.post('/upload-clinic-logo', upload.single('logo'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }

    // Generate public URL for the uploaded file
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const logoUrl = `${baseUrl}/uploads/clinic-logos/${req.file.filename}`;

    // Update tenant record with new logo URL
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');

    await db.collection('tenants').updateOne(
      { _id: new ObjectId(tenantId) },
      { 
        $set: { 
          logo_url: logoUrl,
          updated_at: new Date()
        } 
      }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      url: logoUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Serve uploaded logo files
router.get('/uploads/clinic-logos/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/clinic-logos', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Logo file not found' });
    }
  });
});

// Delete clinic logo
router.delete('/profile/logo', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('vet-cares');

    // Get current logo URL
    const tenant = await db.collection('tenants').findOne(
      { _id: new ObjectId(tenantId) },
      { projection: { logo_url: 1 } }
    );

    if (tenant && tenant.logo_url) {
      // Extract filename from URL
      const filename = path.basename(tenant.logo_url);
      const filePath = path.join(__dirname, '../uploads/clinic-logos', filename);
      
      // Delete file if it exists
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('Logo file not found for deletion:', error.message);
      }
    }

    // Remove logo URL from tenant record
    await db.collection('tenants').updateOne(
      { _id: new ObjectId(tenantId) },
      { 
        $unset: { logo_url: "" },
        $set: { updated_at: new Date() }
      }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});

export default router; 