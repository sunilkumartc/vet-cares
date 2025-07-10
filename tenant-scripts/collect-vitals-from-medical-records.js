import { MongoClient } from 'mongodb';

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'vet-cares';

// Vitals extraction patterns
const VITAL_PATTERNS = {
  weight: /weight[:\s]*(\d+\.?\d*)\s*kg/i,
  temperature: /temperature[:\s]*(\d+\.?\d*)\s*°?c/i,
  heart_rate: /heart\s*rate[:\s]*(\d+\.?\d*)\s*bpm/i,
  blood_pressure: /blood\s*pressure[:\s]*(\d+\.?\d*)\/(\d+\.?\d*)\s*mmhg/i
};

async function connectToMongo() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(DB_NAME);
}

async function extractVitalsFromText(text) {
  const vitals = {};
  
  // Extract weight
  const weightMatch = text.match(VITAL_PATTERNS.weight);
  if (weightMatch) {
    vitals.weight = parseFloat(weightMatch[1]);
  }
  
  // Extract temperature
  const tempMatch = text.match(VITAL_PATTERNS.temperature);
  if (tempMatch) {
    vitals.temperature = parseFloat(tempMatch[1]);
  }
  
  // Extract heart rate
  const hrMatch = text.match(VITAL_PATTERNS.heart_rate);
  if (hrMatch) {
    vitals.heart_rate = parseFloat(hrMatch[1]);
  }
  
  // Extract blood pressure
  const bpMatch = text.match(VITAL_PATTERNS.blood_pressure);
  if (bpMatch) {
    vitals.blood_pressure = {
      systolic: parseFloat(bpMatch[1]),
      diastolic: parseFloat(bpMatch[2])
    };
  }
  
  return vitals;
}

async function collectVitalsFromMedicalRecords() {
  const db = await connectToMongo();
  
  console.log('🔍 Collecting vitals data from medical records...');
  
  try {
    // Get all medical records
    const medicalRecords = await db.collection('medical_records').find({}).toArray();
    
    console.log(`📊 Found ${medicalRecords.length} medical records`);
    
    const vitalsData = [];
    let totalVitalsFound = 0;
    
    for (const record of medicalRecords) {
      const textFields = [
        record.subjective || '',
        record.objective || '',
        record.assessment || '',
        record.plan || '',
        record.notes || ''
      ].join(' ');
      
      const vitals = await extractVitalsFromText(textFields);
      
      if (Object.keys(vitals).length > 0) {
        vitalsData.push({
          pet_id: record.pet_id,
          tenant_id: record.tenant_id,
          record_date: record.record_date || record.created_date,
          vitals: vitals,
          source_record_id: record._id
        });
        
        totalVitalsFound += Object.keys(vitals).length;
      }
    }
    
    console.log(`✅ Extracted ${vitalsData.length} records with vitals data`);
    console.log(`📈 Total vitals measurements found: ${totalVitalsFound}`);
    
    // Group by tenant
    const tenantStats = {};
    vitalsData.forEach(data => {
      const tenantId = data.tenant_id?.toString() || 'unknown';
      if (!tenantStats[tenantId]) {
        tenantStats[tenantId] = {
          records: 0,
          weight: 0,
          temperature: 0,
          heart_rate: 0,
          blood_pressure: 0
        };
      }
      tenantStats[tenantId].records++;
      if (data.vitals.weight) tenantStats[tenantId].weight++;
      if (data.vitals.temperature) tenantStats[tenantId].temperature++;
      if (data.vitals.heart_rate) tenantStats[tenantId].heart_rate++;
      if (data.vitals.blood_pressure) tenantStats[tenantId].blood_pressure++;
    });
    
    console.log('\n📋 Vitals Data Summary by Tenant:');
    for (const [tenantId, stats] of Object.entries(tenantStats)) {
      console.log(`\nTenant ${tenantId}:`);
      console.log(`  Records with vitals: ${stats.records}`);
      console.log(`  Weight measurements: ${stats.weight}`);
      console.log(`  Temperature measurements: ${stats.temperature}`);
      console.log(`  Heart rate measurements: ${stats.heart_rate}`);
      console.log(`  Blood pressure measurements: ${stats.blood_pressure}`);
    }
    
    return vitalsData;
    
  } catch (error) {
    console.error('❌ Error collecting vitals data:', error);
    throw error;
  }
}

