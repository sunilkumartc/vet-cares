import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbUtils } from '../lib/mongodb.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret-key';

// Helper to get tenant by subdomain, slug, or tenant_id
async function getTenant(req) {
  await dbUtils.connect();
  const tenants = dbUtils.getCollection('tenants');
  let { tenant_id, subdomain, slug } = req.body;
  tenant_id = tenant_id || req.query.tenant_id || req.headers['x-tenant-id'];
  subdomain = subdomain || req.query.subdomain || req.headers['x-tenant-subdomain'];
  slug = slug || req.query.slug;

  let tenant = null;
  if (tenant_id) {
    tenant = await tenants.findOne({ _id: dbUtils.toObjectId ? await dbUtils.toObjectId(tenant_id) : tenant_id });
  }
  if (!tenant && subdomain) {
    tenant = await tenants.findOne({ subdomain });
  }
  if (!tenant && slug) {
    tenant = await tenants.findOne({ slug });
  }
  return tenant;
}

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const tenant = await getTenant(req);
    if (!tenant) {
      return res.status(400).json({ error: 'Tenant not found or not specified' });
    }
    await dbUtils.connect();
    const usersCollection = dbUtils.getCollection('users');
    const existing = await usersCollection.findOne({ username, tenant_id: tenant._id.toString() });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists for this tenant' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      username,
      passwordHash,
      tenant_id: tenant._id.toString(),
      createdAt: new Date(),
    };
    await usersCollection.insertOne(user);
    res.json({ success: true, message: 'User registered', tenant: tenant.subdomain || tenant.slug || tenant._id });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const tenant = await getTenant(req);
    if (!tenant) {
      return res.status(400).json({ error: 'Tenant not found or not specified' });
    }
    await dbUtils.connect();
    const usersCollection = dbUtils.getCollection('users');
    const user = await usersCollection.findOne({ username, tenant_id: tenant._id.toString() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = jwt.sign({ userId: user._id, username: user.username, tenant_id: tenant._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { username: user.username, tenant_id: tenant._id.toString() }, tenant: tenant.subdomain || tenant.slug || tenant._id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router; 