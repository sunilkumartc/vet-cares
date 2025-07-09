// WhatsApp integration utilities
import { sendWhatsAppMessage } from './functions.js';

// Send invoice via WhatsApp
export const sendInvoiceViaWhatsApp = async (invoice, client, pdfUrl) => {
  try {
    if (!client || !client.phone) {
      throw new Error('Client phone number not available');
    }

    const message = `Dear ${client.first_name} ${client.last_name},

Your invoice #${invoice.invoice_number} for ₹${invoice.total_amount.toFixed(2)} is ready.

📄 View Invoice: ${pdfUrl}

💰 Total Amount: ₹${invoice.total_amount.toFixed(2)}
📅 Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Not specified'}

💳 Payment Options:
• Cash at clinic
• UPI: 8296143115@okicici
• Bank Transfer: ICICI Bank, A/C: 1234567890

For any queries, please contact us at 082961 43115.

Thank you for choosing Dr. Ravi Pet Portal! 🐾`;

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
      message: 'Invoice sent successfully via WhatsApp'
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

    const caption = `Invoice #${invoice.invoice_number} - ₹${invoice.total_amount.toFixed(2)}

Dear ${client.first_name} ${client.last_name},

Please find your invoice attached.

For any queries, please contact us at 082961 43115.

Thank you for choosing Dr. Ravi Pet Portal! 🐾`;

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
      message: 'Invoice document sent successfully via WhatsApp'
    };
  } catch (error) {
    console.error('Error sending invoice document via WhatsApp:', error);
    throw new Error('Failed to send invoice document via WhatsApp');
  }
}; 