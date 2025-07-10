// Mock functions - replace with actual implementations as needed
// These were previously provided by Base44 SDK

import { TenantPet } from './tenant-entities.js';

export const sendSMS = async (data) => {
  console.log('Mock SMS sent:', data);
  return { success: true, messageId: `sms-${Date.now()}` };
};

export const fileViewer = async (fileId) => {
  console.log('Mock file viewer:', fileId);
  return { url: `https://mock-storage.com/view/${fileId}` };
};

/**
 * Generate a unique PET ID based on species and tenant.
 * Format: First letter of species (uppercase) + 3-digit incrementing number (e.g., D001, C001)
 * @param {Object} params
 * @param {string} params.species
 * @returns {Promise<{data: {pet_id: string}}>} - e.g., { data: { pet_id: 'D001' } }
 */
export const generatePetId = async ({ species }) => {
  if (!species) throw new Error('Species is required for PET ID generation');
  // Get all pets for this species for the current tenant
  const pets = await TenantPet.filter({ species });
  // Find the highest existing pet_id for this species
  let maxNum = 0;
  const prefix = species.charAt(0).toUpperCase();
  pets.forEach(pet => {
    if (pet.pet_id && pet.pet_id.startsWith(prefix)) {
      const num = parseInt(pet.pet_id.slice(1), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  const newNum = (maxNum + 1).toString().padStart(3, '0');
  const pet_id = `${prefix}${newNum}`;
  return { data: { pet_id } };
};

export const sendWhatsAppDocument = async (data) => {
  console.log('Mock WhatsApp document sent:', data);
  return { success: true, messageId: `wa-doc-${Date.now()}` };
};

export const generateInvoicePDF = async (data) => {
  console.log('Generating invoice PDF and uploading to AWS S3:', data);
  
  try {
    // Generate PDF content (this would be your actual PDF generation logic)
    const pdfContent = `Invoice PDF content for ${data.invoice_number || 'invoice'}`;
    const fileName = `invoice/${data.invoice_number || `invoice-${Date.now()}`}.pdf`;
    
    // Convert string to buffer
    const fileBuffer = Buffer.from(pdfContent, 'utf8');
    
    // Create FormData for upload
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', blob, fileName);
    formData.append('fileName', fileName);
    formData.append('contentType', 'application/pdf');
    
    // Upload to S3 via backend API
    const response = await fetch('/api/upload-to-s3', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    
    console.log('Invoice PDF uploaded to S3 successfully:', result);
    
    return { 
      url: result.url,
      fileName: result.fileName,
      bucket: result.bucket,
      isPublic: result.isPublic
    };
  } catch (error) {
    console.error('Error generating and uploading invoice PDF:', error);
    throw new Error(`Failed to generate invoice PDF: ${error.message}`);
  }
};

export const sendExternalEmail = async (data) => {
  console.log('Mock external email sent:', data);
  return { success: true, messageId: `email-${Date.now()}` };
};

export const generateSalesReceipt = async (data) => {
  console.log('Generating sales receipt and uploading to AWS S3:', data);
  
  try {
    // Generate PDF content (this would be your actual PDF generation logic)
    const pdfContent = `Sales receipt content for ${data.receipt_number || 'receipt'}`;
    const fileName = `receipts/${data.receipt_number || `receipt-${Date.now()}`}.pdf`;
    
    // Convert string to buffer
    const fileBuffer = Buffer.from(pdfContent, 'utf8');
    
    // Create FormData for upload
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', blob, fileName);
    formData.append('fileName', fileName);
    formData.append('contentType', 'application/pdf');
    
    // Upload to S3 via backend API
    const response = await fetch('/api/upload-to-s3', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    
    console.log('Sales receipt uploaded to S3 successfully:', result);
    
    return { 
      url: result.url,
      fileName: result.fileName,
      bucket: result.bucket,
      isPublic: result.isPublic
    };
  } catch (error) {
    console.error('Error generating and uploading sales receipt:', error);
    throw new Error(`Failed to generate sales receipt: ${error.message}`);
  }
};

export const sendWhatsAppReminder = async (data) => {
  console.log('Mock WhatsApp reminder sent:', data);
  return { success: true, messageId: `wa-reminder-${Date.now()}` };
};

export const sendWhatsAppMessage = async (data) => {
  try {
    console.log('Sending WhatsApp message via backend:', data);
    
    // Call our backend endpoint instead of external API directly
    const response = await fetch('/api/whatsapp/send-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        phone: data.phone,
        customer_name: data.customer_name || "Customer",
        amount: data.amount || 0,
        pdf_url: data.pdf_url || data.document_url || "",
        invoice_id: data.invoice_id,
        medical_record_id: data.medical_record_id,
        pet_name: data.pet_name,
        record_type: data.record_type,
        tenant_id: data.tenant_id || null
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${result.error || response.statusText}`);
    }
    
    console.log('Backend WhatsApp API response:', result);
    
    return {
      success: true,
      messageId: result.messageId || `wa-msg-${Date.now()}`,
      apiResponse: result
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw new Error(`Failed to send WhatsApp message: ${error.message}`);
  }
};

export const sendVaccinationReminders = async (data) => {
  console.log('Mock vaccination reminders sent:', data);
  return { success: true, count: data.length };
};

