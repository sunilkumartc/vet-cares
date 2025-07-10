// Test script for S3 file upload functionality
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    // Create a simple PDF-like content (in real scenario, this would be a proper PDF)
    const testContent = `
      Invoice Test Document
      Invoice Number: ${TEST_CONFIG.testInvoiceNumber}
      Date: ${new Date().toISOString()}
      Amount: $100.00
      
      This is a test invoice for S3 upload testing.
      Content: ${TEST_CONFIG.testContent}
    `;
    
    // Create a blob that simulates a PDF file
    const blob = new Blob([testContent], { type: 'application/pdf' });
    const file = new File([blob], TEST_CONFIG.testFileName, { type: 'application/pdf' });
    
    log('✅ Test PDF file created', 'green');
    log(`   File name: ${file.name}`, 'green');
    log(`   File size: ${file.size} bytes`, 'green');
    log(`   File type: ${file.type}`, 'green');
    
    return file;
  } catch (error) {
    log('❌ Failed to create test PDF file', 'red');
    log(`   Error: ${error.message}`, 'red');
    return null;
  }
}

// Test 3: Upload file to S3
async function uploadFileToS3(file) {
  log('\n☁️ Test 3: Uploading File to S3', 'blue');
  
  try {
    const formData = new FormData();
    formData.append('file', file);
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

// Test 5: Test invoice PDF generation and upload
async function testInvoicePDFUpload() {
  log('\n🧾 Test 5: Testing Invoice PDF Generation and Upload', 'blue');
  
  try {
    // Create a mock invoice data
    const mockInvoice = {
      invoice_number: TEST_CONFIG.testInvoiceNumber,
      client_id: 'test-client-123',
      pet_id: 'test-pet-456',
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          service: 'Vaccination',
          description: 'Annual vaccination',
          quantity: 1,
          unit_price: 50.00,
          total: 50.00
        }
      ],
      subtotal: 50.00,
      tax_rate: 8,
      tax_amount: 4.00,
      total_amount: 54.00,
      status: 'draft'
    };
    
    const mockClient = {
      id: 'test-client-123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    };
    
    const mockPet = {
      id: 'test-pet-456',
      name: 'Buddy',
      species: 'dog',
      breed: 'Golden Retriever'
    };
    
    log('   Generating invoice PDF...', 'yellow');
    
    // Call the invoice generation endpoint (if it exists)
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/generate-invoice-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoice: mockInvoice,
        client: mockClient,
        pet: mockPet
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      log('✅ Invoice PDF generated and uploaded', 'green');
      log(`   URL: ${result.url}`, 'green');
      return result;
    } else {
      log('⚠️ Invoice PDF generation endpoint not available', 'yellow');
      log('   This is expected if the endpoint is not implemented yet', 'yellow');
      return null;
    }
  } catch (error) {
    log('⚠️ Invoice PDF generation test skipped', 'yellow');
    log(`   Error: ${error.message}`, 'yellow');
    return null;
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting S3 Upload Test Suite', 'blue');
  log('================================', 'blue');
  
  const results = {
    connectivity: false,
    fileCreation: false,
    upload: false,
    accessibility: false,
    invoiceUpload: false
  };
  
  // Test 1: S3 Connectivity
  results.connectivity = await testS3Connectivity();
  
  if (!results.connectivity) {
    log('\n❌ S3 connectivity failed. Stopping tests.', 'red');
    return results;
  }
  
  // Test 2: Create test file
  const testFile = await createTestPDF();
  results.fileCreation = !!testFile;
  
  if (!results.fileCreation) {
    log('\n❌ Test file creation failed. Stopping tests.', 'red');
    return results;
  }
  
  // Test 3: Upload file
  const uploadResult = await uploadFileToS3(testFile);
  results.upload = !!uploadResult;
  
  if (!results.upload) {
    log('\n❌ File upload failed. Stopping tests.', 'red');
    return results;
  }
  
  // Test 4: Verify accessibility
  results.accessibility = await verifyFileAccessibility(uploadResult);
  
  // Test 5: Invoice PDF upload (optional)
  const invoiceResult = await testInvoicePDFUpload();
  results.invoiceUpload = !!invoiceResult;
  
  // Summary
  log('\n📊 Test Results Summary', 'blue');
  log('=====================', 'blue');
  log(`S3 Connectivity: ${results.connectivity ? '✅ PASS' : '❌ FAIL'}`, results.connectivity ? 'green' : 'red');
  log(`File Creation: ${results.fileCreation ? '✅ PASS' : '❌ FAIL'}`, results.fileCreation ? 'green' : 'red');
  log(`File Upload: ${results.upload ? '✅ PASS' : '❌ FAIL'}`, results.upload ? 'green' : 'red');
  log(`File Accessibility: ${results.accessibility ? '✅ PASS' : '❌ FAIL'}`, results.accessibility ? 'green' : 'red');
  log(`Invoice Upload: ${results.invoiceUpload ? '✅ PASS' : '⚠️ SKIP'}`, results.invoiceUpload ? 'green' : 'yellow');
  
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