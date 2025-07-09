
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Edit, Download, Eye, Calendar, User, PawPrint, TestTube, Loader2, Image } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import DocumentViewer from "../medical-records/DocumentViewer";

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  completed: "bg-green-100 text-green-800"
};

const typeColors = {
  cytology: "bg-red-100 text-red-800",
  histopathology: "bg-pink-100 text-pink-800",
  blood_work: "bg-blue-100 text-blue-800",
  urine_analysis: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-800"
};

export default function DiagnosticReportList({ reports, pets, clients, templates, loading, onEdit }) {
  const [viewerState, setViewerState] = useState({ isOpen: false, fileUrl: '', fileName: '' });
  const [isLoadingPdf, setIsLoadingPdf] = useState(null);

  // Helper functions to get full pet/client/template objects
  const getPetInfo = (petId) => pets.find(p => p.id === petId);
  const getClientInfo = (clientId) => clients.find(c => c.id === clientId);
  const getTemplateInfo = (templateId) => templates?.find(t => t.id === templateId);

  const getImageAsBase64 = async (url) => {
    try {
        const response = await fetch(url, { cache: 'no-cache' }); // Use no-cache to avoid CORS issues with cached images
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`Error converting image ${url}:`, error);
        return null;
    }
  };

  const generatePdfForReport = async (report) => {
    const pet = getPetInfo(report.pet_id);
    const client = getClientInfo(report.client_id);
    const template = getTemplateInfo(report.template_id);
    
    const doc = new jsPDF();
    let y = 10;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    // --- Header ---
    if (template?.logo_url) {
      try {
        const logoData = await getImageAsBase64(template.logo_url);
        if (logoData) {
          doc.addImage(logoData, 'JPEG', margin, y, 40, 20); // x, y, width, height
        }
      } catch (e) { console.error("Could not add logo", e); }
    }
    
    doc.setFontSize(10);
    doc.text(template?.clinic_name || 'Dr. Ravi Pet Portal', pageWidth - margin, y + 5, { align: 'right' });
    doc.text(template?.clinic_address || 'No. 32, 4th temple Street road, Malleshwaram, Bengaluru', pageWidth - margin, y + 10, { align: 'right' });
    doc.text(template?.clinic_phone || '082961 43115', pageWidth - margin, y + 15, { align: 'right' });

    y += 30;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y); // Header line
    y += 10;

    // --- Report Title ---
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`${report.report_type.replace('_', ' ').toUpperCase()} REPORT`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    // --- Patient Info (Two-column layout) ---
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    // Using a consistent Y for the start of this section
    doc.text(`PET NAME: ${pet?.name || 'N/A'}`, margin, y);
    doc.text(`OWNER NAME: ${client?.first_name || ''} ${client?.last_name || ''}`, margin, y + 6);
    doc.text(`SPECIES: ${pet?.species?.toUpperCase() || 'N/A'}`, margin, y + 12);
    let ageText = 'N/A';
    if (pet?.birth_date) {
        const ageYears = Math.floor((new Date() - new Date(pet.birth_date)) / (365.25 * 24 * 60 * 60 * 1000));
        const gender = pet.gender ? pet.gender.charAt(0).toUpperCase() : 'U';
        ageText = `${ageYears}Y / ${gender}`;
    }
    doc.text(`AGE / SEX: ${ageText}`, margin, y + 18);

    doc.text(`SITE: ${report.specimen_site?.toUpperCase() || 'N/A'}`, pageWidth / 2 + 10, y);
    doc.text(`COLLECTION DATE: ${report.collection_date ? format(new Date(report.collection_date), 'dd/MM/yyyy') : 'N/A'}`, pageWidth / 2 + 10, y + 6);
    doc.text(`REPORT DATE: ${report.report_date ? format(new Date(report.report_date), 'dd/MM/yyyy') : 'N/A'}`, pageWidth / 2 + 10, y + 12);
    doc.text(`REF. BY: DR. ${report.referred_by?.toUpperCase() || 'N/A'}`, pageWidth / 2 + 10, y + 18);

    y += 30; // Move y past the patient info section

    // --- Observations ---
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('OBSERVATIONS:', margin, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    if (report.observations) {
        const lines = doc.splitTextToSize(report.observations, pageWidth - (margin * 2));
        lines.forEach(line => {
            if (y > pageHeight - 60) { // New page if content exceeds height based on outline (60 for footer/buffer)
                doc.addPage();
                y = margin; // Reset y for new page, leaving space for header if needed, but since header is fixed top, just margin
            }
            doc.text(line, margin, y);
            y += 5; // Line height
        });
    }
    y += 10; // Space after observations

    // --- Images ---
    if (report.images && report.images.length > 0) {
        if (y > pageHeight - 90) { // New page if content exceeds height (90 for image height + buffer)
            doc.addPage();
            y = margin;
        }
        for (const imageUrl of report.images) {
            const imageData = await getImageAsBase64(imageUrl);
            if (imageData) {
                // Ensure there's enough space for the image (height + buffer)
                if (y > pageHeight - 90) { // New page if content exceeds height
                    doc.addPage();
                    y = margin;
                }
                doc.addImage(imageData, 'JPEG', margin, y, 80, 60); // x, y, width, height
                y += 70; // Move y down for next content/image
            }
        }
    }

    // --- Footer and Signatures ---
    const addFooter = async (docInstance) => {
        const footerY = pageHeight - 35;
        docInstance.setFillColor(236, 242, 247); // Light blue color
        docInstance.rect(0, footerY, pageWidth, 35, 'F');
        
        docInstance.setFontSize(9);
        docInstance.setTextColor(51, 65, 85); // A dark gray/blue for footer text
        docInstance.text(template?.footer_text || 'Thank you for choosing us for your pet\'s care.', pageWidth / 2, footerY + 15, { align: 'center' });
        docInstance.text(template?.clinic_email || 'contact@drraviportal.com', pageWidth / 2, footerY + 20, { align: 'center' });
    };

    const signatureY = pageHeight - 70; // Fixed Y position for signatures towards the bottom
    if (y > signatureY - 20) { // If current content 'y' is too close to signature area
      doc.addPage();
      y = margin; // Reset y for new page
    }

    // Signatures
    if (template?.signature_fields && template.signature_fields.length > 0) {
        let sigX = margin;
        for (const sig of template.signature_fields) {
            // Check if there's enough horizontal space for current signature (50 for line + padding)
            if (sigX + 50 > pageWidth - margin) {
                // Not enough horizontal space, move to next line or new page if absolutely needed
                // For now, assume sufficient horizontal space for a few signatures
                // Or, wrap signatures if more than 2-3
                // For simplicity as per outline, just place them side by side
            }

            // Add signature image if available
            if (sig.signature_image_url) {
                const sigImageData = await getImageAsBase64(sig.signature_image_url);
                if (sigImageData) {
                    doc.addImage(sigImageData, 'PNG', sigX, signatureY - 15, 40, 15); // x, y, width, height
                }
            }
            doc.setDrawColor(100, 100, 100); // Gray line
            doc.line(sigX, signatureY, sigX + 50, signatureY); // Signature line
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(sig.name || 'Veterinarian', sigX, signatureY + 6);
            doc.setFont(undefined, 'normal');
            doc.text(sig.title || '', sigX, signatureY + 11);
            doc.text(sig.qualification || '', sigX, signatureY + 16);
            sigX += 70; // Space for next signature (50 for line + 20 padding)
        }
    }

    // Add footer to all pages after all content is laid out
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        await addFooter(doc);
    }

    return doc;
  };

  const handleDownloadPDF = async (report) => {
    setIsLoadingPdf(report.id);
    try {
      const doc = await generatePdfForReport(report);
      doc.save(`diagnostic-report-${report.report_id}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(`Failed to download PDF: ${error.message}`);
    } finally {
      setIsLoadingPdf(null);
    }
  };

  const handleViewPDF = async (report) => {
    setIsLoadingPdf(report.id);
    try {
        const doc = await generatePdfForReport(report);
        const url = doc.output('bloburl'); // Get a URL for the PDF blob
        setViewerState({
            isOpen: true,
            fileUrl: url.toString(),
            fileName: `diagnostic-report-${report.report_id}.pdf`
        });
    } catch (error) {
        console.error('Error viewing PDF:', error);
        alert(`Failed to generate PDF for viewing: ${error.message}`);
    } finally {
        setIsLoadingPdf(null);
    }
  };

  const closeViewer = () => {
    // bloburl created by jspdf does not need explicit revocation like URL.createObjectURL
    setViewerState({ isOpen: false, fileUrl: '', fileName: '' });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Found</h3>
        <p className="text-gray-600">Start by creating your first diagnostic report.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {reports.map((report) => {
          const pet = getPetInfo(report.pet_id);
          const client = getClientInfo(report.client_id);
          const clientName = client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
          const template = getTemplateInfo(report.template_id); // Get template info for display
          
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <TestTube className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">Report #{report.report_id}</h3>
                        <Badge className={typeColors[report.report_type]}>
                          {report.report_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge className={statusColors[report.status]}>
                          {report.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{clientName}</span>
                        </div>
                        {pet && (
                          <div className="flex items-center gap-1">
                            <PawPrint className="w-4 h-4" />
                            <span>{pet.name} ({pet.species})</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(report.report_date), 'dd/MM/yyyy')}</span>
                        </div>
                        {report.images && report.images.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Image className="w-4 h-4" />
                            <span>{report.images.length} image(s)</span>
                          </div>
                        )}
                        {template && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>Template: {template.name}</span>
                          </div>
                        )}
                      </div>
                      
                      {report.observations && (
                        <p className="text-sm text-gray-700 line-clamp-2">
                          <strong>Observations:</strong> {report.observations}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPDF(report)}
                      disabled={isLoadingPdf === report.id}
                      className="gap-1"
                    >
                      {isLoadingPdf === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(report)}
                      disabled={isLoadingPdf === report.id}
                      className="gap-1"
                    >
                      {isLoadingPdf === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(report)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <DocumentViewer
        isOpen={viewerState.isOpen}
        onClose={closeViewer}
        fileUrl={viewerState.fileUrl}
        fileName={viewerState.fileName}
        fileType="application/pdf"
      />
    </>
  );
}
