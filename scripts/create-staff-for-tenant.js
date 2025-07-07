import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = 'mongodb://localhost:27017';
const dbName = 'vet-cares';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const staff = db.collection('staff');

    // Get tenant ID from command line argument or use the newly created one
    const tenantId = process.argv[2] || '68699e87d38c8a7969b19e3f';
    
    // Default password for all staff
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const staffMembers = [
      {
        email: 'admin@clinic3.localhost',
        password: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        tenant_id: tenantId,
        active: true,
        created_at: new Date(),
        permissions: ['all']
      },
      {
        email: 'vet1@clinic3.localhost',
        password: hashedPassword,
        first_name: 'Dr. Sarah',
        last_name: 'Johnson',
        role: 'veterinarian',
        tenant_id: tenantId,
        active: true,
        created_at: new Date(),
        permissions: ['appointments', 'medical_records', 'diagnostics', 'billing']
      },
      {
        email: 'reception1@clinic3.localhost',
        password: hashedPassword,
        first_name: 'Maria',
        last_name: 'Garcia',
        role: 'receptionist',
        tenant_id: tenantId,
        active: true,
        created_at: new Date(),
        permissions: ['appointments', 'clients', 'billing']
      },
      {
        email: 'tech1@clinic3.localhost',
        password: hashedPassword,
        first_name: 'Mike',
        last_name: 'Chen',
        role: 'technician',
        tenant_id: tenantId,
        active: true,
        created_at: new Date(),
        permissions: ['appointments', 'medical_records']
      }
    ];

    console.log(`Creating staff accounts for tenant: ${tenantId}`);
    
    for (const staffMember of staffMembers) {
      const result = await staff.insertOne(staffMember);
      console.log(`Created staff member: ${staffMember.email} (ID: ${result.insertedId})`);
    }

    console.log('\n=== Staff Login Credentials ===');
    console.log('All staff members use password: password123');
    console.log('\nEmail addresses:');
    staffMembers.forEach(member => {
      console.log(`- ${member.email} (${member.role})`);
    });

  } catch (error) {
    console.error('Error creating staff accounts:', error);
  } finally {
    await client.close();
  }
}

main(); 