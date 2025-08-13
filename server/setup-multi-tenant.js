#!/usr/bin/env node

/**
 * Multi-Tenant Setup Script for Local Development
 * 
 * This script creates multiple clinic tenants with proper subdomain configuration
 * for testing the multi-tenant system.
 */

import { MongoClient, ObjectId } from 'mongodb';

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'vet-cares';

const TENANTS = [
  {
    name: "Downtown Animal Hospital",
    slug: "downtown",
    subdomain: "downtown",
    admin: {
      full_name: "Dr. Sarah Johnson",
      email: "admin@downtownvet.com",
      password: "admin123"
    }
  },
  {
    name: "Prestige Pet Clinic",
    slug: "prestige",
    subdomain: "prestige", 
    admin: {
      full_name: "Dr. Michael Chen",
      email: "admin@prestigeclinic.com",
      password: "admin123"
    }
  },
  {
    name: "Sunset Veterinary Care",
    slug: "sunset",
    subdomain: "sunset",
    admin: {
      full_name: "Dr. Emily Rodriguez",
      email: "admin@sunsetvet.com",
      password: "admin123"
    }
  },
  {
    name: "Test Mobile Clinic",
    slug: "test-mobile",
    subdomain: "test-mobile",
    admin: {
      full_name: "Test Admin",
      email: "admin@testmobileclinic.com",
      password: "admin123"
    }
  }
];

async function setupMultiTenant() {
  let client;
  
  try {
    console.log('🏥 Setting up Multi-Tenant System for Local Development');
    console.log('=====================================================\n');

    // Connect to MongoDB
    client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);

    // Clear existing test tenants (optional)
    console.log('🧹 Cleaning up existing test tenants...');
    await db.collection('tenants').deleteMany({
      subdomain: { $in: TENANTS.map(t => t.subdomain) }
    });
    await db.collection('staff').deleteMany({
      email: { $in: TENANTS.map(t => t.admin.email) }
    });

    const createdTenants = [];

    // Create each tenant
    for (const tenantConfig of TENANTS) {
      console.log(`\n🏥 Creating tenant: ${tenantConfig.name}`);
      
      // Create tenant data
      const tenantData = {
        name: tenantConfig.name,
        slug: tenantConfig.slug,
        subdomain: tenantConfig.subdomain,
        status: "active",
        plan: "trial",
        contact_email: tenantConfig.admin.email,
        contact_phone: "+1234567890",
        address: `123 ${tenantConfig.name} Street, Test City, TC 12345`,
        timezone: "UTC",
        currency: "USD",
        language: "en",
        max_storage_gb: 10,
        max_staff: 10,
        max_clients: 1000,
        created_at: new Date(),
        updated_at: new Date(),
        settings: {
          notifications: {
            email: true,
            sms: false,
            push: true
          },
          billing: {
            auto_invoice: false,
            payment_reminders: true
          },
          security: {
            two_factor_auth: false,
            session_timeout: 24
          },
          branding: {
            logo: null,
            favicon: null,
            clinic_name: tenantConfig.name,
            tagline: "Caring for your pets with love and expertise"
          }
        }
      };

      // Insert tenant
      const tenantResult = await db.collection('tenants').insertOne(tenantData);
      const tenantId = tenantResult.insertedId;
      console.log(`✅ Created tenant: ${tenantData.name} (ID: ${tenantId})`);

      // Create admin user
      const adminUser = {
        full_name: tenantConfig.admin.full_name,
        email: tenantConfig.admin.email,
        password: tenantConfig.admin.password,
        role: "admin",
        employee_id: `EMP${tenantConfig.subdomain.toUpperCase()}001`,
        status: "active",
        tenant_id: tenantId,
        permissions: [
          "manage_staff",
          "manage_clients", 
          "manage_pets",
          "manage_appointments",
          "manage_medical_records",
          "manage_vaccinations",
          "manage_billing",
          "manage_inventory",
          "manage_analytics",
          "manage_settings",
          "view_reports",
          "manage_tenants"
        ],
        phone: "+1234567890",
        department: "Management",
        position: "Clinic Director",
        hire_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const staffResult = await db.collection('staff').insertOne(adminUser);
      console.log(`✅ Created admin user: ${adminUser.full_name} (ID: ${staffResult.insertedId})`);

      // Create some test clients
      const testClients = [
        {
          full_name: `${tenantConfig.name} Client 1`,
          email: `client1@${tenantConfig.subdomain}clinic.com`,
          phone: "+1987654321",
          tenant_id: tenantId,
          status: "active",
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          full_name: `${tenantConfig.name} Client 2`,
          email: `client2@${tenantConfig.subdomain}clinic.com`,
          phone: "+1987654322",
          tenant_id: tenantId,
          status: "active",
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      for (const client of testClients) {
        await db.collection('clients').insertOne(client);
      }
      console.log(`✅ Created ${testClients.length} test clients`);

      createdTenants.push({
        ...tenantConfig,
        tenantId,
        adminId: staffResult.insertedId
      });
    }

    console.log('\n🎉 Multi-Tenant System Setup Complete!');
    console.log('─'.repeat(60));
    
    console.log('\n📋 Available Tenants:');
    createdTenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   Subdomain: ${tenant.subdomain}.localhost`);
      console.log(`   Admin Email: ${tenant.admin.email}`);
      console.log(`   Admin Password: ${tenant.admin.password}`);
      console.log(`   Tenant ID: ${tenant.tenantId}`);
      console.log('');
    });

    console.log('🌐 Access URLs:');
    createdTenants.forEach(tenant => {
      console.log(`• ${tenant.name}: http://${tenant.subdomain}.localhost:5173`);
    });

    console.log('\n🔑 Login Credentials:');
    console.log('All tenants use the same admin password: admin123');
    console.log('Each tenant has its own admin email as shown above.');

    console.log('\n📱 Mobile App Testing:');
    console.log('1. Use the mobile app to create link requests to any clinic');
    console.log('2. Login to the respective clinic dashboard to approve requests');
    console.log('3. Test the complete flow from request to approval');

    console.log('\n🧪 Testing Instructions:');
    console.log('1. Open each subdomain URL in your browser');
    console.log('2. Login with the respective admin credentials');
    console.log('3. Navigate to the dashboard to see "Mobile App Link Requests"');
    console.log('4. Create link requests from the mobile app');
    console.log('5. Approve/reject requests through the admin dashboard');

  } catch (error) {
    console.error('❌ Error setting up multi-tenant system:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('✅ MongoDB connection closed');
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

setupMultiTenant().catch(console.error); 