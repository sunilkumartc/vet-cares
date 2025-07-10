import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017';
const dbName = 'vet-cares';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const tenants = db.collection('tenants');

    console.log('Fixing tenant subdomains...');

    // Update tenants to have proper subdomains
    const updates = [
      {
        filter: { name: 'Default Clinic' },
        update: { $set: { subdomain: 'default' } }
      },
      {
        filter: { name: 'Test Clinic' },
        update: { $set: { subdomain: 'test' } }
      },
      {
        filter: { name: 'Sunset Veterinary Clinic' },
        update: { $set: { subdomain: 'sunset' } }
      },
      {
        filter: { name: 'Test Veterinary Clinic' },
        update: { $set: { subdomain: 'test-clinic' } }
      }
    ];

    for (const { filter, update } of updates) {
      const result = await tenants.updateOne(filter, update);
      console.log(`Updated ${result.modifiedCount} tenant(s) for filter:`, filter);
    }

    // Show all tenants after update
    const allTenants = await tenants.find({}).toArray();
    console.log('\nAll tenants after update:');
    allTenants.forEach(t => {
      console.log(`- ID: ${t._id.toString()}, Name: ${t.name}, Subdomain: ${t.subdomain}, Domain: ${t.domain}`);
    });

  } catch (error) {
    console.error('Error fixing tenant subdomains:', error);
  } finally {
    await client.close();
  }
}

main(); 