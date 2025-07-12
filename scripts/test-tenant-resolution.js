#!/usr/bin/env node

/**
 * Test Tenant Resolution Script
 * 
 * This script tests tenant resolution for all subdomains
 * and helps identify any caching or routing issues.
 */

import fetch from 'node-fetch';

const API_BASE = 'https://api.vetvault.in';

async function testTenantResolution() {
  console.log('🧪 Testing Tenant Resolution');
  console.log('============================\n');

  const testCases = [
    {
      subdomain: 'ravipetclinic',
      expectedName: 'Dr Ravis Pet Clinic',
      expectedId: '687115d4694ab577c7d74895'
    },
    {
      subdomain: 'prestigeclinic',
      expectedName: 'Prestige Pet Clinic',
      expectedId: '68716cc7905ae278fd32a03c'
    }
  ];

  for (const testCase of testCases) {
    console.log(`🔍 Testing: ${testCase.subdomain}.vetvault.in`);
    console.log(`   Expected: ${testCase.expectedName} (ID: ${testCase.expectedId})`);
    
    try {
      const response = await fetch(`${API_BASE}/api/tenant/current`, {
        headers: {
          'Host': `${testCase.subdomain}.vetvault.in`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        console.log(`   ❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const tenant = await response.json();
      
      console.log(`   ✅ Received: ${tenant.name} (ID: ${tenant._id})`);
      console.log(`   Subdomain: ${tenant.subdomain}`);
      console.log(`   Domain: ${tenant.domain}`);
      console.log(`   Status: ${tenant.status}`);
      
      // Check if it matches expected
      if (tenant._id === testCase.expectedId) {
        console.log(`   🎯 MATCH: Correct tenant returned`);
      } else {
        console.log(`   ⚠️  MISMATCH: Wrong tenant returned`);
        console.log(`      Expected ID: ${testCase.expectedId}`);
        console.log(`      Received ID: ${tenant._id}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('📋 Cache Clearing Instructions:');
  console.log('');
  console.log('If you\'re seeing incorrect tenants in the browser:');
  console.log('');
  console.log('1. Clear browser cache:');
  console.log('   • Chrome: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)');
  console.log('   • Firefox: Ctrl+Shift+Delete');
  console.log('   • Safari: Cmd+Option+E');
  console.log('');
  console.log('2. Hard refresh the page:');
  console.log('   • Windows/Linux: Ctrl+F5');
  console.log('   • Mac: Cmd+Shift+R');
  console.log('');
  console.log('3. Clear localStorage (in browser console):');
  console.log('   localStorage.clear();');
  console.log('');
  console.log('4. Test in incognito/private mode');
  console.log('');
  console.log('5. Check if the issue persists in different browsers');
  console.log('');
  
  console.log('🔧 Frontend Cache Issues:');
  console.log('• The frontend might be caching tenant data in localStorage');
  console.log('• React components might be using stale state');
  console.log('• API client might have caching enabled');
  console.log('');
  
  console.log('💡 Debug Steps:');
  console.log('1. Open browser developer tools (F12)');
  console.log('2. Go to Application/Storage tab');
  console.log('3. Clear all storage for the domain');
  console.log('4. Check Network tab for API calls');
  console.log('5. Look for any cached responses');
}

// Run the test
testTenantResolution().catch(console.error); 