import jsPDF from 'jspdf';
import { format } from 'date-fns';

// Generate PDF for invoice
export const generateInvoicePDF = async (invoice, client, pet) => {
  const doc = new jsPDF();
  let y = 10;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;

  // --- Header ---
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Dr. Ravi Pet Portal', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('No. 32, 4th temple Street road, Malleshwaram, Bengaluru', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('Phone: 082961 43115', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // --- Invoice Header ---
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // --- Client and Pet Information ---
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Bill To:', margin, y);
  y += 6;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  if (client) {
    doc.text(`${client.first_name} ${client.last_name}`, margin, y);
    y += 4;
    doc.text(`Email: ${client.email || 'N/A'}`, margin, y);
    y += 4;
    doc.text(`Phone: ${client.phone || 'N/A'}`, margin, y);
    y += 4;
    doc.text(`Address: ${client.address || 'N/A'}`, margin, y);
  } else {
    doc.text('Walk-in Customer', margin, y);
  }
  y += 8;

  // Pet Information
  if (pet) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Patient:', margin, y);
    y += 6;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Name: ${pet.name}`, margin, y);
    y += 4;
    doc.text(`Species: ${pet.species}`, margin, y);
    y += 4;
    doc.text(`Breed: ${pet.breed || 'N/A'}`, margin, y);
    y += 8;
  }

  // --- Invoice Details ---
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Invoice Details:', margin, y);
  y += 6;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Date: ${format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}`, margin, y);
  y += 4;
  if (invoice.due_date) {
    doc.text(`Due Date: ${format(new Date(invoice.due_date), 'dd/MM/yyyy')}`, margin, y);
    y += 4;
  }
  doc.text(`Status: ${invoice.status.toUpperCase()}`, margin, y);
  y += 8;

  // --- Items Table ---
  if (invoice.items && invoice.items.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Items:', margin, y);
    y += 6;

    // Table header
    const tableY = y;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Item', margin, y);
    doc.text('Qty', margin + 80, y);
    doc.text('Price', margin + 110, y);
    doc.text('Total', margin + 140, y);
    y += 4;

    // Table content
    doc.setFont(undefined, 'normal');
    invoice.items.forEach((item, index) => {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }
      
      doc.text(item.service || 'Service', margin, y);
      doc.text(item.quantity.toString(), margin + 80, y);
      doc.text(`₹${item.unit_price.toFixed(2)}`, margin + 110, y);
      doc.text(`₹${item.total.toFixed(2)}`, margin + 140, y);
      y += 4;
    });

    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // Totals
    doc.setFont(undefined, 'bold');
    doc.text('Subtotal:', margin + 100, y);
    doc.text(`₹${invoice.subtotal.toFixed(2)}`, margin + 140, y);
    y += 4;
    
    if (invoice.tax_amount > 0) {
      doc.text(`Tax (${invoice.tax_rate || 8}%):`, margin + 100, y);
      doc.text(`₹${invoice.tax_amount.toFixed(2)}`, margin + 140, y);
      y += 4;
    }
    
    doc.setFontSize(11);
    doc.text('Total:', margin + 100, y);
    doc.text(`₹${invoice.total_amount.toFixed(2)}`, margin + 140, y);
  }

  // --- Notes ---
  if (invoice.notes) {
    y += 10;
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Notes:', margin, y);
    y += 4;
    
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(invoice.notes, pageWidth - (margin * 2));
    lines.forEach(line => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 4;
    });
  }

  // --- Footer ---
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for choosing Dr. Ravi Pet Portal', pageWidth / 2, footerY, { align: 'center' });
  doc.text('For any queries, please contact us at 082961 43115', pageWidth / 2, footerY + 4, { align: 'center' });

  return doc;
}; 