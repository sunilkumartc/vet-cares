// Check Tenants Script
// This script lists all tenants in the database

import { dbUtils } from '../src/api/mongodb.js';

async function checkTenants() {
  try {
    console.log('🔍 Checking tenants in database...');
    
    // Connect to MongoDB
    await dbUtils.connect();
    const tenantCollection = dbUtils.getCollection('tenants');
    
    // Get all tenants
    const tenants = await tenantCollection.find({}).toArray();
    
    console.log(`📋 Found ${tenants.length} tenants:`);
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ID: ${tenant._id}`);
      console.log(`   Slug: ${tenant.slug}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Domain: ${tenant.domain}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking tenants:', error);
  } finally {
    process.exit(0);
  }
}

checkTenants(); 