// Test Server Database Connection Script
// This script tests the server's database connection (vet-cares database)

import { MongoClient } from 'mongodb';

async function testServerDb() {
  try {
    console.log('🔍 Testing server database connection...');
    
    // Use the same connection as the server
    const MONGODB_URI = process.env.VITE_MONGODB_URI || 'mongodb://localhost:27017/petclinic';
    const DB_NAME = 'vet-cares';
    
    console.log(`📁 Connecting to database: ${DB_NAME}`);
    console.log(`🔗 URI: ${MONGODB_URI}`);
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB');
    
    // Count all documents
    const staffCollection = db.collection('staff');
    const totalCount = await staffCollection.countDocuments();
    console.log(`📊 Total staff documents in ${DB_NAME}: ${totalCount}`);
    
    // Get all staff records
    const allStaff = await staffCollection.find({}).toArray();
    console.log(`📋 Found ${allStaff.length} staff records:`);
    
    allStaff.forEach((member, index) => {
      console.log(`${index + 1}. ${member.full_name} (${member.email})`);
      console.log(`   Tenant ID: ${member.tenant_id} (type: ${typeof member.tenant_id})`);
      console.log(`   Role: ${member.role}`);
      console.log('');
    });
    
    // Test specific query
    const specificStaff = await staffCollection.find({ 
      tenant_id: '6868ed5cf45835c58a981ce3' 
    }).toArray();
    console.log(`🔍 Staff with tenant_id '6868ed5cf45835c58a981ce3': ${specificStaff.length}`);
    
    // Test ObjectId query
    try {
      const { ObjectId } = await import('mongodb');
      const objectIdStaff = await staffCollection.find({ 
        tenant_id: new ObjectId('6868ed5cf45835c58a981ce3') 
      }).toArray();
      console.log(`🔍 Staff with ObjectId tenant_id: ${objectIdStaff.length}`);
    } catch (e) {
      console.log('❌ ObjectId query failed:', e.message);
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error testing server database connection:', error);
  } finally {
    process.exit(0);
  }
}

testServerDb(); 