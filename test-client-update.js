const { MongoClient, ObjectId } = require('mongodb');

async function testClientUpdate() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    
    // Check petclinic database specifically
    const db = client.db('petclinic');
    const collections = await db.listCollections().toArray();
    console.log('Collections in petclinic:', collections.map(col => col.name));
    
    // Check each collection for clients
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`${collection.name}: ${count} documents`);
      
      if (count > 0) {
        const sample = await db.collection(collection.name).findOne({});
        console.log(`Sample from ${collection.name}:`, JSON.stringify(sample, null, 2));
        
        // If this is the clients collection, test the ID
        if (collection.name === 'clients' && sample._id) {
          console.log('\nTesting client ID:');
          console.log('_id:', sample._id);
          console.log('_id type:', typeof sample._id);
          console.log('_id toString():', sample._id.toString());
          console.log('id field exists:', 'id' in sample);
          
          // Test ObjectId validation
          const idString = sample._id.toString();
          console.log('Is valid ObjectId:', ObjectId.isValid(idString));
          
          // Test creating new ObjectId
          try {
            const newObjectId = new ObjectId(idString);
            console.log('Successfully created ObjectId:', newObjectId);
          } catch (error) {
            console.log('Error creating ObjectId:', error.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testClientUpdate(); 