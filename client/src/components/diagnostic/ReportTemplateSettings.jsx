"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Settings, Save, X, Plus, Edit, Trash2, Upload, ArrowLeft, Loader2, ImageIcon } from "lucide-react"
import { TenantReportTemplate } from "@/api/tenant-entities"
import { UploadFile } from "@/api/integrations"

export default function ReportTemplateSettings({ templates, onSubmit }) {
  const { toast } = useToast()
  const [templateList, setTemplateList] = useState(templates || [])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingSignatureIndex, setUploadingSignatureIndex] = useState(null)

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

  const getDefaultTemplate = () => ({
    template_name: "",
    report_type: "cytology",
    clinic_name: "Dr. Ravi Pet Portal",
    clinic_address: "No. 32, 4th temple Street road, Malleshwaram, Bengaluru",
    clinic_phone: "082961 43115",
    clinic_email: "dr.ravi@example.com",
    logo_url: "",
    header_text: "",
    footer_text: "Thank you for choosing Dr. Ravi Pet Portal for your pet's diagnostic needs.",
    signature_fields: [
      {
        title: "Veterinary Pathologist",
        name: "",
        qualification: "",
        signature_image_url: "",
      },
    ],
    is_default: false,
    is_active: true,
  })

  const [formData, setFormData] = useState(getDefaultTemplate())

  useEffect(() => {
    setTemplateList(templates || [])
  }, [templates])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSignatureChange = (index, field, value) => {
    const newSignatures = [...formData.signature_fields]
    newSignatures[index] = { ...newSignatures[index], [field]: value }
    setFormData((prev) => ({ ...prev, signature_fields: newSignatures }))
  }

  const addSignatureField = () => {
    setFormData((prev) => ({
      ...prev,
      signature_fields: [...prev.signature_fields, { title: "", name: "", qualification: "", signature_image_url: "" }],
    }))
  }

  const removeSignatureField = (index) => {
    setFormData((prev) => ({
      ...prev,
      signature_fields: prev.signature_fields.filter((_, i) => i !== index),
    }))
  }

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF, etc.)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo must be less than 2MB",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const tenantId = getTenantId()
      const staffSession = getStaffSession()

      if (!tenantId) {
        throw new Error("Tenant ID not found. Please log in again.")
      }

      // Prepare form data for upload
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split(".").pop()
      const fileName = `report-templates/logos/${tenantId}-logo-${timestamp}.${fileExtension}`

      uploadFormData.append("fileName", fileName)
      uploadFormData.append("contentType", file.type || "application/octet-stream")
      uploadFormData.append("tenant_id", tenantId)

      console.log("Uploading logo with tenant_id:", tenantId)

      // Upload file
      const response = await UploadFile(uploadFormData)
      const logoUrl = response?.url || response?.Location || response?.file_url

      if (!logoUrl) {
        throw new Error("No URL returned from upload")
      }

      console.log("Logo uploaded successfully:", logoUrl)

      // Update form data with new logo URL
      handleChange("logo_url", logoUrl)

      toast({
        title: "Logo uploaded successfully",
        description: "Your clinic logo has been uploaded",
        variant: "default",
      })
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast({
        title: "Upload failed",
        description: `Failed to upload logo: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSignatureImageUpload = async (event, index) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF, etc.)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Signature image must be less than 2MB",
        variant: "destructive",
      })
      return
    }

    setUploadingSignatureIndex(index)

    try {
      const tenantId = getTenantId()
      const staffSession = getStaffSession()

      if (!tenantId) {
        throw new Error("Tenant ID not found. Please log in again.")
      }

      // Prepare form data for upload
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split(".").pop()
      const fileName = `report-templates/signatures/${tenantId}-signature-${index}-${timestamp}.${fileExtension}`

      uploadFormData.append("fileName", fileName)
      uploadFormData.append("contentType", file.type || "application/octet-stream")
      uploadFormData.append("tenant_id", tenantId)

      console.log("Uploading signature with tenant_id:", tenantId)

      // Upload file
      const response = await UploadFile(uploadFormData)
      const signatureUrl = response?.url || response?.Location || response?.file_url

      if (!signatureUrl) {
        throw new Error("No URL returned from upload")
      }

      console.log("Signature uploaded successfully:", signatureUrl)

      // Update signature field with new image URL
      handleSignatureChange(index, "signature_image_url", signatureUrl)

      toast({
        title: "Signature uploaded successfully",
        description: "Signature image has been uploaded",
        variant: "default",
      })
    } catch (error) {
      console.error("Error uploading signature:", error)
      toast({
        title: "Upload failed",
        description: `Failed to upload signature: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setUploadingSignatureIndex(null)
    }
  }

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template)
    setFormData({ ...getDefaultTemplate(), ...template }) // Ensure all fields are present
    setIsEditing(true)
  }

  const handleNewTemplate = () => {
    setSelectedTemplate(null)
    setFormData(getDefaultTemplate())
    setIsEditing(true)
  }

  const validateForm = () => {
    const errors = []

    if (!formData.template_name?.trim()) {
      errors.push("Template name is required")
    }

    if (!formData.report_type) {
      errors.push("Report type is required")
    }

    if (!formData.clinic_name?.trim()) {
      errors.push("Clinic name is required")
    }

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(", "),
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSaveTemplate = async () => {
    if (!validateForm()) {
      return
    }

    setSaving(true)

    try {
      const tenantId = getTenantId()
      const staffSession = getStaffSession()

      if (!tenantId) {
        throw new Error("Tenant ID not found. Please log in again.")
      }

      // Prepare template data
      const templateData = {
        ...formData,
        tenant_id: tenantId,
        // Ensure signature fields are properly formatted
        signature_fields: formData.signature_fields.map((sig) => ({
          title: sig.title?.trim() || "",
          name: sig.name?.trim() || "",
          qualification: sig.qualification?.trim() || "",
          signature_image_url: sig.signature_image_url || "",
        })),
      }

      console.log("Saving template data:", JSON.stringify(templateData, null, 2))

      let result
      if (selectedTemplate) {
        // Update existing template
        result = await TenantReportTemplate.update(selectedTemplate.id, templateData)
        console.log("Template updated:", result)
      } else {
        // Create new template
        result = await TenantReportTemplate.create(templateData)
        console.log("Template created:", result)
      }

      // Reset form and state
      setIsEditing(false)
      setSelectedTemplate(null)
      setFormData(getDefaultTemplate())

      // Notify parent to refetch templates
      if (onSubmit) {
        onSubmit()
      }

      toast({
        title: "Template saved successfully",
        description: selectedTemplate ? "Template has been updated" : "New template has been created",
        variant: "default",
      })
    } catch (error) {
      console.error("Error saving template:", error)
      toast({
        title: "Save failed",
        description: `Failed to save template: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (template) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the template "${template.template_name}"? This action cannot be undone.`,
    )

    if (!confirmed) return

    try {
      await TenantReportTemplate.delete(template.id)

      // Update local state
      setTemplateList((prev) => prev.filter((t) => t.id !== template.id))

      // Notify parent to refetch templates
      if (onSubmit) {
        onSubmit()
      }

      toast({
        title: "Template deleted successfully",
        description: `Template "${template.template_name}" has been deleted`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Delete failed",
        description: `Failed to delete template: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setSelectedTemplate(null)
    setFormData(getDefaultTemplate())
  }

  const removeLogo = () => {
    handleChange("logo_url", "")
  }

  const removeSignatureImage = (index) => {
    handleSignatureChange(index, "signature_image_url", "")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Templates</h2>
          <p className="text-gray-600">Configure templates for diagnostic reports</p>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <Button onClick={handleNewTemplate} className="gap-2">
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templateList.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{template.report_type.replace("_", " ").toUpperCase()}</Badge>
                      {template.is_default && <Badge className="bg-green-100 text-green-800">Default</Badge>}
                      {!template.is_active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{template.clinic_name}</p>
                {template.logo_url && (
                  <div className="mb-4">
                    <img
                      src={template.logo_url || "/placeholder.svg"}
                      alt="Template Logo"
                      className="h-8 w-auto object-contain"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleTemplateSelect(template)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="max-w-7xl mx-auto w-full">
          <CardHeader className="relative">
            {/* Back Arrow Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="absolute top-2 left-2 p-0 w-16 h-16 hover:bg-transparent flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft className="w-12 h-12 text-gray-600 hover:text-blue-800" />
            </Button>
            <CardTitle className="flex items-center justify-center gap-2 text-center">
              <Settings className="w-5 h-5" />
              {selectedTemplate ? "Edit Template" : "New Template"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="signatures">Signatures</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template_name">
                      Template Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="template_name"
                      value={formData.template_name}
                      onChange={(e) => handleChange("template_name", e.target.value)}
                      placeholder="e.g., Standard Cytology Template"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report_type">
                      Report Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.report_type} onValueChange={(value) => handleChange("report_type", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cytology">Cytology</SelectItem>
                        <SelectItem value="histopathology">Histopathology</SelectItem>
                        <SelectItem value="blood_work">Blood Work</SelectItem>
                        <SelectItem value="urine_analysis">Urine Analysis</SelectItem>
                        <SelectItem value="fecal_exam">Fecal Exam</SelectItem>
                        <SelectItem value="skin_scraping">Skin Scraping</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinic_name">
                    Clinic Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="clinic_name"
                    value={formData.clinic_name}
                    onChange={(e) => handleChange("clinic_name", e.target.value)}
                    placeholder="Your clinic name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinic_address">Clinic Address</Label>
                  <Textarea
                    id="clinic_address"
                    value={formData.clinic_address}
                    onChange={(e) => handleChange("clinic_address", e.target.value)}
                    placeholder="Full clinic address"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinic_phone">Phone</Label>
                    <Input
                      id="clinic_phone"
                      value={formData.clinic_phone}
                      onChange={(e) => handleChange("clinic_phone", e.target.value)}
                      placeholder="Clinic phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic_email">Email</Label>
                    <Input
                      id="clinic_email"
                      value={formData.clinic_email}
                      onChange={(e) => handleChange("clinic_email", e.target.value)}
                      placeholder="Clinic email address"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="branding" className="pt-4 space-y-4">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Clinic Logo</Label>
                  <div className="flex items-start gap-4">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        {formData.logo_url ? (
                          <img
                            src={formData.logo_url || "/placeholder.svg"}
                            alt="Clinic Logo"
                            className="w-20 h-20 object-contain rounded"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                          accept=".jpg,.jpeg,.png,.gif,.svg"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("logo-upload").click()}
                          disabled={uploading}
                          className="gap-2"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              {formData.logo_url ? "Change Logo" : "Upload Logo"}
                            </>
                          )}
                        </Button>
                        {formData.logo_url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={removeLogo}
                            className="gap-2 text-red-600 hover:text-red-700 bg-transparent"
                          >
                            <X className="w-4 h-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>• Recommended size: 200x200 pixels</p>
                        <p>• Maximum file size: 2MB</p>
                        <p>• Supported formats: JPG, PNG, GIF, SVG</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="header_text">Header Text</Label>
                  <Textarea
                    id="header_text"
                    value={formData.header_text}
                    onChange={(e) => handleChange("header_text", e.target.value)}
                    placeholder="Additional text to appear in the header"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer_text">Footer Text</Label>
                  <Textarea
                    id="footer_text"
                    value={formData.footer_text}
                    onChange={(e) => handleChange("footer_text", e.target.value)}
                    placeholder="Text to appear in the footer"
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="signatures" className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Signature Fields</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSignatureField}
                    className="gap-1 bg-transparent"
                  >
                    <Plus className="w-4 h-4" />
                    Add Signature
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.signature_fields &&
                    formData.signature_fields.map((signature, index) => (
                      <Card key={index} className="p-4 bg-gray-50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={signature.title}
                                onChange={(e) => handleSignatureChange(index, "title", e.target.value)}
                                placeholder="e.g., Veterinary Pathologist"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input
                                value={signature.name}
                                onChange={(e) => handleSignatureChange(index, "name", e.target.value)}
                                placeholder="Doctor's name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Qualification</Label>
                              <Input
                                value={signature.qualification}
                                onChange={(e) => handleSignatureChange(index, "qualification", e.target.value)}
                                placeholder="e.g., DVM, PhD"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <Label className="text-base font-medium">Signature Image</Label>
                            <div className="flex items-start gap-4">
                              {/* Signature Preview */}
                              <div className="flex-shrink-0">
                                <div className="w-24 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white">
                                  {signature.signature_image_url ? (
                                    <img
                                      src={signature.signature_image_url || "/placeholder.svg"}
                                      alt="Signature"
                                      className="w-20 h-12 object-contain rounded"
                                    />
                                  ) : (
                                    <ImageIcon className="w-6 h-6 text-gray-400" />
                                  )}
                                </div>
                              </div>

                              {/* Upload Controls */}
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    onChange={(e) => handleSignatureImageUpload(e, index)}
                                    className="hidden"
                                    id={`signature-upload-${index}`}
                                    accept=".jpg,.jpeg,.png,.gif"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`signature-upload-${index}`).click()}
                                    disabled={uploadingSignatureIndex === index}
                                    className="gap-2"
                                  >
                                    {uploadingSignatureIndex === index ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-4 h-4" />
                                        {signature.signature_image_url ? "Change" : "Upload"}
                                      </>
                                    )}
                                  </Button>
                                  {signature.signature_image_url && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeSignatureImage(index)}
                                      className="gap-2 text-red-600 hover:text-red-700 bg-transparent"
                                    >
                                      <X className="w-4 h-4" />
                                      Remove
                                    </Button>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  <p>• Max size: 2MB</p>
                                  <p>• JPG, PNG, GIF</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end mt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSignatureField(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-6 mt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
