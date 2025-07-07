// Create Admin User Script
// This script creates an admin user for staff login

import { dbUtils } from '../src/api/mongodb.js';

const ADMIN_USER = {
  full_name: "Dr. Ravi Kumar",
  email: "admin@petclinic.com",
  password: "admin123", // In production, this should be hashed
  role: "admin",
  employee_id: "EMP001",
  status: "active",
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
  phone: "+91-9876543210",
  department: "Management",
  position: "Clinic Director",
  hire_date: new Date("2023-01-01"),
  emergency_contact: {
    name: "Mrs. Ravi Kumar",
    phone: "+91-9876543211",
    relationship: "Spouse"
  },
  address: {
    street: "123 Main Street",
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "400001",
    country: "India"
  },
  qualifications: [
    "BVSc (Bachelor of Veterinary Science)",
    "MVSc (Master of Veterinary Science)",
    "Diploma in Pet Surgery"
  ],
  specializations: [
    "Pet Surgery",
    "Emergency Medicine",
    "Preventive Care"
  ],
  working_hours: {
    monday: { start: "09:00", end: "18:00" },
    tuesday: { start: "09:00", end: "18:00" },
    wednesday: { start: "09:00", end: "18:00" },
    thursday: { start: "09:00", end: "18:00" },
    friday: { start: "09:00", end: "18:00" },
    saturday: { start: "09:00", end: "14:00" },
    sunday: { start: "10:00", end: "12:00" }
  },
  notes: "Primary administrator and clinic director"
};

const ADDITIONAL_STAFF = [
  {
    full_name: "Dr. Priya Sharma",
    email: "priya@petclinic.com",
    password: "vet123",
    role: "veterinarian",
    employee_id: "EMP002",
    status: "active",
    permissions: [
      "manage_clients",
      "manage_pets", 
      "manage_appointments",
      "manage_medical_records",
      "manage_vaccinations",
      "view_reports"
    ],
    phone: "+91-9876543212",
    department: "Veterinary",
    position: "Senior Veterinarian",
    hire_date: new Date("2023-02-01"),
    qualifications: ["BVSc", "MVSc"],
    specializations: ["Internal Medicine", "Dermatology"]
  },
  {
    full_name: "Anita Patel",
    email: "anita@petclinic.com", 
    password: "reception123",
    role: "receptionist",
    employee_id: "EMP003",
    status: "active",
    permissions: [
      "manage_clients",
      "manage_appointments",
      "manage_billing"
    ],
    phone: "+91-9876543213",
    department: "Reception",
    position: "Senior Receptionist",
    hire_date: new Date("2023-03-01")
  },
  {
    full_name: "Rajesh Singh",
    email: "rajesh@petclinic.com",
    password: "tech123", 
    role: "technician",
    employee_id: "EMP004",
    status: "active",
    permissions: [
      "manage_pets",
      "manage_medical_records",
      "manage_inventory"
    ],
    phone: "+91-9876543214",
    department: "Laboratory",
    position: "Lab Technician",
    hire_date: new Date("2023-04-01"),
    qualifications: ["BSc in Veterinary Technology"]
  }
];

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user and staff members...');
    
    // Connect to MongoDB
    await dbUtils.connect();
    const staffCollection = dbUtils.getCollection('staff');
    const tenantCollection = dbUtils.getCollection('tenants');
    
    // Get or create default tenant
    let defaultTenant = await tenantCollection.findOne({ slug: 'default' });
    if (!defaultTenant) {
      defaultTenant = {
        _id: await dbUtils.generateId(),
        slug: 'default',
        name: 'Default Clinic',
        domain: 'localhost',
        status: 'active',
        created_date: new Date(),
        updated_date: new Date()
      };
      await tenantCollection.insertOne(defaultTenant);
      console.log('✅ Created default tenant');
    } else {
      console.log('✅ Using existing default tenant');
    }
    
    const tenantId = defaultTenant._id.toString();
    console.log(`📋 Using tenant ID: ${tenantId}`);
    
    // Check if admin user already exists
    const existingAdmin = await staffCollection.findOne({ 
      email: ADMIN_USER.email.toLowerCase(),
      tenant_id: tenantId
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', existingAdmin.email);
      console.log('   You can login with:');
      console.log('   Email: admin@petclinic.com');
      console.log('   Password: admin123');
      return;
    }
    
    // Create admin user
    const adminUser = {
      _id: await dbUtils.generateId(),
      tenant_id: tenantId,
      ...dbUtils.addTimestamps(ADMIN_USER)
    };
    
    await staffCollection.insertOne(adminUser);
    console.log('✅ Admin user created successfully!');
    console.log('   Email: admin@petclinic.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    
    // Create additional staff members
    console.log('\n👥 Creating additional staff members...');
    
    for (const staffData of ADDITIONAL_STAFF) {
      const existingStaff = await staffCollection.findOne({ 
        email: staffData.email.toLowerCase(),
        tenant_id: tenantId
      });
      
      if (!existingStaff) {
        const staffMember = {
          _id: await dbUtils.generateId(),
          tenant_id: tenantId,
          ...dbUtils.addTimestamps(staffData)
        };
        
        await staffCollection.insertOne(staffMember);
        console.log(`✅ Created ${staffData.role}: ${staffData.full_name}`);
        console.log(`   Email: ${staffData.email}`);
        console.log(`   Password: ${staffData.password}`);
      } else {
        console.log(`⚠️  ${staffData.role} already exists: ${staffData.email}`);
      }
    }
    
    // Create indexes for better performance
    console.log('\n📊 Creating database indexes...');
    await staffCollection.createIndex({ "tenant_id": 1 });
    await staffCollection.createIndex({ "tenant_id": 1, "email": 1 });
    await staffCollection.createIndex({ "tenant_id": 1, "role": 1 });
    await staffCollection.createIndex({ "tenant_id": 1, "status": 1 });
    console.log('✅ Database indexes created');
    
    console.log('\n🎉 Staff setup completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👨‍⚕️  Admin User:');
    console.log('   Email: admin@petclinic.com');
    console.log('   Password: admin123');
    console.log('   Role: admin (full access)');
    console.log('');
    console.log('👩‍⚕️  Veterinarian:');
    console.log('   Email: priya@petclinic.com');
    console.log('   Password: vet123');
    console.log('   Role: veterinarian');
    console.log('');
    console.log('👩‍💼 Receptionist:');
    console.log('   Email: anita@petclinic.com');
    console.log('   Password: reception123');
    console.log('   Role: receptionist');
    console.log('');
    console.log('👨‍🔬 Technician:');
    console.log('   Email: rajesh@petclinic.com');
    console.log('   Password: tech123');
    console.log('   Role: technician');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🔐 Security Note:');
    console.log('   - Change these passwords in production');
    console.log('   - Implement proper password hashing');
    console.log('   - Use environment variables for sensitive data');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminUser();
}

export { createAdminUser }; 