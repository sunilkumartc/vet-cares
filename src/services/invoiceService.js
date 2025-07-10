// Invoice sending service - combines PDF generation, S3 upload, and WhatsApp sending
import { generateInvoicePDF } from '../utils/invoicePdfGenerator.js';
import { uploadToS3, generateInvoiceFileName } from '../api/awsS3.js';
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
    
    // Convert PDF to blob and then to File
    const pdfBlob = pdfDoc.output('blob');
    console.log('PDF blob created:', { size: pdfBlob.size, type: pdfBlob.type });
    
    const pdfFile = new File([pdfBlob], `Invoice_${invoice.invoice_number}.pdf`, {
      type: 'application/pdf'
    });
    console.log('PDF file created:', { name: pdfFile.name, size: pdfFile.size, type: pdfFile.type });

    // 3. Upload PDF to S3 and get public URL
    console.log('Uploading PDF to S3...');
    const tenant = TenantManager.getCurrentTenant();
    const fileName = generateInvoiceFileName(invoice.invoice_number, tenant?.slug || 'default');
    console.log('Generated filename:', fileName);
    
    // Upload to S3 with public-read ACL and get public URL
    const uploadResult = await uploadToS3(pdfFile, fileName);
    
    if (!uploadResult.success) {
      throw new Error('Failed to upload PDF to S3');
    }
    
    console.log('PDF uploaded to S3 with public-read ACL:', uploadResult.url);
    
    // 4. Update invoice with PDF URL and mark as sent
    const updatedInvoice = await TenantInvoice.update(invoiceId, {
      pdf_url: uploadResult.url,
      sent_date: new Date().toISOString(),
      status: 'sent'
    });

    // 5. Send via WhatsApp with public S3 URL
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
      message: 'Invoice sent successfully!',
      storage: {
        provider: 'AWS S3',
        bucket: uploadResult.bucket,
        acl: uploadResult.acl,
        isPublic: uploadResult.isPublic
      }
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