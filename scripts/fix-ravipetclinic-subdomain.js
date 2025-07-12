#!/usr/bin/env node

/**
 * Fix RaviPetClinic Subdomain Script
 * 
 * This script specifically fixes the ravipetclinic subdomain mismatch.
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

async function fixRaviPetClinicSubdomain() {
  console.log('🔧 Fixing RaviPetClinic Subdomain');
  console.log('==================================\n');

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Find the tenant with the problematic subdomain
    const tenant = await db.collection('tenants').findOne({
      subdomain: 'vet-cares-4q08epab7-vet-cares'
    });
    
    if (!tenant) {
      console.log('❌ Tenant with subdomain "vet-cares-4q08epab7-vet-cares" not found');
      console.log('Available tenants:');
      const allTenants = await db.collection('tenants').find({}).toArray();
      allTenants.forEach(t => {
        console.log(`   • ${t.name}: ${t.subdomain}`);
      });
      return;
    }
    
    console.log('🎯 Found tenant to fix:');
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Name: ${tenant.name}`);
    console.log(`   Current subdomain: ${tenant.subdomain}`);
    console.log(`   Current domain: ${tenant.domain}`);
    console.log('');
    
    // Check if ravipetclinic subdomain is already taken
    const existingRaviPetClinic = await db.collection('tenants').findOne({
      subdomain: 'ravipetclinic'
    });
    
    if (existingRaviPetClinic) {
      console.log('⚠️  Subdomain "ravipetclinic" is already taken by:');
      console.log(`   • ${existingRaviPetClinic.name} (ID: ${existingRaviPetClinic._id})`);
      console.log('');
      console.log('💡 Options:');
      console.log('1. Use a different subdomain (e.g., "ravi-pet-clinic")');
      console.log('2. Update the existing tenant to use a different subdomain');
      console.log('3. Delete the existing tenant if it\'s not needed');
      console.log('');
      
      const newSubdomain = 'ravi-pet-clinic';
      console.log(`🔧 Using alternative subdomain: ${newSubdomain}`);
      
      // Update the tenant
      const result = await db.collection('tenants').updateOne(
        { _id: tenant._id },
        {
          $set: {
            subdomain: newSubdomain,
            domain: `${newSubdomain}.vetvault.in`,
            updated_date: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log('✅ Successfully updated tenant subdomain!');
        console.log(`   New subdomain: ${newSubdomain}`);
        console.log(`   New domain: ${newSubdomain}.vetvault.in`);
        console.log('');
        console.log('🔗 Access your clinic at:');
        console.log(`   https://${newSubdomain}.vetvault.in`);
      } else {
        console.log('❌ Failed to update tenant subdomain');
      }
      
    } else {
      // ravipetclinic is available, use it
      console.log('✅ Subdomain "ravipetclinic" is available');
      console.log('🔧 Updating tenant subdomain...');
      
      const result = await db.collection('tenants').updateOne(
        { _id: tenant._id },
        {
          $set: {
            subdomain: 'ravipetclinic',
            domain: 'ravipetclinic.vetvault.in',
            updated_date: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log('✅ Successfully updated tenant subdomain!');
        console.log('   New subdomain: ravipetclinic');
        console.log('   New domain: ravipetclinic.vetvault.in');
        console.log('');
        console.log('🔗 Access your clinic at:');
        console.log('   https://ravipetclinic.vetvault.in');
        console.log('');
        console.log('🧪 Test the fix:');
        console.log('   curl -H "Host: ravipetclinic.vetvault.in" https://api.vetvault.in/api/tenant/current');
      } else {
        console.log('❌ Failed to update tenant subdomain');
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing subdomain:', error);
  } finally {
    await client.close();
  }
}

// Run the fix
fixRaviPetClinicSubdomain().catch(console.error); 