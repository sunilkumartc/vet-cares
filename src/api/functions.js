// Mock functions - replace with actual implementations as needed
// These were previously provided by Base44 SDK

export const sendSMS = async (data) => {
  console.log('Mock SMS sent:', data);
  return { success: true, messageId: `sms-${Date.now()}` };
};

export const fileViewer = async (fileId) => {
  console.log('Mock file viewer:', fileId);
  return { url: `https://mock-storage.com/view/${fileId}` };
};

export const generatePetId = async () => {
  console.log('Mock pet ID generated');
  return `PET-${Date.now()}`;
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

