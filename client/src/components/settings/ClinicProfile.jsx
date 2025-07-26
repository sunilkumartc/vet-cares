"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useTheme } from "@/contexts/ThemeContext"
import { TenantManager } from "@/lib/tenant"
import { Building2, Upload, X, Save, Loader2, ImageIcon, AlertCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { UploadFile } from "@/api/integrations"

export default function ClinicProfile() {
  const { getTenantInfo, reloadTheme } = useTheme()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true) // Start with loading true
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [formData, setFormData] = useState({
    clinicName: "",
    tagline: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    description: "",
  })
  const [errors, setErrors] = useState({})
  const [actualTenantData, setActualTenantData] = useState(null)

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

  // Helper function to get tenant ID from staff session
  const getTenantId = () => {
    const staffSession = getStaffSession()
    const tenantId = staffSession?.tenant_id
    console.log("Getting tenant ID from staff session:", tenantId)
    return tenantId
  }

  // Function to fetch actual tenant data from the database
  const fetchActualTenantData = async () => {
    try {
      const staffSession = getStaffSession()
      const tenantId = getTenantId()

      console.log("=== FETCHING ACTUAL TENANT DATA ===")
      console.log("Staff session:", staffSession)
      console.log("Tenant ID:", tenantId)

      if (!tenantId) {
        throw new Error("No tenant ID found in staff session")
      }

      const response = await fetch("/api/clinic/profile", {
        method: "GET",
        headers: {
          "X-Tenant-ID": tenantId,
          Authorization: staffSession?.token ? `Bearer ${staffSession.token}` : undefined,
          "Content-Type": "application/json",
        },
      })

      console.log("Fetch response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Fetch error response:", errorText)
        throw new Error(`Failed to fetch tenant data: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("=== RAW TENANT DATA FROM SERVER ===")
      console.log(JSON.stringify(data, null, 2))

      // Create proper tenant object from the response
      const tenantData = {
        _id: tenantId,
        id: tenantId,
        tenant_id: tenantId,
        clinic_name: data.clinic_name || data.name || "",
        name: data.name || data.clinic_name || "",
        tagline: data.tagline || "",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        website: data.website || "",
        description: data.description || "",
        logo_url: data.logo_url || null,
        slug: staffSession?.slug || "default",
      }

      console.log("=== PROCESSED TENANT DATA ===")
      console.log(JSON.stringify(tenantData, null, 2))

      setActualTenantData(tenantData)

      // Update the form with actual data
      setFormData({
        clinicName: tenantData.clinic_name || tenantData.name || "",
        tagline: tenantData.tagline || "",
        address: tenantData.address || "",
        phone: tenantData.phone || "",
        email: tenantData.email || "",
        website: tenantData.website || "",
        description: tenantData.description || "",
      })

      if (tenantData.logo_url) {
        setLogoPreview(tenantData.logo_url)
      }

      // Update the tenant cache with correct data
      TenantManager.setCurrentTenant(tenantData)

      return tenantData
    } catch (error) {
      console.error("Error fetching actual tenant data:", error)
      toast({
        title: "Failed to load clinic data",
        description: `Error: ${error.message}`,
        variant: "destructive",
      })
      throw error
    }
  }

  // Load actual tenant data on component mount
  useEffect(() => {
    const loadTenantData = async () => {
      setLoading(true)
      try {
        await fetchActualTenantData()
      } catch (error) {
        console.error("Failed to load tenant data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadTenantData()
  }, []) // Only run once on mount

  // Validation function
  const validateForm = () => {
    const newErrors = {}

    // Clinic name is required
    if (!formData.clinicName || !formData.clinicName.trim()) {
      newErrors.clinicName = "Clinic name is required"
    } else if (formData.clinicName.trim().length < 2) {
      newErrors.clinicName = "Clinic name must be at least 2 characters"
    }

    // Email validation if provided
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email address"
      }
    }

    // Website validation if provided
    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website.trim())
      } catch {
        newErrors.website = "Please enter a valid website URL (e.g., https://example.com)"
      }
    }

    // Phone validation if provided
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
      if (!phoneRegex.test(formData.phone.replace(/[\s\-$$$$]/g, ""))) {
        newErrors.phone = "Please enter a valid phone number"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogoChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        })
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be less than 2MB",
          variant: "destructive",
        })
        return
      }

      setLogoFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }))
    }
  }

  const uploadLogo = async () => {
    if (!logoFile) return null

    try {
      const tenantId = getTenantId()
      const formData = new FormData()
      formData.append("file", logoFile)

      const timestamp = Date.now()
      const fileExtension = logoFile.name.split(".").pop()
      const fileName = `clinic-logos/${actualTenantData?.slug || tenantId || "default"}-logo-${timestamp}.${fileExtension}`

      formData.append("fileName", fileName)
      formData.append("contentType", logoFile.type || "application/octet-stream")
      formData.append("tenant_id", tenantId || "default")

      console.log("Uploading logo with tenant_id:", tenantId)

      const response = await UploadFile(formData)
      const logoUrl = response?.url || response?.Location || response?.file_url

      if (!logoUrl) {
        throw new Error("No URL returned from upload")
      }

      console.log("Logo uploaded successfully:", logoUrl)
      return logoUrl
    } catch (error) {
      console.error("Logo upload error:", error)
      toast({
        title: "Upload failed",
        description: `Failed to upload logo: ${error.message}. Please try a smaller file or different format.`,
        variant: "destructive",
      })
      throw error
    }
  }

  const handleSave = async () => {
    // Validate form first
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below before saving.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      // Get staff session and tenant ID at the beginning
      const staffSession = getStaffSession()
      const tenantId = getTenantId()

      if (!tenantId) {
        throw new Error("Tenant ID not found. Please log in again.")
      }

      console.log("=== SAVING WITH TENANT ID ===", tenantId)

      let logoUrl = null

      // Handle logo upload
      if (logoFile) {
        logoUrl = await uploadLogo()
        if (logoUrl) {
          setLogoPreview(logoUrl)
        }
      } else if (logoPreview && logoPreview.startsWith("data:")) {
        logoUrl = await uploadLogo()
        if (logoUrl) {
          setLogoPreview(logoUrl)
        }
      } else if (logoPreview) {
        logoUrl = logoPreview
      }

      // Prepare update data - ensure clinic name is properly set
      const clinicNameValue = formData.clinicName.trim()

      // Create the update data to match backend expectations
      const updateData = {
        clinicName: clinicNameValue,
        tagline: formData.tagline.trim() || null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        description: formData.description.trim() || null,
        logo_url: logoUrl || null,
        tenant_id: tenantId,
      }

      // Remove any undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      console.log("=== SENDING UPDATE DATA ===")
      console.log(JSON.stringify(updateData, null, 2))

      // Prepare headers
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Tenant-ID": tenantId,
      }

      // Add authentication token if available
      if (staffSession?.token) {
        headers["Authorization"] = `Bearer ${staffSession.token}`
      }

      const response = await fetch("/api/clinic/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify(updateData),
      })

      const responseText = await response.text()
      console.log("=== SAVE RESPONSE ===")
      console.log("Status:", response.status)
      console.log("Response:", responseText)

      if (!response.ok) {
        let errorData = {}
        try {
          errorData = JSON.parse(responseText)
        } catch (e) {
          console.error("Failed to parse error response")
        }

        const errorMessage =
          errorData.message ||
          errorData.error ||
          errorData.details ||
          `Server error: ${response.status} ${response.statusText}`

        throw new Error(errorMessage)
      }

      // Parse successful response
      let result = {}
      try {
        result = JSON.parse(responseText)
        console.log("Save successful:", result)
      } catch (e) {
        console.error("Failed to parse success response:", e.message)
        result = { success: true, message: "Profile updated" }
      }

      // IMPORTANT: Fetch fresh data after save to ensure consistency
      console.log("=== FETCHING FRESH DATA AFTER SAVE ===")
      await fetchActualTenantData()

      toast({
        title: "Profile updated successfully",
        description: "Your clinic profile has been saved",
        variant: "default",
      })

      // Reload theme to update header
      await reloadTheme()

      // Clear logo file since it's now uploaded
      setLogoFile(null)
    } catch (error) {
      console.error("Profile update error:", error)
      toast({
        title: "Update failed",
        description: `Failed to update clinic profile: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchActualTenantData()
      toast({
        title: "Data refreshed",
        description: "Loaded latest data from server",
        variant: "default",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleReset = () => {
    if (actualTenantData) {
      setFormData({
        clinicName: actualTenantData.clinic_name || actualTenantData.name || "",
        tagline: actualTenantData.tagline || "",
        address: actualTenantData.address || "",
        phone: actualTenantData.phone || "",
        email: actualTenantData.email || "",
        website: actualTenantData.website || "",
        description: actualTenantData.description || "",
      })

      if (actualTenantData.logo_url) {
        setLogoPreview(actualTenantData.logo_url)
      } else {
        setLogoPreview(null)
      }
      setLogoFile(null)
      setErrors({})
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading clinic data...</span>
      </div>
    )
  }

  // Get current session info for debugging
  const staffSession = getStaffSession()
  const currentTenantId = getTenantId()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Clinic Profile
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2 bg-transparent"
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh Data
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Clinic Logo</Label>
            <div className="flex items-start gap-4">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  {logoPreview ? (
                    <img
                      src={logoPreview || "/placeholder.svg"}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("logo-upload").click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </Button>
                  {logoPreview && (
                    <Button
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
                <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                <div className="text-sm text-gray-600">
                  <p>• Recommended size: 200x200 pixels</p>
                  <p>• Maximum file size: 2MB</p>
                  <p>• Supported formats: JPG, PNG, GIF, SVG</p>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">
                Clinic Name *<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="clinicName"
                value={formData.clinicName}
                onChange={(e) => handleInputChange("clinicName", e.target.value)}
                placeholder="Enter clinic name"
                className={errors.clinicName ? "border-red-500" : ""}
              />
              {errors.clinicName && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.clinicName}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => handleInputChange("tagline", e.target.value)}
                placeholder="e.g., Caring for your pets with love and expertise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.phone}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="clinic@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder="https://www.clinic.com"
                className={errors.website ? "border-red-500" : ""}
              />
              {errors.website && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.website}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="123 Main St, City, State 12345"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Clinic Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Tell clients about your clinic, services, and expertise..."
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving || !formData.clinicName.trim() || !currentTenantId}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              Reset
            </Button>
          </div>

          {/* Show warning if no tenant ID */}
          {!currentTenantId && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">⚠️ No tenant ID found</p>
              <p className="text-red-600 text-sm">Please log in again to continue.</p>
            </div>
          )}

          {/* Debug Information (remove in production) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium mb-2 text-yellow-800">Debug Info</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>
                  <strong>Form Clinic Name:</strong> "{formData.clinicName}" (length: {formData.clinicName.length})
                </p>
                <p>
                  <strong>Staff Session Tenant ID:</strong> {staffSession?.tenant_id || "Not found"}
                </p>
                <p>
                  <strong>Staff Session Email:</strong> {staffSession?.email || "Not found"}
                </p>
                <p>
                  <strong>Final Tenant ID:</strong> {currentTenantId || "Not found"}
                </p>
                <p>
                  <strong>Current Logo URL:</strong> {logoPreview || "None"}
                </p>
                <p>
                  <strong>Has Logo File:</strong> {logoFile ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Form Valid:</strong> {Object.keys(errors).length === 0 ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Actual Tenant Data:</strong>{" "}
                  {actualTenantData ? JSON.stringify(actualTenantData, null, 2) : "None"}
                </p>
                <p>
                  <strong>Theme Tenant Object:</strong>{" "}
                  {getTenantInfo() ? JSON.stringify(getTenantInfo(), null, 2) : "None"}
                </p>
              </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">Header Preview</h4>
            <div className="flex items-center space-x-4 p-3 bg-white rounded border">
              {logoPreview ? (
                <img src={logoPreview || "/placeholder.svg"} alt="Clinic Logo" className="h-8 w-auto" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{formData.clinicName || "Your Clinic Name"}</h1>
                {formData.tagline && <p className="text-sm text-gray-600">{formData.tagline}</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
