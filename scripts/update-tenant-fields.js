#!/usr/bin/env node

/**
 * Update Tenant Fields Script
 * 
 * Simple script to add missing fields to tenant records.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

async function updateTenantFields() {
  console.log('🔧 Updating Tenant Fields');
  console.log('=========================\n');

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Update Dr Ravis Pet Clinic
    console.log('🔍 Updating Dr Ravis Pet Clinic...');
    const result1 = await db.collection('tenants').updateOne(
      { _id: new MongoClient.ObjectId('687115d4694ab577c7d74895') },
      {
        $set: {
          created_date: new Date('2025-07-11T18:54:46.734Z'),
          updated_date: new Date(),
          email: 'ravipetclinic@vetvault.in',
          owner: {
            name: 'Dr Ravi',
            email: 'ravipetclinic@vetvault.in',
            phone: '+1234567890'
          },
          address: '123 Main Street, City, State 12345',
          settings: {
            timezone: 'UTC',
            currency: 'USD',
            language: 'en'
          },
          limits: {
            max_staff: 10,
            max_clients: 1000,
            max_storage_gb: 10
          },
          plan: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        }
      }
    );
    console.log(`   ✅ Updated: ${result1.modifiedCount} document`);
    
    // Update Prestige Pet Clinic
    console.log('🔍 Updating Prestige Pet Clinic...');
    const result2 = await db.collection('tenants').updateOne(
      { _id: new MongoClient.ObjectId('68716cc7905ae278fd32a03c') },
      {
        $set: {
          created_date: new Date('2025-07-11T19:57:59.103Z'),
          updated_date: new Date(),
          email: 'prestigeclinic@vetvault.in',
          owner: {
            name: 'Prestige',
            email: 'prestigeclinic@vetvault.in',
            phone: '+1234567890'
          },
          address: '456 Oak Avenue, City, State 12345',
          settings: {
            timezone: 'UTC',
            currency: 'USD',
            language: 'en'
          },
          limits: {
            max_staff: 10,
            max_clients: 1000,
            max_storage_gb: 10
          },
          plan: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        }
      }
    );
    console.log(`   ✅ Updated: ${result2.modifiedCount} document`);
    
    console.log('\n🎯 Testing Updated Tenants:\n');
    
    // Test both tenants
    const tenants = await db.collection('tenants').find({}).toArray();
    
    for (const tenant of tenants) {
      console.log(`📋 ${tenant.name}:`);
      console.log(`   ID: ${tenant._id}`);
      console.log(`   Subdomain: ${tenant.subdomain}`);
      console.log(`   Email: ${tenant.email || 'N/A'}`);
      console.log(`   Plan: ${tenant.plan || 'N/A'}`);
      console.log(`   Status: ${tenant.status || 'N/A'}`);
      console.log(`   Created: ${tenant.created_date || tenant.created_at || 'N/A'}`);
      console.log('');
    }
    
    console.log('✅ Tenant fields updated successfully!');
    console.log('');
    console.log('🧪 Test the subdomains now:');
    console.log('• ravipetclinic.vetvault.in');
    console.log('• prestigeclinic.vetvault.in');
    
  } catch (error) {
    console.error('❌ Error updating tenant fields:', error);
  } finally {
    await client.close();
  }
}

// Run the update
updateTenantFields().catch(console.error); 