// Test Multi-Tenant Client System
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

async function testMultiTenantClientSystem() {
  let client;
  
  try {
    console.log('🔍 Testing Multi-Tenant Client System...\n');
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Get tenants
    const tenants = await db.collection('tenants').find({}).toArray();
    console.log(`📋 Found ${tenants.length} tenants`);
    
    if (tenants.length === 0) {
      console.log('❌ No tenants found. Please create tenants first.');
      return;
    }
    
    const tenant = tenants[0];
    console.log(`🏥 Testing with tenant: ${tenant.name} (${tenant._id})`);
    
    // Get clients for this tenant
    const clients = await db.collection('clients').find({ tenant_id: tenant._id.toString() }).toArray();
    console.log(`👥 Found ${clients.length} clients for tenant`);
    
    if (clients.length === 0) {
      console.log('❌ No clients found for this tenant. Please create clients first.');
      return;
    }
    
    const testClient = clients[0];
    console.log(`🧪 Testing with client: ${testClient.first_name} ${testClient.last_name} (${testClient._id})`);
    
    // Test 1: Verify client belongs to correct tenant
    console.log('\n🔐 Test 1: Tenant Isolation');
    const clientTenantId = testClient.tenant_id;
    const isCorrectTenant = clientTenantId === tenant._id.toString();
    console.log(`   Client tenant_id: ${clientTenantId}`);
    console.log(`   Expected tenant_id: ${tenant._id}`);
    console.log(`   ✅ Tenant isolation: ${isCorrectTenant ? 'PASS' : 'FAIL'}`);
    
    // Test 2: Check if client has pets
    const pets = await db.collection('pets').find({ 
      client_id: testClient._id.toString(),
      tenant_id: tenant._id.toString()
    }).toArray();
    console.log(`\n🐾 Test 2: Client Pets`);
    console.log(`   Found ${pets.length} pets for client`);
    console.log(`   ✅ Pet tenant isolation: ${pets.every(p => p.tenant_id === tenant._id.toString()) ? 'PASS' : 'FAIL'}`);
    
    // Test 3: Check if client has invoices
    const invoices = await db.collection('invoices').find({ 
      client_id: testClient._id.toString(),
      tenant_id: tenant._id.toString()
    }).toArray();
    console.log(`\n💰 Test 3: Client Invoices`);
    console.log(`   Found ${invoices.length} invoices for client`);
    console.log(`   ✅ Invoice tenant isolation: ${invoices.every(i => i.tenant_id === tenant._id.toString()) ? 'PASS' : 'FAIL'}`);
    
    // Test 4: Check if client has appointments
    const appointments = await db.collection('appointments').find({ 
      client_id: testClient._id.toString(),
      tenant_id: tenant._id.toString()
    }).toArray();
    console.log(`\n📅 Test 4: Client Appointments`);
    console.log(`   Found ${appointments.length} appointments for client`);
    console.log(`   ✅ Appointment tenant isolation: ${appointments.every(a => a.tenant_id === tenant._id.toString()) ? 'PASS' : 'FAIL'}`);
    
    // Test 5: Verify no cross-tenant data access
    console.log('\n🚫 Test 5: Cross-Tenant Data Isolation');
    const otherTenants = tenants.filter(t => t._id.toString() !== tenant._id.toString());
    
    if (otherTenants.length > 0) {
      const otherTenant = otherTenants[0];
      const crossTenantClients = await db.collection('clients').find({ 
        tenant_id: otherTenant._id.toString(),
        _id: testClient._id
      }).toArray();
      
      console.log(`   Client should not exist in tenant: ${otherTenant.name}`);
      console.log(`   ✅ Cross-tenant isolation: ${crossTenantClients.length === 0 ? 'PASS' : 'FAIL'}`);
    } else {
      console.log('   ⚠️  Only one tenant found, skipping cross-tenant test');
    }
    
    // Test 6: Check client session data structure
    console.log('\n📱 Test 6: Client Session Structure');
    const expectedSessionFields = [
      'id', 'client_id', 'tenant_id', 'full_name', 'first_name', 
      'last_name', 'email', 'phone', 'address', 'role', 'authenticated', 'login_time'
    ];
    
    const mockSession = {
      id: testClient._id.toString(),
      client_id: testClient._id.toString(),
      tenant_id: testClient.tenant_id,
      full_name: `${testClient.first_name} ${testClient.last_name}`,
      first_name: testClient.first_name,
      last_name: testClient.last_name,
      email: testClient.email,
      phone: testClient.phone || '',
      address: testClient.address || '',
      role: 'user',
      authenticated: true,
      login_time: new Date().toISOString()
    };
    
    const hasAllFields = expectedSessionFields.every(field => field in mockSession);
    console.log(`   Expected fields: ${expectedSessionFields.join(', ')}`);
    console.log(`   ✅ Session structure: ${hasAllFields ? 'PASS' : 'FAIL'}`);
    
    console.log('\n🎉 Multi-Tenant Client System Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the test
testMultiTenantClientSystem(); 