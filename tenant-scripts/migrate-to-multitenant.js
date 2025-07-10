// Migration Script: Convert Single-Tenant to Multi-Tenant
// This script adds tenant_id fields to all existing collections

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/petclinic';
const DEFAULT_TENANT_ID = 'default-tenant-id';

async function migrateToMultiTenant() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Step 1: Create default tenant
    console.log('Creating default tenant...');
    const defaultTenant = {
      _id: DEFAULT_TENANT_ID,
      name: 'Default Pet Clinic',
      slug: 'default',
      domain: null,
      theme_json: JSON.stringify({
        colors: {
          primary: '#3B82F6',
          secondary: '#6B7280',
          accent: '#10B981',
          background: '#F9FAFB',
          surface: '#FFFFFF',
          text: '#1F2937',
          textSecondary: '#6B7280'
        },
        branding: {
          logo: null,
          favicon: null,
          clinicName: 'Default Pet Clinic',
          tagline: 'Caring for your pets with love and expertise'
        },
        features: {
          appointments: true,
          billing: true,
          inventory: true,
          analytics: true,
          staffManagement: true,
          clientPortal: true
        }
      }),
      features_json: JSON.stringify({
        appointments: true,
        billing: true,
        inventory: true,
        analytics: true,
        staffManagement: true,
        clientPortal: true
      }),
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        language: 'en',
        business_hours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
          wednesday: { open: '09:00', close: '17:00' },
          thursday: { open: '09:00', close: '17:00' },
          friday: { open: '09:00', close: '17:00' },
          saturday: { open: '09:00', close: '15:00' },
          sunday: { open: null, close: null }
        },
        contact_info: {
          phone: '',
          email: '',
          address: ''
        }
      }
    };
    
    await db.collection('tenants').insertOne(defaultTenant);
    console.log('Default tenant created');
    
    // Step 2: Add tenant_id to all collections
    const collections = [
      'clients',
      'pets', 
      'appointments',
      'medical_records',
      'vaccinations',
      'staff',
      'products',
      'invoices',
      'services',
      'vaccines',
      'memos',
      'product_batches',
      'sales',
      'missed_sales',
      'stock_movements',
      'diagnostic_reports',
      'report_templates'
    ];
    
    for (const collectionName of collections) {
      console.log(`Migrating ${collectionName} collection...`);
      
      const collection = db.collection(collectionName);
      
      // Check if collection exists
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        console.log(`Collection ${collectionName} does not exist, skipping...`);
        continue;
      }
      
      // Add tenant_id field to all documents
      const result = await collection.updateMany(
        { tenant_id: { $exists: false } },
        { $set: { tenant_id: DEFAULT_TENANT_ID } }
      );
      
      console.log(`Updated ${result.modifiedCount} documents in ${collectionName}`);
    }
    
    // Step 3: Create indexes for tenant_id fields
    console.log('Creating indexes...');
    
    const indexConfigs = [
      { collection: 'tenants', indexes: [
        { key: { slug: 1 }, options: { unique: true } },
        { key: { domain: 1 }, options: {} }
      ]},
      { collection: 'clients', indexes: [
        { key: { tenant_id: 1 }, options: {} },
        { key: { tenant_id: 1, email: 1 }, options: {} }
      ]},
      { collection: 'pets', indexes: [
        { key: { tenant_id: 1 }, options: {} },
        { key: { tenant_id: 1, client_id: 1 }, options: {} }
      ]},
      { collection: 'appointments', indexes: [
        { key: { tenant_id: 1 }, options: {} },
        { key: { tenant_id: 1, appointment_date: 1 }, options: {} },
        { key: { tenant_id: 1, pet_id: 1 }, options: {} }
      ]},
      { collection: 'medical_records', indexes: [
        { key: { tenant_id: 1 }, options: {} },
        { key: { tenant_id: 1, pet_id: 1 }, options: {} }
      ]},
      { collection: 'staff', indexes: [
        { key: { tenant_id: 1 }, options: {} },
        { key: { tenant_id: 1, email: 1 }, options: {} }
      ]},
      { collection: 'products', indexes: [
        { key: { tenant_id: 1 }, options: {} },
        { key: { tenant_id: 1, sku: 1 }, options: {} }
      ]},
      { collection: 'invoices', indexes: [
        { key: { tenant_id: 1 }, options: {} },
        { key: { tenant_id: 1, client_id: 1 }, options: {} }
      ]}
    ];
    
    for (const config of indexConfigs) {
      const collection = db.collection(config.collection);
      
      for (const index of config.indexes) {
        try {
          await collection.createIndex(index.key, index.options);
          console.log(`Created index on ${config.collection}: ${JSON.stringify(index.key)}`);
        } catch (error) {
          console.log(`Index already exists on ${config.collection}: ${JSON.stringify(index.key)}`);
        }
      }
    }
    
    // Step 4: Update existing staff to have tenant context
    console.log('Updating staff permissions...');
    const staffCollection = db.collection('staff');
    
    await staffCollection.updateMany(
      { tenant_id: DEFAULT_TENANT_ID },
      { 
        $set: { 
          permissions: ['all_access'],
          role: 'admin'
        }
      }
    );
    
    console.log('Migration completed successfully!');
    
    // Step 5: Print summary
    console.log('\n=== Migration Summary ===');
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments({ tenant_id: DEFAULT_TENANT_ID });
      console.log(`${collectionName}: ${count} documents migrated`);
    }
    
    console.log('\nDefault tenant created with ID:', DEFAULT_TENANT_ID);
    console.log('All existing data has been assigned to the default tenant');
    console.log('You can now create additional tenants through the admin interface');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateToMultiTenant()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToMultiTenant }; 