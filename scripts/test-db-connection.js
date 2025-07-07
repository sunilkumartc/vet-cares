// Test Database Connection Script
// This script tests the database connection and shows what's in the staff collection

import { dbUtils } from '../src/api/mongodb.js';

async function testDbConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Connect to MongoDB
    await dbUtils.connect();
    const staffCollection = dbUtils.getCollection('staff');
    
    // Test basic connection
    console.log('✅ Connected to MongoDB');
    
    // Count all documents
    const totalCount = await staffCollection.countDocuments();
    console.log(`📊 Total staff documents: ${totalCount}`);
    
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
    
    // Show database name
    const dbName = dbUtils.db.databaseName;
    console.log(`📁 Database name: ${dbName}`);
    
  } catch (error) {
    console.error('❌ Error testing database connection:', error);
  } finally {
    process.exit(0);
  }
}

testDbConnection(); 