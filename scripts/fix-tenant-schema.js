#!/usr/bin/env node

/**
 * Fix Tenant Schema Script
 * 
 * This script adds missing fields to tenant records
 * to ensure compatibility with the frontend.
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

async function fixTenantSchema() {
  console.log('🔧 Fixing Tenant Schema');
  console.log('=======================\n');

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const tenants = await db.collection('tenants').find({}).toArray();
    
    console.log(`📋 Found ${tenants.length} tenants to update:\n`);
    
    for (const tenant of tenants) {
      console.log(`🔍 Processing: ${tenant.name} (${tenant.subdomain})`);
      
      const updates = {};
      let needsUpdate = false;
      
      // Check and add missing fields
      if (!tenant.created_date && tenant.created_at) {
        updates.created_date = new Date(tenant.created_at);
        needsUpdate = true;
        console.log(`   ✅ Adding created_date: ${updates.created_date}`);
      }
      
      if (!tenant.updated_date) {
        updates.updated_date = new Date();
        needsUpdate = true;
        console.log(`   ✅ Adding updated_date: ${updates.updated_date}`);
      }
      
      if (!tenant.email) {
        updates.email = `${tenant.subdomain}@vetvault.in`;
        needsUpdate = true;
        console.log(`   ✅ Adding email: ${updates.email}`);
      }
      
      if (!tenant.owner) {
        updates.owner = {
          name: tenant.name.split(' ')[0] || 'Admin',
          email: updates.email || `${tenant.subdomain}@vetvault.in`,
          phone: '+1234567890'
        };
        needsUpdate = true;
        console.log(`   ✅ Adding owner: ${updates.owner.name}`);
      }
      
      if (!tenant.address) {
        updates.address = '123 Main Street, City, State 12345';
        needsUpdate = true;
        console.log(`   ✅ Adding address: ${updates.address}`);
      }
      
      if (!tenant.settings) {
        updates.settings = {
          timezone: 'UTC',
          currency: 'USD',
          language: 'en'
        };
        needsUpdate = true;
        console.log(`   ✅ Adding settings`);
      }
      
      if (!tenant.limits) {
        updates.limits = {
          max_staff: 10,
          max_clients: 1000,
          max_storage_gb: 10
        };
        needsUpdate = true;
        console.log(`   ✅ Adding limits`);
      }
      
      if (!tenant.plan) {
        updates.plan = 'trial';
        needsUpdate = true;
        console.log(`   ✅ Adding plan: ${updates.plan}`);
      }
      
      if (!tenant.trial_ends_at) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14); // 14 days from now
        updates.trial_ends_at = trialEnd;
        needsUpdate = true;
        console.log(`   ✅ Adding trial_ends_at: ${updates.trial_ends_at}`);
      }
      
      if (!tenant.status) {
        updates.status = 'active';
        needsUpdate = true;
        console.log(`   ✅ Adding status: ${updates.status}`);
      }
      
      // Update the tenant if needed
      if (needsUpdate) {
        const result = await db.collection('tenants').updateOne(
          { _id: tenant._id },
          { $set: updates }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`   ✅ Successfully updated tenant`);
        } else {
          console.log(`   ❌ Failed to update tenant`);
        }
      } else {
        console.log(`   ℹ️  No updates needed`);
      }
      
      console.log('');
    }
    
    console.log('🎯 Testing Updated Tenants:\n');
    
    // Test both tenants after updates
    const testCases = [
      { subdomain: 'ravipetclinic', name: 'Dr Ravis Pet Clinic' },
      { subdomain: 'prestigeclinic', name: 'Prestige Pet Clinic' }
    ];
    
    for (const testCase of testCases) {
      console.log(`🔍 Testing ${testCase.subdomain}.vetvault.in:`);
      
      try {
        const response = await fetch(`https://api.vetvault.in/api/tenant/current`, {
          headers: {
            'Host': `${testCase.subdomain}.vetvault.in`
          }
        });
        
        if (response.ok) {
          const tenant = await response.json();
          console.log(`   ✅ Name: ${tenant.name}`);
          console.log(`   ✅ Subdomain: ${tenant.subdomain}`);
          console.log(`   ✅ Status: ${tenant.status}`);
          console.log(`   ✅ Plan: ${tenant.plan || 'N/A'}`);
          console.log(`   ✅ Email: ${tenant.email || 'N/A'}`);
        } else {
          console.log(`   ❌ HTTP Error: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('📋 Summary:');
    console.log('• Added missing fields to tenant records');
    console.log('• Ensured compatibility with frontend expectations');
    console.log('• Both subdomains should now work correctly');
    console.log('');
    console.log('🧪 Next Steps:');
    console.log('1. Clear browser cache');
    console.log('2. Test both subdomains in browser');
    console.log('3. Check if frontend now shows correct tenants');
    
  } catch (error) {
    console.error('❌ Error fixing tenant schema:', error);
  } finally {
    await client.close();
  }
}

// Run the fix
fixTenantSchema().catch(console.error); 