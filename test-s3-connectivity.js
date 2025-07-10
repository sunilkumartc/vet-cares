#!/usr/bin/env node

// Test script to verify S3 connectivity and upload functionality
import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function testS3Connectivity() {
  console.log('🧪 Testing S3 Connectivity...\n');
  
  try {
    // Test 1: S3 connectivity test
    console.log('1️⃣ Testing S3 connectivity...');
    const testResponse = await fetch(`${BASE_URL}/api/test-s3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json();
      console.error('❌ S3 connectivity test failed:', errorData);
      return false;
    }
    
    const testResult = await testResponse.json();
    console.log('✅ S3 connectivity test passed');
    console.log('   Test URL:', testResult.testUrl || 'N/A');
    console.log('   Config:', testResult.config || 'N/A');
    console.log('');
    
    // Test 2: File upload test
    console.log('2️⃣ Testing file upload...');
    
    // Create a simple test PDF content
    const testPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF Content) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;
    
    // Create FormData with test file
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('file', Buffer.from(testPdfContent), {
      filename: 'test-invoice.pdf',
      contentType: 'application/pdf'
    });
    
    const uploadResponse = await fetch(`${BASE_URL}/api/upload-to-s3`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('❌ File upload test failed:', errorData);
      return false;
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('✅ File upload test passed');
    console.log('   Upload URL:', uploadResult.url);
    console.log('   File size:', uploadResult.size);
    console.log('   Bucket:', uploadResult.bucket);
    console.log('');
    
    // Test 3: Verify uploaded file is accessible
    console.log('3️⃣ Verifying uploaded file accessibility...');
    const fileResponse = await fetch(uploadResult.url);
    
    if (fileResponse.ok) {
      console.log('✅ Uploaded file is publicly accessible');
      console.log('   Content-Type:', fileResponse.headers.get('content-type'));
      console.log('   Content-Length:', fileResponse.headers.get('content-length'));
    } else {
      console.log('⚠️  Uploaded file may not be publicly accessible');
      console.log('   Status:', fileResponse.status);
    }
    
    console.log('\n🎉 All S3 tests passed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ S3 test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testS3Connectivity().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 