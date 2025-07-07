import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017'; // Update if your MongoDB URI is different
const dbName = 'vet-cares'; // Update if your DB name is different

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const tenants = db.collection('tenants');

    // Customize these values as needed
    const subdomain = process.argv[2] || 'clinic2';
    const domain = `${subdomain}.localhost`;
    const name = process.argv[3] || 'Test Clinic 2';

    const tenant = {
      name,
      subdomain,
      domain,
      theme: 'default',
      active: true,
      created_at: new Date(),
    };

    const result = await tenants.insertOne(tenant);
    console.log('Inserted tenant:', result.insertedId, tenant);
  } catch (err) {
    console.error('Error inserting tenant:', err);
  } finally {
    await client.close();
  }
}

main(); 