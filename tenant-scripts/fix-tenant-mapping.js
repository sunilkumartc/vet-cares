import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'vet-cares';

async function fixTenantMapping() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const staffCollection = db.collection('staff');
    
    // Test Clinic tenant ID
    const testClinicTenantId = '68699374bad966da535885c2';
    
    // Find and update test clinic staff members
    const testClinicEmails = [
      'dr.sarah@test-clinic.com',
      'mike@test-clinic.com', 
      'lisa@test-clinic.com'
    ];
    
    console.log('Updating tenant mapping for test clinic staff...');
    
    for (const email of testClinicEmails) {
      const result = await staffCollection.updateOne(
        { email: email },
        { $set: { tenant_id: testClinicTenantId } }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ Updated ${email} to tenant ${testClinicTenantId}`);
      } else {
        console.log(`❌ Staff member ${email} not found`);
      }
    }
    
    // Verify the changes
    console.log('\nVerifying staff mapping...');
    const testClinicStaff = await staffCollection.find({ 
      tenant_id: testClinicTenantId 
    }).toArray();
    
    console.log(`Found ${testClinicStaff.length} staff members for test clinic:`);
    testClinicStaff.forEach(staff => {
      console.log(`- ${staff.email} (${staff.name})`);
    });
    
  } catch (error) {
    console.error('Error fixing tenant mapping:', error);
  } finally {
    await client.close();
  }
}

fixTenantMapping(); 