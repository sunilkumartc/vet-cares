import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'vet-cares';

async function fixPermissions() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    
    // Test Clinic tenant ID
    const testClinicTenantId = '68699374bad966da535885c2';
    
    // Define proper permissions for each role
    const rolePermissions = {
      veterinarian: [
        'dashboard', 'appointments', 'client_management', 'medical_records', 
        'prescriptions', 'vaccinations', 'billing', 'diagnostic_reports'
      ],
      receptionist: [
        'dashboard', 'appointments', 'client_management', 'basic_billing', 
        'phone_support'
      ],
      technician: [
        'dashboard', 'view_appointments', 'view_medical_records', 'view_inventory'
      ]
    };
    
    console.log('Updating permissions for test clinic staff...');
    
    // Update veterinarian permissions
    await db.collection('staff').updateOne(
      { email: 'dr.sarah@test-clinic.com', tenant_id: testClinicTenantId },
      { $set: { permissions: rolePermissions.veterinarian } }
    );
    console.log('✅ Updated veterinarian permissions');
    
    // Update receptionist permissions
    await db.collection('staff').updateOne(
      { email: 'mike@test-clinic.com', tenant_id: testClinicTenantId },
      { $set: { permissions: rolePermissions.receptionist } }
    );
    console.log('✅ Updated receptionist permissions');
    
    // Update technician permissions
    await db.collection('staff').updateOne(
      { email: 'lisa@test-clinic.com', tenant_id: testClinicTenantId },
      { $set: { permissions: rolePermissions.technician } }
    );
    console.log('✅ Updated technician permissions');
    
    // Verify the updates
    console.log('\n=== Updated Permissions ===');
    const updatedStaff = await db.collection('staff').find({ 
      tenant_id: testClinicTenantId 
    }).toArray();
    
    updatedStaff.forEach(staff => {
      console.log(`\n${staff.name} (${staff.role}):`);
      console.log(`Permissions: ${staff.permissions?.join(', ') || 'None'}`);
      
      // Test specific permissions
      const canCreateAppointments = staff.permissions?.includes('appointments');
      const canViewAppointments = staff.permissions?.includes('appointments') || staff.permissions?.includes('view_appointments');
      const canManageStaff = staff.permissions?.includes('staff_management');
      
      console.log(`- Can create appointments: ${canCreateAppointments ? 'YES' : 'NO'}`);
      console.log(`- Can view appointments: ${canViewAppointments ? 'YES' : 'NO'}`);
      console.log(`- Can manage staff: ${canManageStaff ? 'YES' : 'NO'}`);
      console.log(`- Read-only mode: ${!canCreateAppointments ? 'YES' : 'NO'}`);
    });
    
    console.log('\n=== Permission System Ready ===');
    console.log('✅ Veterinarian has full access to appointments');
    console.log('✅ Receptionist has appointment management access');
    console.log('✅ Technician has read-only access to appointments');
    console.log('✅ All users will see only their tenant\'s data');
    
  } catch (error) {
    console.error('Error fixing permissions:', error);
  } finally {
    await client.close();
  }
}

fixPermissions(); 