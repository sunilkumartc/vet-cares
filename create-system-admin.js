import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'vet_cares';

async function createSystemAdmin() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const systemAdminsCollection = db.collection('system_admins');
    
    // Check if system admin already exists
    const existingAdmin = await systemAdminsCollection.findOne({ username: 'systemadmin' });
    
    if (existingAdmin) {
      console.log('System admin already exists. Here are the credentials:');
      console.log('Username: systemadmin');
      console.log('Password: systemadmin123');
      return;
    }
    
    // Create system admin account
    const systemAdmin = {
      _id: new ObjectId(),
      username: 'systemadmin',
      password: 'systemadmin123', // In production, this should be hashed
      email: 'admin@vetcares.com',
      first_name: 'System',
      last_name: 'Administrator',
      role: 'system_admin',
      permissions: ['all'],
      status: 'active',
      created_date: new Date(),
      updated_date: new Date(),
      last_login: null,
      login_attempts: 0,
      locked_until: null
    };
    
    // Insert system admin
    const result = await systemAdminsCollection.insertOne(systemAdmin);
    console.log('Created system admin account:', result.insertedId);
    
    console.log('\n=== SYSTEM ADMIN CREDENTIALS ===');
    console.log('Username: systemadmin');
    console.log('Password: systemadmin123');
    console.log('Role: System Administrator (Full access)');
    console.log('\n⚠️  IMPORTANT: Change these credentials in production!');
    
  } catch (error) {
    console.error('Error creating system admin:', error);
  } finally {
    await client.close();
  }
}

createSystemAdmin(); 