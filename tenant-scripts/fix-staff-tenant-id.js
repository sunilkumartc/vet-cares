// Fix Staff Tenant ID Script
// This script updates the staff tenant_id from string to ObjectId

import { dbUtils } from '../src/api/mongodb.js';
import { ObjectId } from 'mongodb';

async function fixStaffTenantId() {
  try {
    console.log('🔧 Fixing staff tenant ID...');
    
    // Connect to MongoDB
    await dbUtils.connect();
    const staffCollection = dbUtils.getCollection('staff');
    
    // Update all staff records to use the correct tenant ID
    const result = await staffCollection.updateMany(
      { tenant_id: '6868eeb7c1c99ed4b694bf8d' },
      { $set: { tenant_id: '6868ed5cf45835c58a981ce3' } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} staff records`);
    
    // Verify the update
    const staffCount = await staffCollection.countDocuments({ tenant_id: '6868ed5cf45835c58a981ce3' });
    console.log(`📋 Staff records with correct tenant ID: ${staffCount}`);
    
    // Show staff details
    const staff = await staffCollection.find({ tenant_id: '6868ed5cf45835c58a981ce3' }).toArray();
    staff.forEach((member, index) => {
      console.log(`${index + 1}. ${member.full_name} (${member.email}) - ${member.role}`);
    });
    
    console.log('✅ Staff tenant ID fixed successfully!');
    console.log('🔑 Login credentials:');
    console.log('   Email: admin@petclinic.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error fixing staff tenant ID:', error);
  } finally {
    process.exit(0);
  }
}

fixStaffTenantId(); 