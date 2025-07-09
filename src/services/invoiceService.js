// Invoice sending service - combines PDF generation, R2 upload, and WhatsApp sending
import { generateInvoicePDF } from '../utils/invoicePdfGenerator.js';
import { uploadToR2, generateInvoiceFileName } from '../api/cloudflareR2.js';
import { sendInvoiceViaWhatsApp, sendInvoiceDocumentViaWhatsApp } from '../api/whatsapp.js';
import { TenantInvoice, TenantClient, TenantPet } from '../api/tenant-entities.js';
import { TenantManager } from '../lib/tenant.js';

// Main function to send invoice
export const sendInvoice = async (invoiceId) => {
  try {
    // 1. Fetch invoice and related data
    const invoice = await TenantInvoice.get(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const [client, pet] = await Promise.all([
      invoice.client_id ? TenantClient.get(invoice.client_id) : null,
      invoice.pet_id ? TenantPet.get(invoice.pet_id) : null
    ]);

    // 2. Generate PDF
    console.log('Generating PDF for invoice:', invoice.invoice_number);
    const pdfDoc = await generateInvoicePDF(invoice, client, pet);
    
    // Convert PDF to blob
    const pdfBlob = pdfDoc.output('blob');
    const pdfFile = new File([pdfBlob], `Invoice_${invoice.invoice_number}.pdf`, {
      type: 'application/pdf'
    });

    // 3. Upload PDF to R2 and get public URL
    console.log('Uploading PDF to R2...');
    const tenant = TenantManager.getCurrentTenant();
    const fileName = generateInvoiceFileName(invoice.invoice_number, tenant?.slug || 'default');
    
    // Upload to R2 and get public URL
    const uploadResult = await uploadToR2(pdfFile, fileName);
    
    if (!uploadResult.success) {
      throw new Error('Failed to upload PDF to R2');
    }
    
    // 4. Update invoice with PDF URL and mark as sent
    const updatedInvoice = await TenantInvoice.update(invoiceId, {
      pdf_url: uploadResult.url,
      sent_date: new Date().toISOString(),
      status: 'sent'
    });

    // 5. Send via WhatsApp with public R2 URL
    console.log('Sending invoice via WhatsApp...');
    let whatsappResult;
    
    if (client && client.phone) {
      try {
        // Try to send as document first, fallback to message with link
        whatsappResult = await sendInvoiceDocumentViaWhatsApp(invoice, client, uploadResult.url);
      } catch (whatsappError) {
        console.warn('Document sending failed, trying message with link:', whatsappError);
        whatsappResult = await sendInvoiceViaWhatsApp(invoice, client, uploadResult.url);
      }
    } else {
      throw new Error('Client phone number not available for WhatsApp sending');
    }

    return {
      success: true,
      invoice: updatedInvoice,
      pdfUrl: uploadResult.url,
      whatsappResult: whatsappResult,
      message: 'Invoice sent successfully!'
    };

  } catch (error) {
    console.error('Error sending invoice:', error);
    throw error;
  }
};

// Check if invoice can be sent
export const canSendInvoice = (invoice) => {
  if (!invoice) return false;
  
  // Can only send draft or sent invoices
  if (!['draft', 'sent'].includes(invoice.status)) {
    return false;
  }
  
  // Must have a client
  if (!invoice.client_id) {
    return false;
  }
  
  return true;
}; 