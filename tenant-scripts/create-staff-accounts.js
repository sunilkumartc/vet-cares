import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'vet_cares';

async function createStaffAccounts() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const staffCollection = db.collection('staff');
    
    // Tenant ID from the server logs
    const tenantId = '6868ed5cf45835c58a981ce3';
    
    // Check if staff already exist
    const existingStaff = await staffCollection.find({ tenant_id: tenantId }).toArray();
    console.log(`Found ${existingStaff.length} existing staff members`);
    
    if (existingStaff.length === 0) {
      // Create admin staff account
      const adminStaff = {
        _id: new ObjectId(),
        tenant_id: tenantId,
        username: 'admin',
        password: 'admin123', // In production, this should be hashed
        email: 'admin@vetclinic.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        permissions: ['all'],
        status: 'active',
        created_date: new Date(),
        updated_date: new Date()
      };
      
      // Create regular staff account
      const regularStaff = {
        _id: new ObjectId(),
        tenant_id: tenantId,
        username: 'staff',
        password: 'staff123', // In production, this should be hashed
        email: 'staff@vetclinic.com',
        first_name: 'Regular',
        last_name: 'Staff',
        role: 'staff',
        permissions: ['appointments', 'clients', 'pets', 'medical_records'],
        status: 'active',
        created_date: new Date(),
        updated_date: new Date()
      };
      
      // Create vet staff account
      const vetStaff = {
        _id: new ObjectId(),
        tenant_id: tenantId,
        username: 'vet',
        password: 'vet123', // In production, this should be hashed
        email: 'vet@vetclinic.com',
        first_name: 'Dr. Sarah',
        last_name: 'Johnson',
        role: 'veterinarian',
        permissions: ['appointments', 'clients', 'pets', 'medical_records', 'diagnostics', 'prescriptions'],
        status: 'active',
        created_date: new Date(),
        updated_date: new Date()
      };
      
      // Insert staff accounts
      const result = await staffCollection.insertMany([adminStaff, regularStaff, vetStaff]);
      console.log('Created staff accounts:', result.insertedIds);
      
      console.log('\n=== STAFF LOGIN CREDENTIALS ===');
      console.log('Admin Account:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
      console.log('  Role: Admin (Full access)');
      console.log('');
      console.log('Staff Account:');
      console.log('  Username: staff');
      console.log('  Password: staff123');
      console.log('  Role: Staff (Limited access)');
      console.log('');
      console.log('Veterinarian Account:');
      console.log('  Username: vet');
      console.log('  Password: vet123');
      console.log('  Role: Veterinarian (Medical access)');
      
    } else {
      console.log('Staff accounts already exist. Here are the current accounts:');
      existingStaff.forEach(staff => {
        console.log(`- ${staff.username} (${staff.role})`);
      });
    }
    
  } catch (error) {
    console.error('Error creating staff accounts:', error);
  } finally {
    await client.close();
  }
}

createStaffAccounts(); 