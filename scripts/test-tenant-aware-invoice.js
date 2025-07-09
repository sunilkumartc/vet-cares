#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'vet-cares';

async function testTenantAwareInvoice() {
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('🧪 Testing Tenant-Aware Invoice Sending...');
    
    // Get test tenant
    const tenantsCollection = db.collection('tenants');
    const testTenant = await tenantsCollection.findOne({ name: 'VetVault Test Clinic' });
    
    if (!testTenant) {
      console.log('❌ Test tenant not found. Run setup:test-vaccination first.');
      return;
    }
    
    console.log('✅ Found test tenant:', testTenant.name);
    
    // Get test client
    const clientsCollection = db.collection('clients');
    const testClient = await clientsCollection.findOne({ phone: '+919535339196' });
    
    if (!testClient) {
      console.log('❌ Test client not found. Run setup:test-vaccination first.');
      return;
    }
    
    console.log('✅ Found test client:', testClient.first_name, testClient.last_name);
    
    // Create a test invoice with tenant_id
    const invoicesCollection = db.collection('invoices');
    const testInvoice = {
      _id: new ObjectId(),
      invoice_number: 'TEST-INV-001',
      total_amount: 1500.00,
      status: 'draft',
      client_id: testClient._id,
      tenant_id: testTenant._id,
      created_date: new Date(),
      updated_date: new Date()
    };
    
    // Insert test invoice
    await invoicesCollection.insertOne(testInvoice);
    console.log('✅ Created test invoice:', testInvoice.invoice_number);
    
    // Test the WhatsApp API endpoint directly
    const testPayload = {
      phone: testClient.phone,
      customer_name: `${testClient.first_name} ${testClient.last_name}`,
      amount: testInvoice.total_amount,
      pdf_url: 'https://pub-789907abe82641e3ad3de48abf37b9a8.r2.dev/vetvault/invoices/test-invoice.pdf',
      invoice_id: testInvoice._id.toString(),
      tenant_id: testInvoice.tenant_id.toString()
    };
    
    console.log('\n📤 Testing WhatsApp API with tenant details:');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    // Call the backend API
    const response = await fetch('http://localhost:3001/api/whatsapp/send-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ WhatsApp API call successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ WhatsApp API call failed:');
      console.log('Status:', response.status);
      console.log('Error:', result.error);
    }
    
    // Clean up test invoice
    await invoicesCollection.deleteOne({ _id: testInvoice._id });
    console.log('🧹 Cleaned up test invoice');
    
  } catch (error) {
    console.error('❌ Error testing tenant-aware invoice:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testTenantAwareInvoice().then(() => {
    console.log('\n✅ Tenant-aware invoice test completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
} 