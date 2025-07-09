// Cloudflare R2 configuration and upload utilities
// 
// PRODUCTION NOTE: 
// In production, this should be moved to the backend (server.js) to keep credentials secure.
// The frontend should call a backend API endpoint like:
// POST /api/upload-to-r2
// 
// For now, using the provided credentials as defaults for development
const R2_ACCESS_KEY_ID = '18ff8da7fb8b39edc132389c80aea4e1';
const R2_SECRET_ACCESS_KEY = 'cc71c19220d512f47dfd1acb26c78ec6ff5191892017ec9e37524412f79eb5d2';
const R2_BUCKET = 'vetvault';
const R2_ACCOUNT_ID = '63a5108742d66ea812f09f4fd0e506fa';
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Upload file to Cloudflare R2
export const uploadToR2 = async (file, fileName) => {
  try {
    // For now, we'll use a mock implementation
    // In production, you would use the AWS SDK or direct HTTP requests to R2
    // Note: In a real implementation, this should be done on the backend to keep credentials secure
    console.log('Mock R2 upload:', { fileName });
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a public URL for Cloudflare R2
    // Using your public development URL for R2 bucket
    const publicUrl = `https://pub-789907abe82641e3ad3de48abf37b9a8.r2.dev/vetvault/invoices/${fileName.split('/').pop()}`;
    
    return {
      success: true,
      url: publicUrl,
      fileName: fileName,
      isPublic: true
    };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file to R2');
  }
};

// Generate a unique filename for the invoice PDF
export const generateInvoiceFileName = (invoiceNumber, tenantId) => {
  const timestamp = Date.now();
  const sanitizedInvoiceNumber = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
  return `invoices/${tenantId}/${sanitizedInvoiceNumber}_${timestamp}.pdf`;
}; 