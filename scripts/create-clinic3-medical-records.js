import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'vet-cares';

async function createClinic3MedicalRecords() {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Get pets from clinic3 tenant
    const clinic3Pets = await db.collection('pets').find({
      tenant_id: '68699e87d38c8a7969b19e3f'
    }).toArray();
    
    if (clinic3Pets.length === 0) {
      console.log('No pets found in clinic3 tenant.');
      return;
    }
    
    console.log(`Found ${clinic3Pets.length} pets in clinic3 tenant`);
    
    // Sample medical records with embedded vital data for clinic3
    const sampleRecords = [];
    
    clinic3Pets.forEach(pet => {
      const petId = pet._id;
      const baseDate = new Date('2024-01-01');
      
      // Generate 6 months of sample medical records with vitals
      for (let i = 0; i < 12; i++) { // 12 visits over 6 months
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + (i * 15)); // Every 2 weeks
        
        // Generate realistic vital values with some variation
        const baseWeight = pet.weight || 25; // Default weight if not set
        const weightVariation = (Math.random() - 0.5) * 2; // ±1kg variation
        const weight = Math.max(0.5, baseWeight + weightVariation);
        
        const baseTemp = 38.5; // Normal dog temperature in Celsius
        const tempVariation = (Math.random() - 0.5) * 2; // ±1°C variation
        const temperature = baseTemp + tempVariation;
        
        const baseHR = 80; // Normal heart rate
        const hrVariation = (Math.random() - 0.5) * 40; // ±20 bpm variation
        const heartRate = Math.max(40, Math.min(200, baseHR + hrVariation));
        
        const baseBPSys = 120; // Normal systolic BP
        const bpVariation = (Math.random() - 0.5) * 40; // ±20 mmHg variation
        const bpSystolic = Math.max(80, Math.min(200, baseBPSys + bpVariation));
        const bpDiastolic = Math.max(40, Math.min(120, bpSystolic * 0.6 + (Math.random() - 0.5) * 20));
        
        // Create medical record with embedded vitals
        const record = {
          _id: new ObjectId(),
          pet_id: petId,
          tenant_id: '68699e87d38c8a7969b19e3f', // clinic3 tenant
          visit_date: currentDate,
          subjective: `Owner reports ${pet.name} is doing well. No major concerns noted.`,
          objective: `Physical examination findings:
- Weight: ${weight.toFixed(1)} kg
- Temperature: ${temperature.toFixed(1)}°C
- Heart rate: ${heartRate} bpm
- Blood pressure: ${bpSystolic}/${bpDiastolic} mmHg
- Mucous membranes: Pink and moist
- Capillary refill time: <2 seconds
- Hydration: Good
- Body condition score: 5/9`,
          assessment: `Healthy ${pet.species || 'pet'}. All vital signs within normal limits.`,
          plan: `Continue current diet and exercise routine. Monitor weight: ${weight.toFixed(1)} kg. Schedule follow-up in 2 weeks.`,
          veterinarian: 'Dr. Smith',
          created_at: currentDate,
          updated_at: currentDate
        };
        
        sampleRecords.push(record);
      }
    });
    
    // Insert sample medical records
    if (sampleRecords.length > 0) {
      const result = await db.collection('medical_records').insertMany(sampleRecords);
      console.log(`Inserted ${result.insertedCount} medical records with vital data for clinic3 pets`);
    }
    
    // Verify the data
    const clinic3Records = await db.collection('medical_records').countDocuments({
      tenant_id: '68699e87d38c8a7969b19e3f'
    });
    console.log(`Total medical records in clinic3: ${clinic3Records}`);
    
    // Show sample queries
    if (clinic3Pets.length > 0) {
      console.log('\nSample queries you can test:');
      console.log('1. Get weight data from medical records:');
      console.log(`   GET /api/pets/${clinic3Pets[0]._id}/vitals?metric=weight&start_date=2024-01-01&end_date=2024-06-30&tenant_id=68699e87d38c8a7969b19e3f`);
      
      console.log('\n2. Get temperature data with daily aggregation:');
      console.log(`   GET /api/pets/${clinic3Pets[0]._id}/vitals?metric=temperature&resolution=day&start_date=2024-01-01&end_date=2024-06-30&tenant_id=68699e87d38c8a7969b19e3f`);
      
      console.log('\n3. Get heart rate data with weekly aggregation:');
      console.log(`   GET /api/pets/${clinic3Pets[0]._id}/vitals?metric=heart_rate&resolution=week&start_date=2024-01-01&end_date=2024-06-30&tenant_id=68699e87d38c8a7969b19e3f`);
      
      console.log('\n4. Get blood pressure data with monthly aggregation:');
      console.log(`   GET /api/pets/${clinic3Pets[0]._id}/vitals?metric=blood_pressure&resolution=month&start_date=2024-01-01&end_date=2024-06-30&tenant_id=68699e87d38c8a7969b19e3f`);
    }
    
  } catch (error) {
    console.error('Error creating clinic3 medical records:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the script
createClinic3MedicalRecords().catch(console.error); 