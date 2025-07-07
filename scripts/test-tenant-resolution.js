import { TenantManager } from '../src/lib/tenant.js';

async function testTenantResolution() {
  console.log('Testing tenant resolution...\n');

  // Test clinic3 subdomain
  console.log('Testing clinic3.localhost:5173...');
  const clinic3Tenant = await TenantManager.resolveTenant('clinic3.localhost:5173');
  console.log('Result:', clinic3Tenant ? {
    id: clinic3Tenant.id,
    name: clinic3Tenant.name,
    subdomain: clinic3Tenant.subdomain
  } : 'No tenant found');

  console.log('\nTesting localhost:5173...');
  const defaultTenant = await TenantManager.resolveTenant('localhost:5173');
  console.log('Result:', defaultTenant ? {
    id: defaultTenant.id,
    name: defaultTenant.name,
    subdomain: defaultTenant.subdomain
  } : 'No tenant found');

  console.log('\nTesting test.localhost:5173...');
  const testTenant = await TenantManager.resolveTenant('test.localhost:5173');
  console.log('Result:', testTenant ? {
    id: testTenant.id,
    name: testTenant.name,
    subdomain: testTenant.subdomain
  } : 'No tenant found');
}

testTenantResolution().catch(console.error); 