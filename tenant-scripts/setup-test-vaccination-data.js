#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'vet-cares';

async function setupTestVaccinationData() {
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('🐾 Setting up test vaccination data...');
    
    // Get or create a test client
    const clientsCollection = db.collection('clients');
    let testClient = await clientsCollection.findOne({ phone: '+919535339196' });
    
    if (!testClient) {
      testClient = {
        _id: new ObjectId(),
        first_name: 'Test',
        last_name: 'Owner',
        phone: '+919535339196',
        email: 'test@example.com',
        created_date: new Date(),
        updated_date: new Date()
      };
      await clientsCollection.insertOne(testClient);
      console.log('✅ Created test client:', testClient.first_name, testClient.last_name);
    } else {
      console.log('✅ Found existing test client:', testClient.first_name, testClient.last_name);
    }
    
    // Get or create a test tenant
    const tenantsCollection = db.collection('tenants');
    let testTenant = await tenantsCollection.findOne({ name: 'VetVault Test Clinic' });
    
    if (!testTenant) {
      testTenant = {
        _id: new ObjectId(),
        name: 'VetVault Test Clinic',
        clinic_name: 'VetVault Test Clinic',
        doctor_name: 'Dr. Ravi Kumar',
        doctorName: 'Dr. Ravi Kumar',
        phone: '+91 8296143115',
        contact_phone: '+91 8296143115',
        slug: 'test-clinic',
        subdomain: 'test-clinic',
        status: 'active',
        created_date: new Date(),
        updated_date: new Date()
      };
      await tenantsCollection.insertOne(testTenant);
      console.log('✅ Created test tenant:', testTenant.name);
    } else {
      console.log('✅ Found existing test tenant:', testTenant.name);
    }
    
    // Test pets with vaccination dates (using current date + offset)
    const today = new Date();
    const testPets = [
      {
        name: "Buddy",
        species: "Dog",
        breed: "Golden Retriever",
        next_vaccination_date: new Date(today.getTime() + (14 * 24 * 60 * 60 * 1000)), // T-14 days
        owner_id: testClient._id,
        owner_phone: testClient.phone,
        tenant_id: testTenant._id,
        created_date: new Date(),
        updated_date: new Date()
      },
      {
        name: "Max",
        species: "Dog", 
        breed: "Labrador",
        next_vaccination_date: new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000)), // T-7 days
        owner_id: testClient._id,
        owner_phone: testClient.phone,
        tenant_id: testTenant._id,
        created_date: new Date(),
        updated_date: new Date()
      },
      {
        name: "Luna",
        species: "Cat",
        breed: "Persian",
        next_vaccination_date: new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000)), // T-3 days
        owner_id: testClient._id,
        owner_phone: testClient.phone,
        tenant_id: testTenant._id,
        created_date: new Date(),
        updated_date: new Date()
      },
      {
        name: "Charlie",
        species: "Dog",
        breed: "Beagle",
        next_vaccination_date: new Date(today.getTime() + (19 * 24 * 60 * 60 * 1000)), // T-19 days (should not trigger)
        owner_id: testClient._id,
        owner_phone: testClient.phone,
        tenant_id: testTenant._id,
        created_date: new Date(),
        updated_date: new Date()
      },
      {
        name: "Bella",
        species: "Cat",
        breed: "Siamese",
        next_vaccination_date: new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)), // Past due (should not trigger)
        owner_id: testClient._id,
        owner_phone: testClient.phone,
        tenant_id: testTenant._id,
        created_date: new Date(),
        updated_date: new Date()
      }
    ];
    
    const petsCollection = db.collection('pets');
    
    // Clear existing test pets
    await petsCollection.deleteMany({ 
      name: { $in: ["Buddy", "Max", "Luna", "Charlie", "Bella"] } 
    });
    console.log('🧹 Cleared existing test pets');
    
    // Insert test pets
    const result = await petsCollection.insertMany(testPets);
    console.log(`✅ Created ${result.insertedCount} test pets`);
    
    // Display test data
    console.log('\n📊 Test Vaccination Data Setup:');
    console.log('================================');
    
    for (const pet of testPets) {
      const daysUntil = Math.ceil((pet.next_vaccination_date - today) / (1000 * 60 * 60 * 24));
      const willTrigger = [14, 7, 3].includes(daysUntil);
      const status = willTrigger ? '✅ WILL TRIGGER' : '❌ WON\'T TRIGGER';
      
      console.log(`${pet.name} (${pet.species}):`);
      console.log(`  Due Date: ${pet.next_vaccination_date.toDateString()}`);
      console.log(`  Days Until: ${daysUntil} days`);
      console.log(`  Status: ${status}`);
      console.log('');
    }
    
    console.log('🎯 To test reminders, run:');
    console.log('   npm run vaccination-reminders');
    console.log('');
    console.log('📱 Expected WhatsApp messages:');
    console.log('   - Buddy: 14-day reminder');
    console.log('   - Max: 7-day reminder'); 
    console.log('   - Luna: 3-day reminder');
    console.log('');
    console.log('❌ No reminders for:');
    console.log('   - Charlie: Too far in future (19 days)');
    console.log('   - Bella: Past due date');
    
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupTestVaccinationData().then(() => {
    console.log('\n✅ Test vaccination data setup completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test data setup failed:', error);
    process.exit(1);
  });
} 