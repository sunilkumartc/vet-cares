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
  console.log('Mock invoice PDF generated:', data);
  return { url: `https://mock-storage.com/invoice-${Date.now()}.pdf` };
};

export const sendExternalEmail = async (data) => {
  console.log('Mock external email sent:', data);
  return { success: true, messageId: `email-${Date.now()}` };
};

export const generateSalesReceipt = async (data) => {
  console.log('Mock sales receipt generated:', data);
  return { url: `https://mock-storage.com/receipt-${Date.now()}.pdf` };
};

export const sendWhatsAppReminder = async (data) => {
  console.log('Mock WhatsApp reminder sent:', data);
  return { success: true, messageId: `wa-reminder-${Date.now()}` };
};

export const sendWhatsAppMessage = async (data) => {
  console.log('Mock WhatsApp message sent:', data);
  return { success: true, messageId: `wa-msg-${Date.now()}` };
};

export const sendVaccinationReminders = async (data) => {
  console.log('Mock vaccination reminders sent:', data);
  return { success: true, count: data.length };
};

