const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

// Client authentication configuration
const clientAuthConfig = {
  // Authentication settings
  auth_settings: {
    allow_client_registration: true,
    require_email_verification: false,
    require_phone_verification: false,
    allow_guest_appointments: false,
    session_timeout_hours: 24,
    max_login_attempts: 5,
    lockout_duration_minutes: 30
  },
  
  // Registration settings
  registration_settings: {
    require_full_name: true,
    require_phone: false,
    require_address: false,
    allow_social_login: false,
    welcome_message: "Welcome to our veterinary family! We're excited to care for your pets.",
    terms_of_service: "By creating an account, you agree to our terms of service and privacy policy.",
    privacy_policy_url: "https://ravipetcare.com/privacy",
    terms_url: "https://ravipetcare.com/terms"
  },
  
  // Login customization
  login_customization: {
    login_title: "Welcome Back!",
    login_subtitle: "Sign in to book appointments and manage your pets",
    signup_title: "Join Our Pet Care Family",
    signup_subtitle: "Create account to get started with personalized pet care",
    forgot_password_enabled: true,
    remember_me_enabled: true,
    show_social_login: false
  },
  
  // Client dashboard settings
  dashboard_settings: {
    show_pet_gallery: true,
    show_appointment_history: true,
    show_medical_records: true,
    show_vaccination_reminders: true,
    show_billing_history: true,
    allow_profile_editing: true,
    allow_pet_management: true
  }
};

async function setupClientAuthConfig() {
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
      console.log('No tenant found. Please create a tenant first.');
      return;
    }
    
    console.log(`Setting up client auth config for tenant: ${tenant.name} (${tenant._id})`);
    
    // Update tenant with client auth configuration
    const result = await tenantsCollection.updateOne(
      { _id: tenant._id },
      { 
        $set: {
          ...clientAuthConfig,
          updated_date: new Date()
        }
      }
    );
    
    if (result.matchedCount > 0) {
      console.log('Client authentication configuration updated successfully!');
      console.log('Updated configuration sections:', Object.keys(clientAuthConfig));
    } else {
      console.log('Failed to update client auth configuration');
    }
    
  } catch (error) {
    console.error('Error setting up client auth configuration:', error);
  } finally {
    await client.close();
  }
}

// Run the script
setupClientAuthConfig().catch(console.error); 