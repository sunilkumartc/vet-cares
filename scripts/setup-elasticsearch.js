#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb';
import { 
  initializeElasticsearch, 
  bulkIndexSOAPNotes, 
  getIndexStats,
  clearIndex 
} from '../src/api/elasticsearch.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'vet-cares';

async function setupElasticsearch() {
  let client;
  try {
    console.log('🔧 Setting up Elasticsearch for SOAP notes...');
    
    // Initialize Elasticsearch index
    await initializeElasticsearch();
    console.log('✅ Elasticsearch index initialized');
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');
    
    // Get all medical records
    const medicalRecordsCollection = db.collection('medical_records');
    const medicalRecords = await medicalRecordsCollection.find({}).toArray();
    
    console.log(`📊 Found ${medicalRecords.length} medical records in MongoDB`);
    
    if (medicalRecords.length === 0) {
      console.log('⚠️  No medical records found. Creating sample data...');
      
      // Create sample SOAP notes for testing
      const sampleRecords = await createSampleSOAPNotes(db);
      console.log(`✅ Created ${sampleRecords.length} sample SOAP records`);
      
      // Index the sample records
      await bulkIndexSOAPNotes(sampleRecords);
    } else {
      // Get pet details for each record
      const recordsWithPets = [];
      for (const record of medicalRecords) {
        if (record.pet_id) {
          const pet = await db.collection("pets").findOne({ _id: new ObjectId(record.pet_id) });
          if (pet) {
            recordsWithPets.push({
              ...record,
              pet: {
                id: pet._id.toString(),
                species: pet.species,
                breed: pet.breed,
                age: pet.age,
                sex: pet.sex,
                name: pet.name
              }
            });
          }
        }
      }
      
      console.log(`📝 Indexing ${recordsWithPets.length} medical records with pet details...`);
      await bulkIndexSOAPNotes(recordsWithPets);
    }
    
    // Get index statistics
    const stats = await getIndexStats();
    if (stats) {
      console.log('📈 Elasticsearch Index Statistics:');
      console.log(`   Total Documents: ${stats.total?.docs?.count || 0}`);
      console.log(`   Index Size: ${Math.round((stats.total?.store?.size_in_bytes || 0) / 1024)} KB`);
    }
    
    console.log('✅ Elasticsearch setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up Elasticsearch:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function createSampleSOAPNotes(db) {
  // Get or create a test pet
  let testPet = await db.collection('pets').findOne({ name: 'Buddy' });
  
  if (!testPet) {
    // Create a test pet if it doesn't exist
    testPet = {
      _id: new ObjectId(),
      name: 'Buddy',
      species: 'Dog',
      breed: 'Labrador',
      age: 3,
      sex: 'Male',
      client_id: new ObjectId(),
      created_date: new Date(),
      updated_date: new Date()
    };
    await db.collection('pets').insertOne(testPet);
  }
  
  // Sample SOAP notes for different scenarios
  const sampleRecords = [
    {
      _id: new ObjectId(),
      pet_id: testPet._id,
      visit_date: new Date().toISOString().split('T')[0],
      subjective: "Owner reports head shaking and scratching at ears for 3 days. Patient has been rubbing ears against furniture and shaking head frequently.",
      objective: "Ear canal erythematous with brown waxy discharge. Temperature 102.1°F, heart rate 120 bpm, respiratory rate 20 rpm. Patient appears uncomfortable during ear examination.",
      assessment: "Probable otitis externa - bacterial, rule out yeast infection. Differential diagnoses include allergic skin disease and parasitic infestation.",
      plan: "Cytology today to confirm diagnosis. Start OticClean BID for 7 days + Enrofloxacin drops 10 days. Recheck in 14 days. Owner instructed to prevent water entry into ears.",
      vitals: {
        weight_kg: 25.5,
        temperature_c: 39.0,
        heart_rate_bpm: 120,
        respiratory_rate_rpm: 20,
        blood_pressure: "120/80",
        capillary_refill_time_sec: 1.5
      },
      medications: [
        {
          name: "OticClean",
          route: "Topical",
          frequency: "BID",
          duration: "7 days",
          notes: "Clean ears before applying medication"
        },
        {
          name: "Enrofloxacin drops",
          route: "Topical",
          frequency: "BID",
          duration: "10 days",
          notes: "Apply to affected ear canal"
        }
      ],
      veterinarian: "Dr. Sharma",
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    },
    {
      _id: new ObjectId(),
      pet_id: testPet._id,
      visit_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
      subjective: "Owner reports decreased appetite and lethargy for 2 days. Patient vomited twice yesterday and has not been eating normally.",
      objective: "Patient appears lethargic and dehydrated. Temperature 103.2°F, heart rate 140 bpm, respiratory rate 25 rpm. Abdominal palpation reveals mild discomfort.",
      assessment: "Acute gastroenteritis, likely dietary indiscretion. Rule out foreign body obstruction and pancreatitis.",
      plan: "Blood work today including CBC and chemistry panel. Start metronidazole 250mg BID for 5 days. Bland diet for 3 days. Recheck in 48 hours if no improvement.",
      vitals: {
        weight_kg: 24.8,
        temperature_c: 39.6,
        heart_rate_bpm: 140,
        respiratory_rate_rpm: 25,
        blood_pressure: "130/85",
        capillary_refill_time_sec: 2.0
      },
      medications: [
        {
          name: "Metronidazole",
          route: "Oral",
          frequency: "BID",
          duration: "5 days",
          notes: "Give with food"
        }
      ],
      veterinarian: "Dr. Sharma",
      created_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: new ObjectId(),
      pet_id: testPet._id,
      visit_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days ago
      subjective: "Owner reports limping on right hind leg for 1 day. Patient was running in the park yesterday and may have injured leg during play.",
      objective: "Right hind limb lameness grade 2/5. Swelling and pain on palpation of right stifle. Temperature 101.5°F, heart rate 110 bpm. No obvious fractures on palpation.",
      assessment: "Acute right stifle injury, likely soft tissue trauma. Differential diagnoses include cruciate ligament injury and meniscal tear.",
      plan: "Radiographs of right stifle today. Rest and restricted activity for 2 weeks. Anti-inflammatory medication for 5 days. Recheck in 1 week.",
      vitals: {
        weight_kg: 25.2,
        temperature_c: 38.6,
        heart_rate_bpm: 110,
        respiratory_rate_rpm: 18,
        blood_pressure: "115/75",
        capillary_refill_time_sec: 1.5
      },
      medications: [
        {
          name: "Rimadyl",
          route: "Oral",
          frequency: "BID",
          duration: "5 days",
          notes: "Give with food, monitor for GI upset"
        }
      ],
      veterinarian: "Dr. Sharma",
      created_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  // Insert sample records
  await db.collection('medical_records').insertMany(sampleRecords);
  
  return sampleRecords.map(record => ({
    ...record,
    pet: {
      id: testPet._id.toString(),
      species: testPet.species,
      breed: testPet.breed,
      age: testPet.age,
      sex: testPet.sex,
      name: testPet.name
    }
  }));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupElasticsearch().then(() => {
    console.log('\n✅ Elasticsearch setup completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
} 