#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

const sampleSOAPData = [
  {
    pet_id: new ObjectId(),
    tenant_id: new ObjectId(),
    veterinarian: "Dr. Sarah Johnson",
    visit_date: new Date("2025-01-15"),
    subjective: "Owner reports that Max, a 3-year-old Golden Retriever, has been scratching his ears excessively for the past 3 days. Client noticed head shaking and a foul odor from the ears. Patient has no previous history of ear problems.",
    objective: "Physical examination reveals bilateral otitis externa with erythematous ear canals and brownish discharge. Temperature 101.8°F, heart rate 120 bpm, respiratory rate 20 rpm. Patient appears alert and responsive. No other abnormalities detected.",
    assessment: "Probable bacterial otitis externa with possible yeast overgrowth. Differential diagnoses include allergic otitis and foreign body. Rule out underlying allergies or endocrine disease.",
    plan: "Recommend ear cytology to confirm diagnosis. Prescribe OticClean BID for 7 days, followed by Enrofloxacin drops TID for 10 days. Recheck in 2 weeks. Advise owner to keep ears dry and avoid swimming during treatment.",
    vitals: {
      weight_kg: 28.5,
      temperature_c: 38.8,
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
        frequency: "TID",
        duration: "10 days",
        notes: "Apply after cleaning"
      }
    ]
  },
  {
    pet_id: new ObjectId(),
    tenant_id: new ObjectId(),
    veterinarian: "Dr. Michael Chen",
    visit_date: new Date("2025-01-16"),
    subjective: "Luna, a 2-year-old Domestic Shorthair cat, presents with decreased appetite and lethargy for 2 days. Owner reports occasional vomiting and the cat has been hiding more than usual. No known toxin exposure.",
    objective: "Patient appears depressed and dehydrated. Temperature 103.2°F, heart rate 160 bpm, respiratory rate 30 rpm. Abdominal palpation reveals mild discomfort. Mucous membranes pale pink with 2-second CRT. Weight 4.2 kg.",
    assessment: "Suspected gastroenteritis with dehydration. Differential diagnoses include pancreatitis, foreign body obstruction, and infectious disease. Rule out underlying metabolic disease.",
    plan: "Hospitalize for IV fluid therapy and monitoring. Start anti-emetic medication. Recommend blood work and abdominal radiographs. NPO for 24 hours, then gradual diet reintroduction. Discharge with metronidazole and bland diet.",
    vitals: {
      weight_kg: 4.2,
      temperature_c: 39.6,
      heart_rate_bpm: 160,
      respiratory_rate_rpm: 30,
      blood_pressure: "110/70",
      capillary_refill_time_sec: 2.0
    },
    medications: [
      {
        name: "Metronidazole",
        route: "Oral",
        frequency: "BID",
        duration: "7 days",
        notes: "Give with food"
      }
    ]
  },
  {
    pet_id: new ObjectId(),
    tenant_id: new ObjectId(),
    veterinarian: "Dr. Emily Rodriguez",
    visit_date: new Date("2025-01-17"),
    subjective: "Buddy, a 7-year-old German Shepherd, presents with acute lameness in the right hind limb. Owner reports the dog was running in the backyard and suddenly started limping. No known trauma observed.",
    objective: "Patient is non-weight bearing on right hind limb. Palpation reveals pain and swelling in the stifle joint. Cranial drawer test positive. Temperature 101.5°F, heart rate 110 bpm. No other abnormalities detected.",
    assessment: "Probable cranial cruciate ligament rupture based on clinical signs and positive drawer test. Differential diagnoses include meniscal injury and collateral ligament damage. Radiographs recommended to confirm.",
    plan: "Recommend stifle radiographs to assess joint damage. Prescribe carprofen for pain management and strict exercise restriction. Refer to orthopedic surgeon for surgical evaluation. Follow up in 1 week.",
    vitals: {
      weight_kg: 35.0,
      temperature_c: 38.6,
      heart_rate_bpm: 110,
      respiratory_rate_rpm: 18,
      blood_pressure: "130/85",
      capillary_refill_time_sec: 1.5
    },
    medications: [
      {
        name: "Carprofen",
        route: "Oral",
        frequency: "BID",
        duration: "7 days",
        notes: "Give with food, monitor for GI upset"
      }
    ]
  },
  {
    pet_id: new ObjectId(),
    tenant_id: new ObjectId(),
    veterinarian: "Dr. David Thompson",
    visit_date: new Date("2025-01-18"),
    subjective: "Bella, a 1-year-old Persian cat, presents with sneezing and nasal discharge for 1 week. Owner reports the cat has been less active and eating less. No other pets in household showing similar signs.",
    objective: "Patient has serous nasal discharge and occasional sneezing. Temperature 102.1°F, heart rate 140 bpm, respiratory rate 25 rpm. Oral examination reveals mild gingivitis. No other abnormalities detected.",
    assessment: "Suspected upper respiratory infection, likely viral in origin. Differential diagnoses include bacterial rhinitis and allergic rhinitis. Rule out dental disease as contributing factor.",
    plan: "Supportive care with increased humidity and nasal saline drops. Prescribe doxycycline for potential secondary bacterial infection. Monitor appetite and hydration. Recheck in 1 week if not improving.",
    vitals: {
      weight_kg: 3.8,
      temperature_c: 38.9,
      heart_rate_bpm: 140,
      respiratory_rate_rpm: 25,
      blood_pressure: "125/80",
      capillary_refill_time_sec: 1.5
    },
    medications: [
      {
        name: "Doxycycline",
        route: "Oral",
        frequency: "BID",
        duration: "10 days",
        notes: "Give with food to prevent GI upset"
      }
    ]
  },
  {
    pet_id: new ObjectId(),
    tenant_id: new ObjectId(),
    veterinarian: "Dr. Lisa Wang",
    visit_date: new Date("2025-01-19"),
    subjective: "Rocky, a 5-year-old Boxer, presents with increased thirst and urination for 2 weeks. Owner reports the dog is drinking from the toilet and having accidents in the house. Appetite has increased but weight loss noted.",
    objective: "Patient appears thin with poor coat condition. Temperature 100.8°F, heart rate 130 bpm, respiratory rate 22 rpm. Abdominal palpation reveals enlarged liver. Mucous membranes pink with 1.5-second CRT.",
    assessment: "Suspected diabetes mellitus based on clinical signs. Differential diagnoses include Cushing's disease, kidney disease, and hyperthyroidism. Blood work and urinalysis required for confirmation.",
    plan: "Recommend complete blood count, chemistry panel, and urinalysis. Start insulin therapy once diagnosis confirmed. Dietary management with prescription diabetic diet. Monitor blood glucose levels. Recheck in 3 days.",
    vitals: {
      weight_kg: 25.0,
      temperature_c: 38.2,
      heart_rate_bpm: 130,
      respiratory_rate_rpm: 22,
      blood_pressure: "140/90",
      capillary_refill_time_sec: 1.5
    },
    medications: []
  }
];

async function insertSampleData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('medical_records');
    
    // Clear existing sample data
    await collection.deleteMany({ veterinarian: { $in: ["Dr. Sarah Johnson", "Dr. Michael Chen", "Dr. Emily Rodriguez", "Dr. David Thompson", "Dr. Lisa Wang"] } });
    console.log('🧹 Cleared existing sample data');
    
    // Insert sample SOAP records
    const result = await collection.insertMany(sampleSOAPData);
    console.log(`✅ Inserted ${result.insertedCount} sample SOAP records`);
    
    // Display sample data
    console.log('\n📋 Sample SOAP Records Created:');
    sampleSOAPData.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.veterinarian} - ${record.subjective.substring(0, 100)}...`);
    });
    
    console.log('\n🎯 Test the voice input feature:');
    console.log('1. Go to Medical Records > Create New Record');
    console.log('2. Select a pet and fill in basic info');
    console.log('3. Click the microphone button in any SOAP section');
    console.log('4. Speak your notes and see them transcribed');
    console.log('5. Watch for AI suggestions based on similar cases');
    
  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

insertSampleData().catch(console.error); 