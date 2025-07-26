"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Edit, Download, Eye, Calendar, User, PawPrint, TestTube, Loader2, ImageIcon } from "lucide-react"
import { format } from "date-fns"
import jsPDF from "jspdf"
import DocumentViewer from "../medical-records/DocumentViewer"

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  completed: "bg-green-100 text-green-800",
  reviewed: "bg-blue-100 text-blue-800",
  sent: "bg-purple-100 text-purple-800",
}

const typeColors = {
  cytology: "bg-red-100 text-red-800",
  histopathology: "bg-pink-100 text-pink-800",
  blood_work: "bg-blue-100 text-blue-800",
  urine_analysis: "bg-yellow-100 text-yellow-800",
  fecal_exam: "bg-green-100 text-green-800",
  skin_scraping: "bg-orange-100 text-orange-800",
  other: "bg-gray-100 text-gray-800",
}

export default function DiagnosticReportList({ reports, pets, clients, templates, loading, onEdit }) {
  const [viewerState, setViewerState] = useState({ isOpen: false, fileUrl: "", fileName: "" })
  const [isLoadingPdf, setIsLoadingPdf] = useState(null)

  // Helper functions to get full pet/client/template objects
  const getPetInfo = (petId) => pets.find((p) => (p._id || p.id) === petId)
  const getClientInfo = (clientId) => clients.find((c) => (c._id || c.id) === clientId)
  const getTemplateInfo = (templateId) => {
    console.log("=== TEMPLATE LOOKUP ===")
    console.log("Looking for template ID:", templateId)
    console.log(
      "Available templates:",
      templates?.map((t) => ({ id: t._id || t.id, name: t.template_name })),
    )
    const template = templates?.find((t) => (t._id || t.id) === templateId)
    console.log("Found template:", template)
    return template
  }

  // Helper function to get staff session from localStorage
  const getStaffSession = () => {
    try {
      const staffSession = localStorage.getItem("staffSession")
      if (staffSession) {
        return JSON.parse(staffSession)
      }
    } catch (error) {
      console.error("Error parsing staff session:", error)
    }
    return null
  }

  // Helper function to get tenant ID
  const getTenantId = () => {
    const staffSession = getStaffSession()
    return staffSession?.tenant_id
  }

  // Multi-method image loading with server proxy as primary and client fallbacks
  const getImageAsBase64 = async (imageUrl) => {
    if (!imageUrl) {
      console.log("❌ No image URL provided")
      return null
    }

    console.log("=== LOADING IMAGE ===")
    console.log("Image URL:", imageUrl)

    // If it's already a data URL, return it
    if (imageUrl.startsWith("data:")) {
      console.log("✅ Image is already a data URL")
      return imageUrl
    }

    // Method 1: Try server-side proxy first
    try {
      console.log("🔄 Method 1: Trying server proxy")
      const staffSession = getStaffSession()
      const tenantId = getTenantId()

      const response = await fetch("/api/utils/image-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": tenantId || "default",
          Authorization: staffSession?.token ? `Bearer ${staffSession.token}` : undefined,
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.base64) {
          console.log("✅ Method 1 (server proxy) succeeded")
          return data.base64
        }
      } else {
        console.log("❌ Server proxy failed with status:", response.status)
      }
    } catch (error) {
      console.log("❌ Server proxy method failed:", error.message)
    }

    // Method 2: Try direct fetch with no-cors mode
    try {
      console.log("🔄 Method 2: Trying no-cors fetch")
      const response = await fetch(imageUrl, {
        method: "GET",
        mode: "no-cors",
        cache: "no-cache",
        credentials: "omit",
      })

      if (response.type === "opaque") {
        console.log("❌ Method 2 failed: Opaque response (CORS blocked)")
      }
    } catch (error) {
      console.log("❌ Method 2 failed:", error.message)
    }

    // Method 3: Try using a proxy service (for external images)
    try {
      console.log("🔄 Method 3: Trying CORS proxy service")
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`

      const response = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          Accept: "image/*,*/*",
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        if (blob.size > 0) {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              console.log("✅ Method 3 (CORS proxy) succeeded")
              resolve(reader.result)
            }
            reader.onerror = () => {
              console.log("❌ Method 3 failed: FileReader error")
              resolve(null)
            }
            reader.readAsDataURL(blob)
          })
        }
      }
    } catch (error) {
      console.log("❌ Method 3 failed:", error.message)
    }

    // Method 4: Try creating a simple placeholder image
    try {
      console.log("🔄 Method 4: Creating placeholder image")

      // Create a simple canvas with placeholder text
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      canvas.width = 200
      canvas.height = 100

      // Fill with light gray background
      ctx.fillStyle = "#f5f5f5"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add border
      ctx.strokeStyle = "#cccccc"
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)

      // Add text
      ctx.fillStyle = "#999999"
      ctx.font = "14px Arial"
      ctx.textAlign = "center"
      ctx.fillText("IMAGE", canvas.width / 2, canvas.height / 2 - 5)
      ctx.fillText("NOT AVAILABLE", canvas.width / 2, canvas.height / 2 + 15)

      const dataUrl = canvas.toDataURL("image/png")
      console.log("✅ Method 4 (placeholder) succeeded")
      return dataUrl
    } catch (error) {
      console.log("❌ Method 4 failed:", error.message)
    }

    console.log("❌ All image loading methods failed")
    return null
  }

  // Safe date formatting function
  const safeFormatDate = (dateString, formatString = "dd/MM/yyyy") => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid Date"
      return format(date, formatString)
    } catch (error) {
      console.error("Date formatting error:", error)
      return "Invalid Date"
    }
  }

  const generatePdfForReport = async (report) => {
    console.log("=== STARTING PDF GENERATION ===")
    console.log("Report data:", report)

    const pet = getPetInfo(report.pet_id)
    const client = getClientInfo(report.client_id)
    const template = getTemplateInfo(report.template_id)

    console.log("=== RETRIEVED DATA ===")
    console.log("Pet:", pet)
    console.log("Client:", client)
    console.log("Template:", template)

    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.height
    const pageWidth = doc.internal.pageSize.width
    const margin = 20
    let y = 25

    // === HEADER SECTION WITH LOGO AND CLINIC INFO ===
    console.log("=== BUILDING HEADER ===")

    // Logo in top-left corner - use the exact saved logo_url
    if (template?.logo_url) {
      console.log("🔄 Processing logo from template:", template.logo_url)
      try {
        const logoData = await getImageAsBase64(template.logo_url)
        if (logoData) {
          console.log("✅ Logo data received, adding to PDF")
          // Determine image format from data URL
          const imageFormat = logoData.includes("data:image/png") ? "PNG" : "JPEG"
          doc.addImage(logoData, imageFormat, margin, 15, 40, 25) // x, y, width, height
          console.log("✅ Logo added successfully to PDF")
        } else {
          console.log("❌ Failed to get logo data - adding text placeholder")
          // Add text placeholder for logo
          doc.setFontSize(12)
          doc.setFont(undefined, "bold")
          doc.setTextColor(100, 100, 100)
          doc.text("CLINIC LOGO", margin + 20, 27, { align: "center" })
          doc.setTextColor(0, 0, 0)
        }
      } catch (error) {
        console.error("❌ Error processing logo:", error)
        // Add text placeholder
        doc.setFontSize(12)
        doc.setFont(undefined, "bold")
        doc.setTextColor(100, 100, 100)
        doc.text("CLINIC LOGO", margin + 20, 27, { align: "center" })
        doc.setTextColor(0, 0, 0)
      }
    } else {
      console.log("❌ No logo URL in template")
    }

    // Clinic information in top-right corner
    const clinicInfoX = pageWidth - margin
    doc.setFontSize(14)
    doc.setFont(undefined, "bold")
    doc.setTextColor(0, 51, 102) // Dark blue
    const clinicName = template?.clinic_name || "Santosh Clinic"
    doc.text(clinicName, clinicInfoX, 25, { align: "right" })

    doc.setFontSize(9)
    doc.setFont(undefined, "normal")
    doc.setTextColor(60, 60, 60) // Dark gray

    const clinicAddress = template?.clinic_address || "No. 32, 4th temple Street road, Malleshwaram, Bengaluru"
    const addressLines = doc.splitTextToSize(clinicAddress, 70)
    let addressY = 32
    addressLines.forEach((line) => {
      doc.text(line, clinicInfoX, addressY, { align: "right" })
      addressY += 4
    })

    const clinicPhone = template?.clinic_phone || "082961 43115"
    const clinicEmail = template?.clinic_email || "dr.ravi@example.com"
    doc.text(`Phone: ${clinicPhone}`, clinicInfoX, addressY + 2, { align: "right" })
    doc.text(`Email: ${clinicEmail}`, clinicInfoX, addressY + 7, { align: "right" })

    // Header separator line
    y = 55
    doc.setDrawColor(0, 51, 102)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 15

    // === REPORT TITLE ===
    doc.setFontSize(20)
    doc.setFont(undefined, "bold")
    doc.setTextColor(0, 51, 102)
    const reportTitle = `${report.report_type.replace("_", " ").toUpperCase()} REPORT`
    doc.text(reportTitle, pageWidth / 2, y, { align: "center" })
    y += 20

    // === PATIENT INFORMATION BOX ===
    console.log("=== BUILDING PATIENT INFO ===")

    // Create styled patient info box
    doc.setFillColor(245, 248, 252) // Light blue background
    doc.setDrawColor(200, 220, 240)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin, y, pageWidth - margin * 2, 45, 3, 3, "FD") // Rounded rectangle with fill and border

    // Patient info content
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)

    const leftCol = margin + 8
    const rightCol = pageWidth / 2 + 8
    const infoStartY = y + 10

    // Left column
    doc.setFont(undefined, "bold")
    doc.text("REPORT ID:", leftCol, infoStartY)
    doc.setFont(undefined, "normal")
    doc.text(report.report_id || "N/A", leftCol + 25, infoStartY)

    doc.setFont(undefined, "bold")
    doc.text("PET NAME:", leftCol, infoStartY + 6)
    doc.setFont(undefined, "normal")
    doc.text((pet?.name || "N/A").toUpperCase(), leftCol + 25, infoStartY + 6)

    doc.setFont(undefined, "bold")
    doc.text("OWNER:", leftCol, infoStartY + 12)
    doc.setFont(undefined, "normal")
    const ownerName = client ? `${client.first_name} ${client.last_name}`.toUpperCase() : "N/A"
    doc.text(ownerName, leftCol + 25, infoStartY + 12)

    doc.setFont(undefined, "bold")
    doc.text("SPECIES:", leftCol, infoStartY + 18)
    doc.setFont(undefined, "normal")
    doc.text((pet?.species || "N/A").toUpperCase(), leftCol + 25, infoStartY + 18)

    // Calculate age and gender
    let ageGender = "N/A"
    if (pet?.birth_date) {
      const ageYears = Math.floor((new Date() - new Date(pet.birth_date)) / (365.25 * 24 * 60 * 60 * 1000))
      const gender = pet.gender ? pet.gender.charAt(0).toUpperCase() : "U"
      ageGender = `${ageYears}Y / ${gender}`
    }

    doc.setFont(undefined, "bold")
    doc.text("AGE / SEX:", leftCol, infoStartY + 24)
    doc.setFont(undefined, "normal")
    doc.text(ageGender, leftCol + 25, infoStartY + 24)

    // Right column
    doc.setFont(undefined, "bold")
    doc.text("SPECIMEN SITE:", rightCol, infoStartY)
    doc.setFont(undefined, "normal")
    doc.text((report.specimen_site || "N/A").toUpperCase(), rightCol + 35, infoStartY)

    doc.setFont(undefined, "bold")
    doc.text("COLLECTION DATE:", rightCol, infoStartY + 6)
    doc.setFont(undefined, "normal")
    doc.text(safeFormatDate(report.collection_date), rightCol + 35, infoStartY + 6)

    doc.setFont(undefined, "bold")
    doc.text("REPORT DATE:", rightCol, infoStartY + 12)
    doc.setFont(undefined, "normal")
    doc.text(safeFormatDate(report.report_date), rightCol + 35, infoStartY + 12)

    doc.setFont(undefined, "bold")
    doc.text("REFERRED BY:", rightCol, infoStartY + 18)
    doc.setFont(undefined, "normal")
    const referredBy = report.referred_by ? `DR. ${report.referred_by.toUpperCase()}` : "N/A"
    doc.text(referredBy, rightCol + 35, infoStartY + 18)

    doc.setFont(undefined, "bold")
    doc.text("STATUS:", rightCol, infoStartY + 24)
    doc.setFont(undefined, "normal")
    doc.text((report.status || "DRAFT").toUpperCase(), rightCol + 35, infoStartY + 24)

    y += 55

    // === CLINICAL OBSERVATIONS ===
    console.log("=== ADDING OBSERVATIONS ===")

    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.setTextColor(0, 51, 102)
    doc.text("CLINICAL OBSERVATIONS:", margin, y)
    y += 8

    // Observations box
    doc.setFillColor(252, 252, 252)
    doc.setDrawColor(220, 220, 220)
    const observationsHeight = 40
    doc.roundedRect(margin, y, pageWidth - margin * 2, observationsHeight, 2, 2, "FD")

    doc.setFontSize(10)
    doc.setFont(undefined, "normal")
    doc.setTextColor(0, 0, 0)

    if (report.observations) {
      const observationLines = doc.splitTextToSize(report.observations, pageWidth - margin * 2 - 10)
      let obsY = y + 8
      observationLines.forEach((line) => {
        if (obsY < y + observationsHeight - 5) {
          doc.text(line, margin + 5, obsY)
          obsY += 5
        }
      })
    } else {
      doc.text("No observations recorded.", margin + 5, y + 8)
    }

    y += observationsHeight + 15

    // === DIAGNOSTIC IMAGES ===
    if (report.images && report.images.length > 0) {
      console.log("=== ADDING DIAGNOSTIC IMAGES ===")

      doc.setFontSize(12)
      doc.setFont(undefined, "bold")
      doc.setTextColor(0, 51, 102)
      doc.text("DIAGNOSTIC IMAGES:", margin, y)
      y += 10

      let imageX = margin
      let imageY = y
      const imageWidth = 70
      const imageHeight = 50
      const imageSpacing = 10

      for (let i = 0; i < report.images.length; i++) {
        const imageUrl = report.images[i]
        console.log(`🔄 Processing diagnostic image ${i + 1}:`, imageUrl)

        // Check if we need a new row
        if (imageX + imageWidth > pageWidth - margin) {
          imageX = margin
          imageY += imageHeight + imageSpacing + 10
        }

        // Check if we need a new page
        if (imageY + imageHeight > pageHeight - 100) {
          doc.addPage()
          imageY = margin + 20
          imageX = margin
        }

        try {
          const imageData = await getImageAsBase64(imageUrl)
          if (imageData) {
            // Add image border
            doc.setDrawColor(200, 200, 200)
            doc.rect(imageX - 1, imageY - 1, imageWidth + 2, imageHeight + 2)

            // Add image
            const imageFormat = imageData.includes("data:image/png") ? "PNG" : "JPEG"
            doc.addImage(imageData, imageFormat, imageX, imageY, imageWidth, imageHeight)

            // Add image caption
            doc.setFontSize(8)
            doc.setFont(undefined, "italic")
            doc.setTextColor(100, 100, 100)
            doc.text(`Image ${i + 1}`, imageX, imageY + imageHeight + 8)

            console.log(`✅ Diagnostic image ${i + 1} added successfully`)
          } else {
            // Text placeholder for failed image
            doc.setDrawColor(200, 200, 200)
            doc.rect(imageX, imageY, imageWidth, imageHeight)
            doc.setFontSize(10)
            doc.setTextColor(150, 150, 150)
            doc.text(`Image ${i + 1}`, imageX + imageWidth / 2, imageY + imageHeight / 2 - 5, { align: "center" })
            doc.text("(Not Available)", imageX + imageWidth / 2, imageY + imageHeight / 2 + 5, { align: "center" })
            console.log(`❌ Failed to load diagnostic image ${i + 1}`)
          }
        } catch (error) {
          console.error(`❌ Error processing diagnostic image ${i + 1}:`, error)
        }

        // Move to next position
        imageX += imageWidth + imageSpacing
      }

      y = imageY + imageHeight + 20
    }

    // === SIGNATURES SECTION ===
    console.log("=== ADDING SIGNATURES ===")

    // Position signatures at bottom of page
    const signatureAreaY = pageHeight - 80

    // Ensure we have space for signatures
    if (y > signatureAreaY - 20) {
      doc.addPage()
      y = margin
    }

    if (template?.signature_fields && template.signature_fields.length > 0) {
      console.log("🔄 Processing signature fields:", template.signature_fields)

      // Signatures section header
      doc.setFontSize(12)
      doc.setFont(undefined, "bold")
      doc.setTextColor(0, 51, 102)
      doc.text("AUTHORIZED SIGNATURES:", margin, signatureAreaY - 10)

      const signaturesPerRow = Math.min(template.signature_fields.length, 2)
      const signatureWidth = (pageWidth - margin * 2 - 20) / signaturesPerRow

      for (let i = 0; i < template.signature_fields.length; i++) {
        const sig = template.signature_fields[i]
        console.log(`🔄 Processing signature ${i + 1}:`, sig)

        // Position for signature
        const currentSigX = margin + (i % signaturesPerRow) * signatureWidth
        const currentSigY = signatureAreaY + Math.floor(i / signaturesPerRow) * 50

        // Add signature image if available - use the exact saved signature_image_url
        if (sig.signature_image_url) {
          console.log("🔄 Processing signature image from template:", sig.signature_image_url)
          try {
            const sigImageData = await getImageAsBase64(sig.signature_image_url)
            if (sigImageData) {
              const imageFormat = sigImageData.includes("data:image/png") ? "PNG" : "JPEG"
              doc.addImage(sigImageData, imageFormat, currentSigX, currentSigY - 15, 60, 12)
              console.log(`✅ Signature image ${i + 1} added successfully`)
            } else {
              console.log(`❌ Failed to load signature image ${i + 1} - adding text placeholder`)
              // Add text placeholder for signature
              doc.setFontSize(10)
              doc.setTextColor(150, 150, 150)
              doc.text("SIGNATURE", currentSigX + 30, currentSigY - 9, { align: "center" })
              doc.setTextColor(0, 0, 0)
            }
          } catch (error) {
            console.error(`❌ Error adding signature image ${i + 1}:`, error)
            // Add text placeholder
            doc.setFontSize(10)
            doc.setTextColor(150, 150, 150)
            doc.text("SIGNATURE", currentSigX + 30, currentSigY - 9, { align: "center" })
            doc.setTextColor(0, 0, 0)
          }
        }

        // Signature line
        doc.setDrawColor(100, 100, 100)
        doc.setLineWidth(0.5)
        doc.line(currentSigX, currentSigY, currentSigX + 60, currentSigY)

        // Signature details
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)

        doc.setFont(undefined, "bold")
        doc.text(sig.name || "Veterinarian", currentSigX, currentSigY + 6)

        doc.setFont(undefined, "normal")
        doc.text(sig.title || "", currentSigX, currentSigY + 12)
        doc.text(sig.qualification || "", currentSigX, currentSigY + 18)
      }
    }

    // === FOOTER ===
    console.log("=== ADDING FOOTER ===")

    const addFooter = (docInstance, pageNum) => {
      const footerY = pageHeight - 20

      // Footer background
      docInstance.setFillColor(240, 248, 255)
      docInstance.rect(0, footerY - 8, pageWidth, 20, "F")

      // Footer content
      docInstance.setFontSize(8)
      docInstance.setTextColor(60, 60, 60)
      const footerText = template?.footer_text || "Thank you for choosing us for your pet's diagnostic needs."
      docInstance.text(footerText, pageWidth / 2, footerY - 2, { align: "center" })

      // Page number
      docInstance.text(`Page ${pageNum}`, pageWidth - margin, footerY - 2, { align: "right" })

      // Reset colors
      docInstance.setTextColor(0, 0, 0)
    }

    // Add footer to all pages
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      addFooter(doc, i)
    }

    console.log("✅ PDF generation completed successfully")
    return doc
  }

  const handleDownloadPDF = async (report) => {
    setIsLoadingPdf(report._id || report.id)
    try {
      console.log("Starting PDF download for report:", report.report_id)
      const doc = await generatePdfForReport(report)
      doc.save(`diagnostic-report-${report.report_id}.pdf`)
      console.log("PDF download completed")
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert(`Failed to download PDF: ${error.message}`)
    } finally {
      setIsLoadingPdf(null)
    }
  }

  const handleViewPDF = async (report) => {
    setIsLoadingPdf(report._id || report.id)
    try {
      console.log("Starting PDF view for report:", report.report_id)
      const doc = await generatePdfForReport(report)
      const url = doc.output("bloburl")
      setViewerState({
        isOpen: true,
        fileUrl: url.toString(),
        fileName: `diagnostic-report-${report.report_id}.pdf`,
      })
      console.log("PDF view completed")
    } catch (error) {
      console.error("Error viewing PDF:", error)
      alert(`Failed to generate PDF for viewing: ${error.message}`)
    } finally {
      setIsLoadingPdf(null)
    }
  }

  const closeViewer = () => {
    setViewerState({ isOpen: false, fileUrl: "", fileName: "" })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(5)
          .fill(0)
          .map((_, i) => (
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
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Found</h3>
        <p className="text-gray-600">Start by creating your first diagnostic report.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {reports.map((report) => {
          const pet = getPetInfo(report.pet_id)
          const client = getClientInfo(report.client_id)
          const clientName = client ? `${client.first_name} ${client.last_name}` : "Unknown Client"
          const template = getTemplateInfo(report.template_id)

          return (
            <Card key={report._id || report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <TestTube className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">Report #{report.report_id}</h3>
                        <Badge className={typeColors[report.report_type] || typeColors.other}>
                          {report.report_type.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge className={statusColors[report.status] || statusColors.draft}>
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
                            <span>
                              {pet.name} ({pet.species})
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{safeFormatDate(report.report_date)}</span>
                        </div>
                        {report.images && report.images.length > 0 && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="w-4 h-4" />
                            <span>{report.images.length} image(s)</span>
                          </div>
                        )}
                        {template && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>Template: {template.template_name}</span>
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
                      disabled={isLoadingPdf === (report._id || report.id)}
                      className="gap-1"
                    >
                      {isLoadingPdf === (report._id || report.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(report)}
                      disabled={isLoadingPdf === (report._id || report.id)}
                      className="gap-1"
                    >
                      {isLoadingPdf === (report._id || report.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(report)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
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
  )
}
