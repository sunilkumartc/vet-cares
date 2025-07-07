import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'vet-cares';

async function createStaffForTenant() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const staffCollection = db.collection('staff');
    const tenantsCollection = db.collection('tenants');
    
    // Get the tenant ID (you can replace this with your actual tenant ID)
    const tenant = await tenantsCollection.findOne({});
    if (!tenant) {
      console.log('No tenants found. Please create a tenant first.');
      return;
    }
    
    const tenantId = tenant._id.toString();
    console.log(`Creating staff for tenant: ${tenant.name} (${tenantId})`);
    
    // Hash passwords
    const hashedPassword = await bcrypt.hash('staff123', 10);
    
    // Create staff members
    const staffMembers = [
      {
        name: 'Dr. John Smith',
        email: 'dr.smith@clinic.com',
        password: hashedPassword,
        role: 'veterinarian',
        phone: '555-0101',
        tenant_id: tenantId,
        permissions: ['view_patients', 'edit_patients', 'view_appointments', 'edit_appointments', 'view_medical_records', 'edit_medical_records'],
        created_date: new Date(),
        updated_date: new Date()
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@clinic.com',
        password: hashedPassword,
        role: 'receptionist',
        phone: '555-0102',
        tenant_id: tenantId,
        permissions: ['view_patients', 'edit_patients', 'view_appointments', 'edit_appointments'],
        created_date: new Date(),
        updated_date: new Date()
      },
      {
        name: 'Mike Wilson',
        email: 'mike@clinic.com',
        password: hashedPassword,
        role: 'technician',
        phone: '555-0103',
        tenant_id: tenantId,
        permissions: ['view_patients', 'view_appointments', 'view_medical_records'],
        created_date: new Date(),
        updated_date: new Date()
      }
    ];
    
    // Insert staff members
    for (const staff of staffMembers) {
      const existingStaff = await staffCollection.findOne({ 
        email: staff.email,
        tenant_id: tenantId
      });
      
      if (existingStaff) {
        console.log(`Staff member ${staff.email} already exists`);
        continue;
      }
      
      const result = await staffCollection.insertOne(staff);
      console.log(`Created staff member: ${staff.name} (${staff.email})`);
      console.log(`  Role: ${staff.role}`);
      console.log(`  Password: staff123`);
      console.log(`  ID: ${result.insertedId}`);
      console.log('---');
    }
    
    console.log('\nStaff creation completed!');
    console.log('\nDefault credentials for all staff:');
    console.log('Email: [staff-email]');
    console.log('Password: staff123');
    
  } catch (error) {
    console.error('Error creating staff:', error);
  } finally {
    await client.close();
  }
}

createStaffForTenant(); 