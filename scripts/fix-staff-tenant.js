// Fix Staff Tenant ID Script
// This script deletes existing staff and recreates them with the correct tenant ID

import { dbUtils } from '../src/api/mongodb.js';
import { ObjectId } from 'mongodb';

async function fixStaffTenant() {
  try {
    console.log('🔧 Fixing staff tenant ID...');
    
    // Connect to MongoDB
    await dbUtils.connect();
    const staffCollection = dbUtils.getCollection('staff');
    const tenantCollection = dbUtils.getCollection('tenants');
    
    // Get the correct tenant (the one that the API returns)
    // The API returns tenant ID: 6868ed5cf45835c58a981ce3
    let correctTenant = await tenantCollection.findOne({ _id: new ObjectId('6868ed5cf45835c58a981ce3') });
    if (!correctTenant) {
      // If that tenant doesn't exist, use the first available tenant
      correctTenant = await tenantCollection.findOne({});
      if (!correctTenant) {
        console.error('❌ No tenants found in database');
        return;
      }
      console.log('⚠️  Using first available tenant instead of API tenant');
    }
    
    const correctTenantId = correctTenant._id.toString();
    console.log(`📋 Using correct tenant ID: ${correctTenantId}`);
    
    // Delete all existing staff
    console.log('🗑️  Deleting existing staff...');
    const deleteResult = await staffCollection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} staff records`);
    
    // Recreate admin user
    const adminUser = {
      _id: await dbUtils.generateId(),
      tenant_id: correctTenantId,
      full_name: "Dr. Ravi Kumar",
      email: "admin@petclinic.com",
      password: "admin123",
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
      notes: "Primary administrator and clinic director",
      created_date: new Date(),
      updated_date: new Date()
    };
    
    await staffCollection.insertOne(adminUser);
    console.log('✅ Recreated admin user');
    
    // Recreate additional staff
    const additionalStaff = [
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
    
    for (const staffData of additionalStaff) {
      const staffMember = {
        _id: await dbUtils.generateId(),
        tenant_id: correctTenantId,
        ...staffData,
        created_date: new Date(),
        updated_date: new Date()
      };
      
      await staffCollection.insertOne(staffMember);
      console.log(`✅ Recreated ${staffData.role}: ${staffData.full_name}`);
    }
    
    console.log('\n🎉 Staff tenant ID fix completed successfully!');
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
    
  } catch (error) {
    console.error('❌ Error fixing staff tenant ID:', error);
  } finally {
    process.exit(0);
  }
}

fixStaffTenant(); 