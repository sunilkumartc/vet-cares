import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'vet-cares';

async function createVitalEntries() {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Create vital_entries collection if it doesn't exist
    const collections = await db.listCollections({ name: 'vital_entries' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('vital_entries');
      console.log('Created vital_entries collection');
    }
    
    // Create indexes for performance
    const collection = db.collection('vital_entries');
    
    // Composite index for efficient queries
    await collection.createIndex(
      { pet_id: 1, metric: 1, recorded_at: 1 },
      { background: true }
    );
    
    // Index for tenant isolation
    await collection.createIndex(
      { tenant_id: 1 },
      { background: true }
    );
    
    // Index for date range queries
    await collection.createIndex(
      { recorded_at: 1 },
      { background: true }
    );
    
    console.log('Created indexes for vital_entries collection');
    
    // Get existing pets to create sample data
    const pets = await db.collection('pets').find({}).limit(5).toArray();
    
    if (pets.length === 0) {
      console.log('No pets found. Please create pets first.');
      return;
    }
    
    // Get tenant ID from first pet
    const tenantId = pets[0].tenant_id;
    
    // Create sample vital entries for each pet
    const sampleVitalEntries = [];
    
    pets.forEach(pet => {
      const petId = pet._id;
      const baseDate = new Date('2024-01-01');
      
      // Generate 6 months of sample data
      for (let i = 0; i < 180; i++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + i);
        
        // Skip weekends (simulate clinic visits)
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
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
        
        // Add some seasonal trends
        const daysSinceStart = i;
        const seasonalWeight = Math.sin(daysSinceStart / 30) * 0.5; // Seasonal weight variation
        const finalWeight = weight + seasonalWeight;
        
        // Create vital entries for this date
        const entries = [
          {
            _id: new ObjectId(),
            pet_id: petId,
            tenant_id: tenantId,
            metric: 'weight',
            value: Math.round(finalWeight * 10) / 10, // Round to 1 decimal
            unit: 'kg',
            recorded_at: currentDate,
            created_at: currentDate,
            updated_at: currentDate
          },
          {
            _id: new ObjectId(),
            pet_id: petId,
            tenant_id: tenantId,
            metric: 'temp',
            value: Math.round(temperature * 10) / 10, // Round to 1 decimal
            unit: '°C',
            recorded_at: currentDate,
            created_at: currentDate,
            updated_at: currentDate
          },
          {
            _id: new ObjectId(),
            pet_id: petId,
            tenant_id: tenantId,
            metric: 'hr',
            value: Math.round(heartRate),
            unit: 'bpm',
            recorded_at: currentDate,
            created_at: currentDate,
            updated_at: currentDate
          },
          {
            _id: new ObjectId(),
            pet_id: petId,
            tenant_id: tenantId,
            metric: 'bp_sys',
            value: Math.round(bpSystolic),
            unit: 'mmHg',
            recorded_at: currentDate,
            created_at: currentDate,
            updated_at: currentDate
          },
          {
            _id: new ObjectId(),
            pet_id: petId,
            tenant_id: tenantId,
            metric: 'bp_dia',
            value: Math.round(bpDiastolic),
            unit: 'mmHg',
            recorded_at: currentDate,
            created_at: currentDate,
            updated_at: currentDate
          }
        ];
        
        sampleVitalEntries.push(...entries);
      }
    });
    
    // Insert sample data
    if (sampleVitalEntries.length > 0) {
      const result = await collection.insertMany(sampleVitalEntries);
      console.log(`Inserted ${result.insertedCount} vital entries for ${pets.length} pets`);
    }
    
    // Verify the data
    const totalEntries = await collection.countDocuments();
    console.log(`Total vital entries in collection: ${totalEntries}`);
    
    // Show sample queries
    console.log('\nSample queries you can test:');
    console.log('1. Get weight data for a pet:');
    console.log(`   GET /api/pets/${pets[0]._id}/vitals?metric=weight&from=2024-01-01&to=2024-06-30`);
    
    console.log('\n2. Get temperature data with daily aggregation:');
    console.log(`   GET /api/pets/${pets[0]._id}/vitals?metric=temp&resolution=day&from=2024-01-01&to=2024-06-30`);
    
    console.log('\n3. Get heart rate data with weekly aggregation:');
    console.log(`   GET /api/pets/${pets[0]._id}/vitals?metric=hr&resolution=week&from=2024-01-01&to=2024-06-30`);
    
  } catch (error) {
    console.error('Error creating vital entries:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the migration
createVitalEntries().catch(console.error); 