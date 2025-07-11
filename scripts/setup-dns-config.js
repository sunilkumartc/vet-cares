#!/usr/bin/env node

/**
 * DNS Configuration Setup Script
 * 
 * This script helps you set up the correct DNS configuration
 * for your VetVault multi-tenant system.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

async function getDNSConfiguration() {
  console.log('🌐 VetVault DNS Configuration Guide\n');
  
  console.log('Your VetVault system uses the following domain structure:');
  console.log('• Main domain: vetvault.in');
  console.log('• Frontend: app.vetvault.in');
  console.log('• Backend API: api.vetvault.in');
  console.log('• Clinic subdomains: {clinic-name}.vetvault.in\n');
  
  console.log('📋 Required DNS Records:\n');
  
  console.log('1️⃣ Wildcard Record (Required for new clinics):');
  console.log('   Type: A');
  console.log('   Name: *');
  console.log('   Value: [Your Vercel Frontend IP/URL]');
  console.log('   TTL: 300');
  console.log('   Purpose: Allows any subdomain to resolve to your frontend\n');
  
  console.log('2️⃣ Main Domain Records:');
  console.log('   Type: A');
  console.log('   Name: app');
  console.log('   Value: [Vercel Frontend URL]');
  console.log('   TTL: 300');
  console.log('   Purpose: Direct access to main application\n');
  
  console.log('   Type: A');
  console.log('   Name: api');
  console.log('   Value: [Backend Server IP/URL]');
  console.log('   TTL: 300');
  console.log('   Purpose: Direct access to API server\n');
  
  console.log('3️⃣ Root Domain Record:');
  console.log('   Type: A');
  console.log('   Name: @ (or leave empty)');
  console.log('   Value: [Vercel Frontend URL]');
  console.log('   TTL: 300');
  console.log('   Purpose: Redirects vetvault.in to app.vetvault.in\n');
  
  // Get current tenants to show example subdomains
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const tenants = await db.collection('tenants').find({}).limit(5).toArray();
    
    if (tenants.length > 0) {
      console.log('📊 Current Tenant Subdomains:');
      tenants.forEach(tenant => {
        if (tenant.subdomain && tenant.subdomain !== 'app' && tenant.subdomain !== 'api') {
          console.log(`   • ${tenant.subdomain}.vetvault.in → ${tenant.name}`);
        }
      });
      console.log('');
    }
    
    await client.close();
  } catch (error) {
    console.log('⚠️  Could not fetch current tenants from database');
  }
  
  console.log('🔧 DNS Provider Instructions:\n');
  
  console.log('For Cloudflare:');
  console.log('1. Go to your domain dashboard');
  console.log('2. Click on "DNS" tab');
  console.log('3. Add the records listed above');
  console.log('4. Enable "Proxy" for app and api records (orange cloud)');
  console.log('5. Leave wildcard record as "DNS only" (gray cloud)\n');
  
  console.log('For GoDaddy:');
  console.log('1. Go to your domain management');
  console.log('2. Click on "DNS" or "Manage DNS"');
  console.log('3. Add the A records listed above');
  console.log('4. Wait for DNS propagation (can take up to 48 hours)\n');
  
  console.log('For Namecheap:');
  console.log('1. Go to your domain list');
  console.log('2. Click "Manage" next to your domain');
  console.log('3. Go to "Advanced DNS" tab');
  console.log('4. Add the A records listed above\n');
  
  console.log('✅ Testing Your Configuration:\n');
  
  console.log('After setting up DNS, test with these commands:');
  console.log('1. Test wildcard subdomain:');
  console.log('   nslookup test-clinic.vetvault.in');
  console.log('');
  console.log('2. Test main domains:');
  console.log('   nslookup app.vetvault.in');
  console.log('   nslookup api.vetvault.in');
  console.log('');
  console.log('3. Test API connectivity:');
  console.log('   curl -I https://api.vetvault.in/api/health');
  console.log('');
  console.log('4. Test subdomain creation:');
  console.log('   node scripts/test-subdomain-creation.js');
  
  console.log('\n⚠️  Important Notes:');
  console.log('• DNS changes can take up to 48 hours to propagate globally');
  console.log('• Ensure your SSL certificate supports wildcard subdomains');
  console.log('• Test thoroughly before going live with real clinics');
  console.log('• Monitor DNS resolution for any issues');
}

// Run the configuration guide
getDNSConfiguration().catch(console.error); 