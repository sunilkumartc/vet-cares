const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

async function checkTenantConfig() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const tenantsCollection = db.collection('tenants');
    
    // Get the default tenant (or first tenant)
    const tenant = await tenantsCollection.findOne({ slug: 'default' }) || 
                   await tenantsCollection.findOne({});
    
    if (!tenant) {
      console.log('No tenant found.');
      return;
    }
    
    console.log(`\n=== Tenant Configuration for: ${tenant.name} ===`);
    console.log('Tenant ID:', tenant._id);
    console.log('Slug:', tenant.slug);
    
    console.log('\n--- Registration Settings ---');
    console.log('require_full_name:', tenant.registration_settings?.require_full_name);
    console.log('require_phone:', tenant.registration_settings?.require_phone);
    console.log('require_address:', tenant.registration_settings?.require_address);
    console.log('allow_client_registration:', tenant.auth_settings?.allow_client_registration);
    
    console.log('\n--- Login Customization ---');
    console.log('login_title:', tenant.login_customization?.login_title);
    console.log('signup_title:', tenant.login_customization?.signup_title);
    
    console.log('\n--- Full Registration Settings Object ---');
    console.log(JSON.stringify(tenant.registration_settings, null, 2));
    
    console.log('\n--- Full Auth Settings Object ---');
    console.log(JSON.stringify(tenant.auth_settings, null, 2));
    
  } catch (error) {
    console.error('Error checking tenant config:', error);
  } finally {
    await client.close();
  }
}

// Run the script
checkTenantConfig().catch(console.error); 