// Check Staff Tenant IDs Script
// This script shows what tenant_id values exist in the staff collection

import { dbUtils } from '../src/api/mongodb.js';

async function checkStaffTenantIds() {
  try {
    console.log('🔍 Checking staff tenant IDs...');
    
    // Connect to MongoDB
    await dbUtils.connect();
    const staffCollection = dbUtils.getCollection('staff');
    
    // Get all staff records
    const staff = await staffCollection.find({}).toArray();
    
    console.log(`📋 Found ${staff.length} staff records:`);
    
    staff.forEach((member, index) => {
      console.log(`${index + 1}. ${member.full_name} (${member.email})`);
      console.log(`   Tenant ID: ${member.tenant_id} (type: ${typeof member.tenant_id})`);
      console.log(`   Role: ${member.role}`);
      console.log('');
    });
    
    // Group by tenant_id
    const tenantGroups = {};
    staff.forEach(member => {
      const tenantId = member.tenant_id;
      if (!tenantGroups[tenantId]) {
        tenantGroups[tenantId] = [];
      }
      tenantGroups[tenantId].push(member);
    });
    
    console.log('📊 Staff grouped by tenant ID:');
    Object.keys(tenantGroups).forEach(tenantId => {
      console.log(`   Tenant ID: ${tenantId} - ${tenantGroups[tenantId].length} staff members`);
    });
    
  } catch (error) {
    console.error('❌ Error checking staff tenant IDs:', error);
  } finally {
    process.exit(0);
  }
}

checkStaffTenantIds(); 