#!/usr/bin/env node

/**
 * Create New Clinic Script
 * 
 * This script creates a new clinic with proper subdomain configuration
 * using the current API endpoints.
 */

import readline from 'readline';
import fetch from 'node-fetch';

const API_BASE = 'https://api.vetvault.in';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  // Basic phone validation - allows various formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

function generateSubdomain(clinicName) {
  return clinicName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

async function checkSubdomainAvailability(subdomain) {
  try {
    const response = await fetch(`${API_BASE}/api/public/clinic/${subdomain}`);
    if (response.ok) {
      return false; // Subdomain is taken
    }
    return true; // Subdomain is available
  } catch (error) {
    return true; // Assume available if error (clinic not found)
  }
}

async function createClinic(clinicData) {
  try {
    console.log('\n🏥 Creating new clinic...');
    
    const response = await fetch(`${API_BASE}/api/public/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clinicData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Failed to create clinic: ${error.message}`);
  }
}

async function main() {
  console.log('🏥 VetVault - New Clinic Creation Wizard');
  console.log('========================================\n');

  try {
    // Get clinic information
    const clinicName = await question('Enter clinic name (e.g., "Downtown Animal Hospital"): ');
    if (!clinicName.trim()) {
      throw new Error('Clinic name is required');
    }

    const email = await question('Enter admin email address: ');
    if (!validateEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    const password = await question('Enter admin password (min 8 characters): ');
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const ownerName = await question('Enter owner/administrator name: ');
    if (!ownerName.trim()) {
      throw new Error('Owner name is required');
    }

    const phone = await question('Enter contact phone number: ');
    if (!validatePhone(phone)) {
      throw new Error('Please enter a valid phone number');
    }

    const address = await question('Enter clinic address: ');
    if (!address.trim()) {
      throw new Error('Address is required');
    }

    // Generate subdomain
    const suggestedSubdomain = generateSubdomain(clinicName);
    console.log(`\n📝 Suggested subdomain: ${suggestedSubdomain}`);
    
    const useSuggested = await question('Use suggested subdomain? (Y/n): ');
    let finalSubdomain;
    
    if (useSuggested.toLowerCase() === 'n' || useSuggested.toLowerCase() === 'no') {
      finalSubdomain = await question('Enter custom subdomain: ');
      if (!finalSubdomain.trim()) {
        throw new Error('Subdomain is required');
      }
      // Clean the custom subdomain
      finalSubdomain = generateSubdomain(finalSubdomain);
    } else {
      finalSubdomain = suggestedSubdomain;
    }

    // Check subdomain availability
    console.log(`\n🔍 Checking subdomain availability: ${finalSubdomain}...`);
    const isAvailable = await checkSubdomainAvailability(finalSubdomain);
    if (!isAvailable) {
      throw new Error(`Subdomain '${finalSubdomain}' is already taken. Please choose a different one.`);
    }
    console.log('✅ Subdomain is available!');

    // Show billing plans
    console.log('\n📋 Available Billing Plans:');
    console.log('1. trial - Free 14-day trial (3 staff, 100 clients, 1GB storage)');
    console.log('2. starter - $29/month (5 staff, 500 clients, 5GB storage)');
    console.log('3. professional - $79/month (15 staff, 2000 clients, 20GB storage)');
    console.log('4. enterprise - $199/month (Unlimited staff, Unlimited clients, 100GB storage)');

    const plan = await question('\nSelect billing plan (trial/starter/professional/enterprise) [trial]: ');
    const billingPlan = plan.trim() || 'trial';

    // Validate plan
    const validPlans = ['trial', 'starter', 'professional', 'enterprise'];
    if (!validPlans.includes(billingPlan)) {
      throw new Error(`Invalid plan. Please choose from: ${validPlans.join(', ')}`);
    }

    // Show summary
    console.log('\n📝 Configuration Summary:');
    console.log('─'.repeat(50));
    console.log(`Clinic Name: ${clinicName}`);
    console.log(`Admin Email: ${email}`);
    console.log(`Owner Name: ${ownerName}`);
    console.log(`Phone: ${phone}`);
    console.log(`Address: ${address}`);
    console.log(`Subdomain: ${finalSubdomain}.vetvault.in`);
    console.log(`Billing Plan: ${billingPlan}`);
    console.log('─'.repeat(50));

    const confirm = await question('\nProceed with clinic creation? (Y/n): ');
    if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
      console.log('❌ Clinic creation cancelled.');
      return;
    }

    // Create clinic
    const clinicData = {
      clinicName,
      email,
      password,
      ownerName,
      phone,
      address,
      plan: billingPlan
    };

    const result = await createClinic(clinicData);

    console.log('\n🎉 Clinic created successfully!');
    console.log('─'.repeat(50));
    console.log(`Clinic ID: ${result.tenant.id}`);
    console.log(`Clinic Name: ${result.tenant.name}`);
    console.log(`Subdomain: ${result.tenant.subdomain}.vetvault.in`);
    console.log(`Admin Email: ${email}`);
    console.log(`Admin Password: ${password}`);
    console.log(`Login URL: ${result.login_url}`);
    console.log('─'.repeat(50));

    console.log('\n📋 Next Steps:');
    console.log('1. Visit the login URL to access your clinic');
    console.log('2. Login with the admin credentials above');
    console.log('3. Configure your clinic settings');
    console.log('4. Add staff members and services');
    console.log('5. Start managing your veterinary practice!');

    console.log('\n🔗 Important URLs:');
    console.log(`• Your Clinic: ${result.login_url}`);
    console.log(`• Main App: https://app.vetvault.in`);
    console.log(`• API: https://api.vetvault.in`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

main().catch(console.error); 