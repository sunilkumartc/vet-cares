const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

// Sample clinic profile data
const sampleClinicProfile = {
  clinic_name: "Dr. Ravi's Pet Care Center",
  tagline: "Compassionate Care for Your Beloved Pets",
  address: "No. 32, 4th Temple Street, Malleshwaram, Bengaluru - 560003",
  phone: "+91 82961 43115",
  email: "info@ravipetcare.com",
  website: "www.ravipetcare.com",
  description: "A full-service veterinary clinic providing comprehensive care for dogs, cats, and other pets. We offer vaccinations, surgeries, consultations, and emergency care."
};

async function setupClinicProfile() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const tenantsCollection = db.collection('tenants');
    
    // Get the default tenant (or you can specify a tenant ID)
    const tenant = await tenantsCollection.findOne({ slug: 'default' });
    
    if (!tenant) {
      console.log('Default tenant not found. Please create a tenant first.');
      return;
    }
    
    console.log(`Setting up clinic profile for tenant: ${tenant.name} (${tenant._id})`);
    
    // Check if clinic profile already exists
    const existingTenant = await tenantsCollection.findOne({ 
      _id: tenant._id,
      clinic_name: { $exists: true }
    });
    
    if (existingTenant) {
      console.log(`Tenant ${tenant.name} already has clinic profile data. Skipping...`);
      console.log('Current clinic profile:', {
        clinic_name: existingTenant.clinic_name,
        address: existingTenant.address,
        phone: existingTenant.phone,
        email: existingTenant.email
      });
      return;
    }
    
    // Update tenant with clinic profile data
    const result = await tenantsCollection.updateOne(
      { _id: tenant._id },
      { 
        $set: {
          ...sampleClinicProfile,
          updated_date: new Date()
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      console.log('Tenant not found for update');
      return;
    }
    
    console.log(`Clinic profile updated successfully for tenant ${tenant.name}`);
    console.log('Added clinic profile data:', sampleClinicProfile);
    
  } catch (error) {
    console.error('Error setting up clinic profile:', error);
  } finally {
    await client.close();
  }
}

// Run the script
setupClinicProfile().catch(console.error); 