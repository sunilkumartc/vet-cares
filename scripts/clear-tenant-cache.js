#!/usr/bin/env node

/**
 * Clear Tenant Cache Script
 * 
 * This script helps clear tenant caches and fix subdomain resolution issues.
 */

console.log('🧹 Clearing Tenant Cache');
console.log('========================\n');

console.log('🔍 Issue Analysis:');
console.log('• You\'re seeing "Dr Ravis Pet Clinic" when accessing prestigeclinic.vetvault.in');
console.log('• The API is returning the correct tenant (Prestige Pet Clinic)');
console.log('• This suggests a frontend caching issue');
console.log('');

console.log('📋 Cache Locations:');
console.log('1. Browser localStorage');
console.log('2. Browser memory cache');
console.log('3. Frontend in-memory cache (tenantCache)');
console.log('4. React component state');
console.log('');

console.log('🔧 Solutions to Try:');
console.log('');

console.log('1️⃣ Clear Browser Cache:');
console.log('   • Open browser developer tools (F12)');
console.log('   • Go to Application/Storage tab');
console.log('   • Clear all storage for vetvault.in domains');
console.log('   • Or use: localStorage.clear(); in console');
console.log('');

console.log('2️⃣ Hard Refresh:');
console.log('   • Windows/Linux: Ctrl+F5');
console.log('   • Mac: Cmd+Shift+R');
console.log('   • Or hold Shift and click refresh');
console.log('');

console.log('3️⃣ Test in Incognito/Private Mode:');
console.log('   • Open a new incognito/private window');
console.log('   • Navigate to prestigeclinic.vetvault.in');
console.log('   • Check if the correct tenant appears');
console.log('');

console.log('4️⃣ Clear Frontend Cache (if you have access):');
console.log('   • Open browser console on the page');
console.log('   • Run: localStorage.clear();');
console.log('   • Run: sessionStorage.clear();');
console.log('   • Refresh the page');
console.log('');

console.log('5️⃣ Check Network Tab:');
console.log('   • Open developer tools');
console.log('   • Go to Network tab');
console.log('   • Refresh the page');
console.log('   • Look for /api/tenant/current request');
console.log('   • Check if it returns the correct tenant');
console.log('');

console.log('🧪 Test Commands:');
console.log('');

console.log('Test API directly:');
console.log('curl -H "Host: prestigeclinic.vetvault.in" "https://api.vetvault.in/api/tenant/current"');
console.log('');

console.log('Test with cache headers:');
console.log('curl -H "Host: prestigeclinic.vetvault.in" -H "Cache-Control: no-cache" "https://api.vetvault.in/api/tenant/current"');
console.log('');

console.log('Test both subdomains:');
console.log('curl -H "Host: ravipetclinic.vetvault.in" "https://api.vetvault.in/api/tenant/current"');
console.log('curl -H "Host: prestigeclinic.vetvault.in" "https://api.vetvault.in/api/tenant/current"');
console.log('');

console.log('🔍 Debug Steps:');
console.log('');

console.log('1. Open browser console on prestigeclinic.vetvault.in');
console.log('2. Check what tenant is being loaded:');
console.log('   console.log(localStorage.getItem("currentTenant"));');
console.log('3. Clear the cache:');
console.log('   localStorage.clear();');
console.log('4. Refresh the page');
console.log('5. Check the network requests');
console.log('');

console.log('💡 If the issue persists:');
console.log('• The frontend might have a bug in tenant resolution');
console.log('• There might be a race condition in the cache clearing');
console.log('• The React components might be using stale state');
console.log('• Consider adding cache-busting parameters to API calls');
console.log('');

console.log('🎯 Expected Behavior:');
console.log('• ravipetclinic.vetvault.in → Dr Ravis Pet Clinic');
console.log('• prestigeclinic.vetvault.in → Prestige Pet Clinic');
console.log('• Each subdomain should show its respective clinic');
console.log('');

console.log('✅ After clearing cache, both subdomains should work correctly!'); 