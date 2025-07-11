#!/usr/bin/env node

/**
 * Subdomain Management Script
 * 
 * This script helps manage subdomains for existing tenants
 * and provides utilities for DNS configuration.
 */

import { MongoClient } from 'mongodb';
import readline from 'readline';
import { ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

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

async function listAllTenants(client) {
  const db = client.db();
  const tenants = await db.collection('tenants').find({}).toArray();
  
  console.log('\n📋 All Tenants:');
  console.log('─'.repeat(80));
  console.log('ID'.padEnd(24) + 'Name'.padEnd(30) + 'Subdomain'.padEnd(20) + 'Status');
  console.log('─'.repeat(80));
  
  tenants.forEach(tenant => {
    const id = tenant._id.toString().padEnd(24);
    const name = (tenant.name || 'N/A').padEnd(30);
    const subdomain = (tenant.subdomain || 'N/A').padEnd(20);
    const status = tenant.status || 'N/A';
    console.log(`${id}${name}${subdomain}${status}`);
  });
  
  return tenants;
}

async function updateTenantSubdomain(client, tenantId, newSubdomain) {
  const db = client.db();
  
  // Check if subdomain is already taken
  const existing = await db.collection('tenants').findOne({ 
    subdomain: newSubdomain,
    _id: { $ne: new ObjectId(tenantId) }
  });
  
  if (existing) {
    throw new Error(`Subdomain '${newSubdomain}' is already taken by tenant: ${existing.name}`);
  }
  
  // Update tenant
  const result = await db.collection('tenants').updateOne(
    { _id: new ObjectId(tenantId) },
    { 
      $set: { 
        subdomain: newSubdomain,
        domain: `${newSubdomain}.vetvault.in`,
        updated_date: new Date()
      }
    }
  );
  
  if (result.matchedCount === 0) {
    throw new Error(`Tenant with ID ${tenantId} not found`);
  }
  
  return result;
}

async function generateDNSRecords(tenants) {
  console.log('\n🌐 DNS Configuration Records:');
  console.log('─'.repeat(80));
  
  // Wildcard record for all subdomains
  console.log('Wildcard Record (Required for new clinics):');
  console.log('Type: A');
  console.log('Name: *');
  console.log('Value: [Your Vercel Frontend IP/URL]');
  console.log('TTL: 300');
  console.log('');
  
  // Specific records for main domains
  console.log('Main Domain Records:');
  console.log('Type: A');
  console.log('Name: app');
  console.log('Value: [Vercel Frontend URL]');
  console.log('TTL: 300');
  console.log('');
  console.log('Type: A');
  console.log('Name: api');
  console.log('Value: [Backend Server IP/URL]');
  console.log('TTL: 300');
  console.log('');
  
  // Individual tenant records (optional, for explicit control)
  console.log('Individual Tenant Records (Optional):');
  tenants.forEach(tenant => {
    if (tenant.subdomain && tenant.subdomain !== 'app' && tenant.subdomain !== 'api') {
      console.log(`Type: A`);
      console.log(`Name: ${tenant.subdomain}`);
      console.log(`Value: [Vercel Frontend IP/URL]`);
      console.log(`TTL: 300`);
      console.log('');
    }
  });
}

async function validateSubdomain(subdomain) {
  if (!subdomain) return 'Subdomain is required';
  if (subdomain.length < 3) return 'Subdomain must be at least 3 characters';
  if (subdomain.length > 63) return 'Subdomain must be less than 63 characters';
  if (!/^[a-z0-9-]+$/.test(subdomain)) return 'Subdomain can only contain lowercase letters, numbers, and hyphens';
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) return 'Subdomain cannot start or end with a hyphen';
  if (['www', 'api', 'app', 'admin', 'mail', 'ftp', 'smtp', 'pop', 'imap'].includes(subdomain)) {
    return 'Subdomain is reserved and cannot be used';
  }
  return null;
}

async function main() {
  console.log('🔧 VetVault Subdomain Management Tool\n');
  
  const client = await connectToDatabase();
  
  try {
    while (true) {
      console.log('\nOptions:');
      console.log('1. List all tenants and their subdomains');
      console.log('2. Update tenant subdomain');
      console.log('3. Generate DNS configuration');
      console.log('4. Validate subdomain format');
      console.log('5. Exit');
      
      const choice = await question('\nSelect an option (1-5): ');
      
      switch (choice) {
        case '1':
          await listAllTenants(client);
          break;
          
        case '2':
          const tenants = await listAllTenants(client);
          const tenantId = await question('\nEnter tenant ID to update: ');
          const newSubdomain = await question('Enter new subdomain: ');
          
          const validationError = await validateSubdomain(newSubdomain);
          if (validationError) {
            console.log(`❌ Validation error: ${validationError}`);
            break;
          }
          
          try {
            await updateTenantSubdomain(client, tenantId, newSubdomain);
            console.log(`✅ Subdomain updated to: ${newSubdomain}.vetvault.in`);
          } catch (error) {
            console.log(`❌ Error: ${error.message}`);
          }
          break;
          
        case '3':
          const allTenants = await listAllTenants(client);
          await generateDNSRecords(allTenants);
          break;
          
        case '4':
          const testSubdomain = await question('Enter subdomain to validate: ');
          const error = await validateSubdomain(testSubdomain);
          if (error) {
            console.log(`❌ ${error}`);
          } else {
            console.log(`✅ Subdomain '${testSubdomain}' is valid`);
            console.log(`   Full URL: https://${testSubdomain}.vetvault.in`);
          }
          break;
          
        case '5':
          console.log('👋 Goodbye!');
          process.exit(0);
          break;
          
        default:
          console.log('❌ Invalid option. Please select 1-5.');
      }
    }
  } finally {
    await client.close();
    rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

main().catch(console.error); 