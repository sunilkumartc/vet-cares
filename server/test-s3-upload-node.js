// Node.js test script for S3 file upload functionality
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  serverUrl: 'http://localhost:3001',
  testFileName: 'test-invoice.pdf',
  testContent: 'This is a test PDF content for S3 upload testing.',
  testInvoiceNumber: 'INV-TEST-001'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test 1: Test S3 connectivity
async function testS3Connectivity() {
  log('\n🔍 Test 1: Testing S3 Connectivity', 'blue');
  
  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/test-s3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      log('✅ S3 connectivity test passed', 'green');
      log(`   Test URL: ${result.testUrl}`, 'green');
      log(`   Bucket: ${result.config.bucket}`, 'green');
      log(`   Region: ${result.config.region}`, 'green');
      return true;
    } else {
      log('❌ S3 connectivity test failed', 'red');
      log(`   Error: ${result.error}`, 'red');
      log(`   Details: ${result.details}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ S3 connectivity test failed with network error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 2: Create test PDF file
async function createTestPDF() {
  log('\n📄 Test 2: Creating Test PDF File', 'blue');
  
  try {
    // Create a simple text file that simulates a PDF
    const testContent = `
      Invoice Test Document
      Invoice Number: ${TEST_CONFIG.testInvoiceNumber}
      Date: ${new Date().toISOString()}
      Amount: $100.00
      
      This is a test invoice for S3 upload testing.
      Content: ${TEST_CONFIG.testContent}
    `;
    
    // Create a temporary file
    const tempFilePath = path.join(__dirname, 'temp-test-file.txt');
    fs.writeFileSync(tempFilePath, testContent);
    
    log('✅ Test file created', 'green');
    log(`   File path: ${tempFilePath}`, 'green');
    log(`   File size: ${fs.statSync(tempFilePath).size} bytes`, 'green');
    
    return tempFilePath;
  } catch (error) {
    log('❌ Failed to create test file', 'red');
    log(`   Error: ${error.message}`, 'red');
    return null;
  }
}

// Test 3: Upload file to S3
async function uploadFileToS3(filePath) {
  log('\n☁️ Test 3: Uploading File to S3', 'blue');
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), TEST_CONFIG.testFileName);
    formData.append('fileName', `test/${TEST_CONFIG.testFileName}`);
    formData.append('contentType', 'application/pdf');
    
    log('   Uploading file...', 'yellow');
    
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/upload-to-s3`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      log('✅ File uploaded to S3 successfully', 'green');
      log(`   URL: ${result.url}`, 'green');
      log(`   File name: ${result.fileName}`, 'green');
      log(`   Bucket: ${result.bucket}`, 'green');
      log(`   Size: ${result.size} bytes`, 'green');
      log(`   Public: ${result.isPublic}`, 'green');
      log(`   ACL: ${result.acl}`, 'green');
      return result;
    } else {
      log('❌ File upload failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Error: ${result.error}`, 'red');
      log(`   Details: ${result.details}`, 'red');
      return null;
    }
  } catch (error) {
    log('❌ File upload failed with network error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return null;
  }
}

// Test 4: Verify file accessibility
async function verifyFileAccessibility(uploadResult) {
  log('\n🔍 Test 4: Verifying File Accessibility', 'blue');
  
  if (!uploadResult || !uploadResult.url) {
    log('❌ No upload result to verify', 'red');
    return false;
  }
  
  try {
    log(`   Testing URL: ${uploadResult.url}`, 'yellow');
    
    const response = await fetch(uploadResult.url);
    
    if (response.ok) {
      log('✅ File is publicly accessible', 'green');
      log(`   Content-Type: ${response.headers.get('content-type')}`, 'green');
      log(`   Content-Length: ${response.headers.get('content-length')}`, 'green');
      return true;
    } else {
      log('❌ File is not publicly accessible', 'red');
      log(`   Status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ File accessibility test failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 5: Test with actual PDF content
async function testWithPDFContent() {
  log('\n📋 Test 5: Testing with PDF-like Content', 'blue');
  
  try {
    // Create a more realistic PDF content
    const pdfContent = `
%PDF-1.4
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
/Length 100
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Invoice PDF) Tj
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
350
%%EOF
    `;
    
    // Create a temporary PDF file
    const tempPdfPath = path.join(__dirname, 'temp-test-invoice.pdf');
    fs.writeFileSync(tempPdfPath, pdfContent);
    
    log('   Created PDF-like file for testing', 'yellow');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempPdfPath), 'test-invoice.pdf');
    formData.append('fileName', 'test/test-invoice.pdf');
    formData.append('contentType', 'application/pdf');
    
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/upload-to-s3`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      log('✅ PDF file uploaded successfully', 'green');
      log(`   URL: ${result.url}`, 'green');
      
      // Clean up temp file
      fs.unlinkSync(tempPdfPath);
      return result;
    } else {
      log('❌ PDF file upload failed', 'red');
      log(`   Error: ${result.error}`, 'red');
      
      // Clean up temp file
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
      return null;
    }
  } catch (error) {
    log('❌ PDF test failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return null;
  }
}

// Cleanup function
function cleanup(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      log('   Cleaned up temporary file', 'yellow');
    } catch (error) {
      log('   Warning: Could not clean up temporary file', 'yellow');
    }
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting S3 Upload Test Suite (Node.js)', 'blue');
  log('==========================================', 'blue');
  
  const results = {
    connectivity: false,
    fileCreation: false,
    upload: false,
    accessibility: false,
    pdfUpload: false
  };
  
  let tempFilePath = null;
  
  try {
    // Test 1: S3 Connectivity
    results.connectivity = await testS3Connectivity();
    
    if (!results.connectivity) {
      log('\n❌ S3 connectivity failed. Stopping tests.', 'red');
      return results;
    }
    
    // Test 2: Create test file
    tempFilePath = await createTestPDF();
    results.fileCreation = !!tempFilePath;
    
    if (!results.fileCreation) {
      log('\n❌ Test file creation failed. Stopping tests.', 'red');
      return results;
    }
    
    // Test 3: Upload file
    const uploadResult = await uploadFileToS3(tempFilePath);
    results.upload = !!uploadResult;
    
    if (!results.upload) {
      log('\n❌ File upload failed. Stopping tests.', 'red');
      return results;
    }
    
    // Test 4: Verify accessibility
    results.accessibility = await verifyFileAccessibility(uploadResult);
    
    // Test 5: PDF upload test
    const pdfResult = await testWithPDFContent();
    results.pdfUpload = !!pdfResult;
    
  } finally {
    // Cleanup
    cleanup(tempFilePath);
  }
  
  // Summary
  log('\n📊 Test Results Summary', 'blue');
  log('=====================', 'blue');
  log(`S3 Connectivity: ${results.connectivity ? '✅ PASS' : '❌ FAIL'}`, results.connectivity ? 'green' : 'red');
  log(`File Creation: ${results.fileCreation ? '✅ PASS' : '❌ FAIL'}`, results.fileCreation ? 'green' : 'red');
  log(`File Upload: ${results.upload ? '✅ PASS' : '❌ FAIL'}`, results.upload ? 'green' : 'red');
  log(`File Accessibility: ${results.accessibility ? '✅ PASS' : '❌ FAIL'}`, results.accessibility ? 'green' : 'red');
  log(`PDF Upload: ${results.pdfUpload ? '✅ PASS' : '❌ FAIL'}`, results.pdfUpload ? 'green' : 'red');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log(`\nOverall Result: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests >= 4) {
    log('🎉 S3 upload functionality is working correctly!', 'green');
  } else {
    log('⚠️ Some tests failed. Please check the configuration.', 'yellow');
  }
  
  return results;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    log(`\n💥 Test suite failed with error: ${error.message}`, 'red');
    process.exit(1);
  });
}

export { runAllTests, testS3Connectivity, uploadFileToS3 }; 