async function generateSampleMedicalRecordsWithVitals() {
  const db = await connectToMongo();
  
  console.log('\n🎯 Generating sample medical records with vitals...');
  
  try {
    // Get all tenants
    const tenants = await db.collection('tenants').find({}).toArray();
    console.log(`📋 Found ${tenants.length} tenants`);
    
    // Get all pets
    const pets = await db.collection('pets').find({}).toArray();
    console.log(`🐕 Found ${pets.length} pets`);
    
    const sampleRecords = [];
    
    for (const tenant of tenants) {
      const tenantPets = pets.filter(pet => pet.tenant_id?.toString() === tenant._id.toString());
      
      if (tenantPets.length === 0) {
        console.log(`⚠️  No pets found for tenant: ${tenant.name}`);
        continue;
      }
      
      console.log(`\n🏥 Generating records for tenant: ${tenant.name} (${tenantPets.length} pets)`);
      
      for (const pet of tenantPets) {
        // Generate 10-20 medical records per pet over the last 6 months
        const numRecords = Math.floor(Math.random() * 11) + 10; // 10-20 records
        
        for (let i = 0; i < numRecords; i++) {
          const recordDate = new Date();
          recordDate.setDate(recordDate.getDate() - Math.floor(Math.random() * 180)); // Random date in last 6 months
          
          // Generate realistic vitals based on pet species
          const isDog = pet.species?.toLowerCase().includes('dog');
          const isCat = pet.species?.toLowerCase().includes('cat');
          
          let baseWeight = 15; // Default base weight
          let baseTemp = 38.5; // Default base temperature
          let baseHR = 80; // Default base heart rate
          let baseSystolic = 120; // Default base systolic
          let baseDiastolic = 80; // Default base diastolic
          
          if (isDog) {
            baseWeight = 20 + Math.random() * 30; // 20-50 kg
            baseTemp = 38.5 + (Math.random() - 0.5) * 2; // 37.5-39.5°C
            baseHR = 70 + Math.random() * 40; // 70-110 bpm
            baseSystolic = 110 + Math.random() * 40; // 110-150 mmHg
            baseDiastolic = 70 + Math.random() * 20; // 70-90 mmHg
          } else if (isCat) {
            baseWeight = 3 + Math.random() * 4; // 3-7 kg
            baseTemp = 38.5 + (Math.random() - 0.5) * 2; // 37.5-39.5°C
            baseHR = 120 + Math.random() * 40; // 120-160 bpm
            baseSystolic = 120 + Math.random() * 30; // 120-150 mmHg
            baseDiastolic = 80 + Math.random() * 20; // 80-100 mmHg
          }
          
          // Add some variation
          const weight = Math.round((baseWeight + (Math.random() - 0.5) * 2) * 10) / 10;
          const temperature = Math.round((baseTemp + (Math.random() - 0.5) * 1) * 10) / 10;
          const heartRate = Math.round(baseHR + (Math.random() - 0.5) * 20);
          const systolic = Math.round(baseSystolic + (Math.random() - 0.5) * 20);
          const diastolic = Math.round(baseDiastolic + (Math.random() - 0.5) * 15);
          
          const medicalRecord = {
            pet_id: pet._id,
            tenant_id: tenant._id,
            record_date: recordDate,
            created_date: recordDate,
            updated_date: recordDate,
            subjective: `Client reports ${pet.name} is doing well. No concerns noted.`,
            objective: `Physical examination findings:
- Weight: ${weight} kg
- Temperature: ${temperature}°C
- Heart rate: ${heartRate} bpm
- Blood pressure: ${systolic}/${diastolic} mmHg
- Mucous membranes: Pink and moist
- Capillary refill time: <2 seconds
- Hydration: Good
- Body condition score: 5/9`,
            assessment: `Healthy ${pet.species || 'pet'}. All vital signs within normal limits.`,
            plan: `Continue current care routine. Schedule follow-up in 6 months.`,
            notes: `Routine wellness examination completed. All vitals recorded.`,
            staff_id: null,
            client_id: pet.client_id
          };
          
          sampleRecords.push(medicalRecord);
        }
      }
    }
    
    console.log(`\n📝 Generated ${sampleRecords.length} sample medical records`);
    
    // Insert the records
    if (sampleRecords.length > 0) {
      const result = await db.collection('medical_records').insertMany(sampleRecords);
      console.log(`✅ Successfully inserted ${result.insertedCount} medical records`);
    }
    
    return sampleRecords;
    
  } catch (error) {
    console.error('❌ Error generating sample records:', error);
    throw error;
  }
}

async function testVitalsAPI() {
  console.log('\n🧪 Testing vitals API endpoints...');
  
  try {
    const db = await connectToMongo();
    
    // Get a sample pet
    const pet = await db.collection('pets').findOne({});
    if (!pet) {
      console.log('❌ No pets found for testing');
      return;
    }
    
    console.log(`🐕 Testing with pet: ${pet.name} (ID: ${pet._id})`);
    
    // Test each vital metric
    const metrics = ['weight', 'temperature', 'heart_rate', 'blood_pressure'];
    
    for (const metric of metrics) {
      console.log(`\n📊 Testing ${metric} endpoint...`);
      
      const url = `http://localhost:3001/api/pets/${pet._id}/vitals?metric=${metric}&resolution=day&start_date=2024-01-01&end_date=2024-12-31`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          console.log(`✅ ${metric}: ${data.data.length} data points`);
          if (data.data.length > 0) {
            console.log(`   Sample data: ${JSON.stringify(data.data[0])}`);
          }
        } else {
          console.log(`❌ ${metric}: ${data.error}`);
        }
      } catch (error) {
        console.log(`❌ ${metric}: API call failed - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

async function main() {
  console.log('🚀 Starting Vitals Data Collection Process...\n');
  
  try {
    // Step 1: Collect existing vitals data
    const existingVitals = await collectVitalsFromMedicalRecords();
    
    // Step 2: Generate sample medical records with vitals
    const sampleRecords = await generateSampleMedicalRecordsWithVitals();
    
    // Step 3: Collect vitals data again (including new records)
    console.log('\n🔄 Re-collecting vitals data after generating sample records...');
    const allVitals = await collectVitalsFromMedicalRecords();
    
    // Step 4: Test the API
    await testVitalsAPI();
    
    console.log('\n🎉 Vitals data collection process completed!');
    console.log(`📊 Total medical records with vitals: ${allVitals.length}`);
    
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  console.log('\n✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
}); 