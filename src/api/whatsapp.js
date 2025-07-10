// WhatsApp integration utilities
import { sendWhatsAppMessage } from './functions.js';

// Send invoice via WhatsApp
export const sendInvoiceViaWhatsApp = async (invoice, client, pdfUrl) => {
  try {
    if (!client || !client.phone) {
      throw new Error('Client phone number not available');
    }

    // Send WhatsApp message via API with direct S3 URL
    const result = await sendWhatsAppMessage({
      phone: client.phone,
      customer_name: `${client.first_name} ${client.last_name}`,
      amount: invoice.total_amount,
      pdf_url: pdfUrl,
      invoice_id: invoice.id,
      tenant_id: invoice.tenant_id
    });

    return {
      success: true,
      messageId: result.messageId,
      message: 'Invoice sent successfully via WhatsApp',
      pdf_url: pdfUrl,
      apiResponse: result.apiResponse
    };
  } catch (error) {
    console.error('Error sending invoice via WhatsApp:', error);
    throw new Error('Failed to send invoice via WhatsApp');
  }
};

// Send invoice document via WhatsApp
export const sendInvoiceDocumentViaWhatsApp = async (invoice, client, pdfUrl) => {
  try {
    if (!client || !client.phone) {
      throw new Error('Client phone number not available');
    }

    // Send WhatsApp message via API with direct S3 URL
    const result = await sendWhatsAppMessage({
      phone: client.phone,
      customer_name: `${client.first_name} ${client.last_name}`,
      amount: invoice.total_amount,
      document_url: pdfUrl,
      invoice_id: invoice.id,
      tenant_id: invoice.tenant_id
    });

    return {
      success: true,
      messageId: result.messageId,
      message: 'Invoice document sent successfully via WhatsApp',
      pdf_url: pdfUrl,
      apiResponse: result.apiResponse
    };
  } catch (error) {
    console.error('Error sending invoice document via WhatsApp:', error);
    throw new Error('Failed to send invoice document via WhatsApp');
  }
};

// Send medical record via WhatsApp
export const sendMedicalRecordViaWhatsApp = async (medicalRecord, client, pet, fileUrl) => {
  try {
    if (!client || !client.phone) {
      throw new Error('Client phone number not available');
    }

    // Send WhatsApp message via API with direct S3 URL
    const result = await sendWhatsAppMessage({
      phone: client.phone,
      customer_name: `${client.first_name} ${client.last_name}`,
      pet_name: pet?.name || 'Pet',
      record_type: medicalRecord.record_type,
      document_url: fileUrl,
      medical_record_id: medicalRecord.id,
      tenant_id: medicalRecord.tenant_id
    });

    return {
      success: true,
      messageId: result.messageId,
      message: 'Medical record sent successfully via WhatsApp',
      pdf_url: fileUrl
    };
  } catch (error) {
    console.error('Error sending medical record via WhatsApp:', error);
    throw new Error('Failed to send medical record via WhatsApp');
  }
}; 