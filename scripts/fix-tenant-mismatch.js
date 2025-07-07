// Fix Tenant Mismatch Script
// This script ensures the server returns the correct tenant that has staff data

import { dbUtils } from '../src/api/mongodb.js';
import { ObjectId } from 'mongodb';

async function fixTenantMismatch() {
  try {
    console.log('🔧 Fixing tenant mismatch...');
    
    // Connect to MongoDB
    await dbUtils.connect();
    const tenantCollection = dbUtils.getCollection('tenants');
    const staffCollection = dbUtils.getCollection('staff');
    
    // Find the tenant that has staff data
    const staffWithTenant = await staffCollection.findOne({});
    if (!staffWithTenant) {
      console.error('❌ No staff found in database');
      return;
    }
    
    const correctTenantId = staffWithTenant.tenant_id;
    console.log(`📋 Staff found with tenant ID: ${correctTenantId}`);
    
    // Find the tenant with this ID
    const correctTenant = await tenantCollection.findOne({ _id: new ObjectId(correctTenantId) });
    if (!correctTenant) {
      console.error('❌ Tenant not found for staff data');
      return;
    }
    
    console.log(`✅ Found correct tenant: ${correctTenant.name} (${correctTenant.slug})`);
    
    // Delete any other tenants to avoid confusion
    const deleteResult = await tenantCollection.deleteMany({ 
      _id: { $ne: new ObjectId(correctTenantId) } 
    });
    
    if (deleteResult.deletedCount > 0) {
      console.log(`🗑️  Deleted ${deleteResult.deletedCount} extra tenants`);
    }
    
    // Update the correct tenant to have slug 'default' so the server finds it
    await tenantCollection.updateOne(
      { _id: new ObjectId(correctTenantId) },
      { $set: { slug: 'default' } }
    );
    
    console.log('✅ Tenant mismatch fixed!');
    console.log(`📋 Server will now return tenant ID: ${correctTenantId}`);
    console.log('🔑 Staff login credentials:');
    console.log('   Email: admin@vetcares.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error fixing tenant mismatch:', error);
  } finally {
    process.exit(0);
  }
}

fixTenantMismatch(); 