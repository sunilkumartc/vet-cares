import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Test Daily.co JWT token generation
const testDailyTokenGeneration = () => {
  const DAILY_API_KEY = process.env.DAILY_API_KEY;
  
  if (!DAILY_API_KEY) {
    console.error('❌ DAILY_API_KEY not found in environment variables');
    return;
  }

  console.log('✅ DAILY_API_KEY found');

  const roomName = 'test-room-123';
  const userName = 'Test User';
  const tenantId = 'test-tenant-123';
  const staffId = 'test-staff-456';
  const meetingId = 'test-meeting-789';
  
  // Token expiry settings
  const exp = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour from now
  const nbf = Math.floor(Date.now() / 1000); // Now
  const ejectAfterElapsed = 30 * 60; // 30 minutes

  const payload = {
    aud: 'daily',
    iss: DAILY_API_KEY,
    sub: roomName,
    room: roomName,
    exp,
    nbf,
    user_name: userName,
    user_id: `${tenantId}-${staffId}`,
    tenant_id: tenantId,
    staff_id: staffId,
    meeting_id: meetingId,
    eject_at_token_exp: true,
    eject_after_elapsed: ejectAfterElapsed,
    permissions: ['send', 'recv', 'write']
  };

  try {
    const token = jwt.sign(payload, DAILY_API_KEY, { algorithm: 'HS256' });
    
    console.log('✅ JWT token generated successfully');
    console.log('📋 Token payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n🔑 Generated token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Decode and verify
    const decoded = jwt.decode(token);
    console.log('\n✅ Token decoded successfully');
    console.log('📅 Expires:', new Date(decoded.exp * 1000));
    console.log('⏰ Not before:', new Date(decoded.nbf * 1000));
    console.log('👤 User:', decoded.user_name);
    console.log('🏢 Tenant:', decoded.tenant_id);
    console.log('👨‍⚕️ Staff:', decoded.staff_id);
    console.log('🕐 Eject after:', decoded.eject_after_elapsed, 'seconds');
    
  } catch (error) {
    console.error('❌ Error generating token:', error.message);
  }
};

// Test environment variables
const testEnvironment = () => {
  console.log('\n🔧 Environment Check:');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
  console.log('DB_NAME:', process.env.DB_NAME || 'vet-cares (default)');
  console.log('DAILY_API_KEY:', process.env.DAILY_API_KEY ? '✅ Set' : '❌ Not set');
};

// Run tests
console.log('🧪 Testing Daily.co Integration\n');
testEnvironment();
testDailyTokenGeneration();

console.log('\n📝 To test the full integration:');
console.log('1. Set DAILY_API_KEY in your .env file');
console.log('2. Start the server: npm run dev');
console.log('3. Test the API endpoints:');
console.log('   - POST /api/daily/create-meeting');
console.log('   - POST /api/daily/get-meeting-token');
console.log('   - GET /api/daily/meetings/:tenantId/:staffId'); 