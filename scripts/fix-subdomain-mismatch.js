#!/usr/bin/env node

/**
 * Fix Subdomain Mismatch Script
 * 
 * This script helps fix tenants that have incorrect subdomains
 * and ensures they match the expected subdomain from the URL.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function fixSubdomainMismatch() {
  console.log('🔧 Fixing Subdomain Mismatch');
  console.log('============================\n');

  const client = await connectToDatabase();
  
  try {
    const db = client.db();
    const tenants = await db.collection('tenants').find({}).toArray();
    
    console.log(`📋 Found ${tenants.length} tenants in database:\n`);
    
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   Current subdomain: ${tenant.subdomain}`);
      console.log(`   Current domain: ${tenant.domain}`);
      console.log(`   Expected subdomain: ${tenant.slug || tenant.name.toLowerCase().replace(/\s+/g, '-')}`);
      console.log('');
    });
    
    console.log('🔍 Analysis:');
    console.log('• The tenant "Vercel Demo Clinic" has subdomain "vet-cares-4q08epab7-vet-cares"');
    console.log('• But the URL "ravipetclinic.vetvault.in" expects subdomain "ravipetclinic"');
    console.log('• This mismatch causes the tenant resolution to fail');
    console.log('');
    
    console.log('💡 Solutions:');
    console.log('1. Update the tenant subdomain to match the URL');
    console.log('2. Create a new tenant with the correct subdomain');
    console.log('3. Update DNS to point to the correct subdomain');
    console.log('');
    
    // Find the problematic tenant
    const problematicTenant = tenants.find(t => t.subdomain === 'vet-cares-4q08epab7-vet-cares');
    
    if (problematicTenant) {
      console.log('🎯 Found problematic tenant:');
      console.log(`   ID: ${problematicTenant._id}`);
      console.log(`   Name: ${problematicTenant.name}`);
      console.log(`   Current subdomain: ${problematicTenant.subdomain}`);
      console.log(`   Should be: ravipetclinic`);
      console.log('');
      
      console.log('🔧 To fix this, run the following MongoDB command:');
      console.log('');
      console.log(`db.tenants.updateOne(`);
      console.log(`  { _id: ObjectId("${problematicTenant._id}") },`);
      console.log(`  {`);
      console.log(`    $set: {`);
      console.log(`      subdomain: "ravipetclinic",`);
      console.log(`      domain: "ravipetclinic.vetvault.in",`);
      console.log(`      updated_date: new Date()`);
      console.log(`    }`);
      console.log(`  }`);
      console.log(`)`);
      console.log('');
      
      console.log('📝 Or use the management script:');
      console.log('node scripts/manage-subdomains.js');
      console.log('Then choose option 2 to update the subdomain');
      console.log('');
    }
    
    // Check for other potential issues
    const vercelSubdomains = tenants.filter(t => t.subdomain.includes('vercel.app') || t.subdomain.includes('vet-cares-'));
    
    if (vercelSubdomains.length > 0) {
      console.log('⚠️  Found tenants with Vercel-generated subdomains:');
      vercelSubdomains.forEach(tenant => {
        console.log(`   • ${tenant.name}: ${tenant.subdomain}`);
      });
      console.log('');
      console.log('These should be updated to proper clinic subdomains.');
    }
    
    console.log('✅ Analysis complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Update the tenant subdomain in MongoDB');
    console.log('2. Ensure DNS is configured for the new subdomain');
    console.log('3. Test the tenant resolution');
    console.log('4. Update any hardcoded references to the old subdomain');
    
  } catch (error) {
    console.error('❌ Error analyzing tenants:', error);
  } finally {
    await client.close();
  }
}

// Run the analysis
fixSubdomainMismatch().catch(console.error); 