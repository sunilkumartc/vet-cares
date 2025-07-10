// Migrate Staff to Vet-Cares Database Script
// This script moves staff records from petclinic to vet-cares database

import { MongoClient } from 'mongodb';

async function migrateStaffToVetCares() {
  try {
    console.log('🔧 Migrating staff records to vet-cares database...');
    
    const MONGODB_URI = process.env.VITE_MONGODB_URI || 'mongodb://localhost:27017/petclinic';
    
    // Connect to both databases
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const petclinicDb = client.db('petclinic');
    const vetCaresDb = client.db('vet-cares');
    
    console.log('✅ Connected to both databases');
    
    // Get staff from petclinic database
    const petclinicStaffCollection = petclinicDb.collection('staff');
    const petclinicStaff = await petclinicStaffCollection.find({}).toArray();
    
    console.log(`📋 Found ${petclinicStaff.length} staff records in petclinic database`);
    
    if (petclinicStaff.length === 0) {
      console.log('❌ No staff records found in petclinic database');
      return;
    }
    
    // Insert staff into vet-cares database
    const vetCaresStaffCollection = vetCaresDb.collection('staff');
    
    // Clear existing staff in vet-cares (if any)
    await vetCaresStaffCollection.deleteMany({});
    console.log('🗑️  Cleared existing staff in vet-cares database');
    
    // Insert staff records
    const result = await vetCaresStaffCollection.insertMany(petclinicStaff);
    console.log(`✅ Inserted ${result.insertedCount} staff records into vet-cares database`);
    
    // Verify the migration
    const migratedStaff = await vetCaresStaffCollection.find({}).toArray();
    console.log(`📊 Total staff in vet-cares database: ${migratedStaff.length}`);
    
    migratedStaff.forEach((member, index) => {
      console.log(`${index + 1}. ${member.full_name} (${member.email}) - ${member.role}`);
    });
    
    // Test the query that the server uses
    const testQuery = await vetCaresStaffCollection.find({ 
      tenant_id: '6868ed5cf45835c58a981ce3' 
    }).toArray();
    console.log(`🔍 Staff with tenant_id '6868ed5cf45835c58a981ce3': ${testQuery.length}`);
    
    await client.close();
    
    console.log('✅ Migration completed successfully!');
    console.log('🔑 Staff login credentials:');
    console.log('   Email: admin@petclinic.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error migrating staff:', error);
  } finally {
    process.exit(0);
  }
}

migrateStaffToVetCares(); 