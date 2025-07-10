import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'vet-cares';

async function createTestClinicStaff() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const staffCollection = db.collection('staff');
    
    // Test Clinic tenant ID
    const tenantId = '68699374bad966da535885c2';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Staff members for Test Clinic
    const staffMembers = [
      {
        name: 'Dr. Sarah Johnson',
        email: 'dr.sarah@test-clinic.com',
        password: hashedPassword,
        role: 'veterinarian',
        tenant_id: tenantId,
        permissions: [
          'view_patients',
          'edit_patients', 
          'view_appointments',
          'edit_appointments',
          'view_medical_records',
          'edit_medical_records',
          'view_billing',
          'edit_billing'
        ],
        created_date: new Date(),
        updated_date: new Date()
      },
      {
        name: 'Mike Wilson',
        email: 'mike@test-clinic.com',
        password: hashedPassword,
        role: 'receptionist',
        tenant_id: tenantId,
        permissions: [
          'view_patients',
          'edit_patients',
          'view_appointments',
          'edit_appointments',
          'view_billing'
        ],
        created_date: new Date(),
        updated_date: new Date()
      },
      {
        name: 'Lisa Chen',
        email: 'lisa@test-clinic.com',
        password: hashedPassword,
        role: 'technician',
        tenant_id: tenantId,
        permissions: [
          'view_patients',
          'view_appointments',
          'view_medical_records'
        ],
        created_date: new Date(),
        updated_date: new Date()
      }
    ];
    
    // Check if staff already exist for this tenant
    const existingStaff = await staffCollection.find({ tenant_id: tenantId }).toArray();
    if (existingStaff.length > 0) {
      console.log(`Staff already exist for tenant ${tenantId}. Found ${existingStaff.length} staff members.`);
      console.log('Existing staff:');
      existingStaff.forEach(staff => {
        console.log(`- ${staff.name} (${staff.email}) - ${staff.role}`);
      });
      return;
    }
    
    // Insert staff members
    const result = await staffCollection.insertMany(staffMembers);
    console.log(`Created ${result.insertedCount} staff members for Test Clinic (${tenantId})`);
    
    console.log('\nTest Clinic Staff Credentials:');
    console.log('================================');
    staffMembers.forEach(staff => {
      console.log(`\n${staff.role.toUpperCase()}:`);
      console.log(`Email: ${staff.email}`);
      console.log(`Password: test123`);
      console.log(`Name: ${staff.name}`);
    });
    
  } catch (error) {
    console.error('Error creating staff:', error);
  } finally {
    await client.close();
  }
}

createTestClinicStaff(); 