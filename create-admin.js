import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'vet-cares';

async function createSystemAdmin() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const systemAdminsCollection = db.collection('system_admins');
    
    // Check if admin already exists
    const existingAdmin = await systemAdminsCollection.findOne({ 
      email: 'admin2@system' 
    });
    
    if (existingAdmin) {
      console.log('System admin admin2@system already exists');
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create new system admin
    const newAdmin = {
      email: 'admin2@system',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'system_admin',
      permissions: ['manage_tenants', 'view_analytics', 'system_settings'],
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await systemAdminsCollection.insertOne(newAdmin);
    
    console.log('✅ New system admin created successfully!');
    console.log('📧 Email: admin2@system');
    console.log('🔑 Password: admin123');
    console.log('🆔 Admin ID:', result.insertedId);
    
  } catch (error) {
    console.error('❌ Error creating system admin:', error);
  } finally {
    await client.close();
  }
}

createSystemAdmin(); 