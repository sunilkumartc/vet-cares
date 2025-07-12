import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/contexts/ThemeContext';
import { TenantManager } from '@/lib/tenant';
import { 
  Building2, 
  Upload, 
  X, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ClinicProfile() {
  const { getTenantInfo, reloadTheme } = useTheme();
  const { toast } = useToast();
  const tenant = getTenantInfo();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [s3Configured, setS3Configured] = useState(false);
  const [formData, setFormData] = useState({
    clinicName: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: ''
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        clinicName: tenant.clinic_name || tenant.name || '',
        tagline: tenant.tagline || '',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        website: tenant.website || '',
        description: tenant.description || ''
      });
      
      // Set logo preview if exists
      if (tenant.logo_url) {
        setLogoPreview(tenant.logo_url);
      }
    }
  }, [tenant]);

  // Check S3 configuration status
  useEffect(() => {
    const checkS3Status = async () => {
      try {
        // Add cache-busting parameter to prevent 304 responses
        const cacheBuster = Date.now();
        const response = await fetch(`/api/s3-status?_t=${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('S3 status check result:', result);
          setS3Configured(result.configured);
          if (!result.configured) {
            console.log('S3 not configured, will use local storage fallback');
          } else {
            console.log('S3 is configured and ready');
          }
        } else {
          console.warn('S3 status check failed with status:', response.status);
          setS3Configured(false);
        }
      } catch (error) {
        console.warn('Failed to check S3 status:', error);
        setS3Configured(false);
      }
    };
    
    checkS3Status();
  }, []);

  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be less than 2MB",
          variant: "destructive"
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;

    try {
      // First try S3 upload if configured
      if (s3Configured) {
        try {
          const formData = new FormData();
          formData.append('file', logoFile);
          
          // Generate a unique filename for the logo
          const timestamp = Date.now();
          const fileExtension = logoFile.name.split('.').pop();
          const fileName = `clinic-logos/${tenant?.slug || 'default'}-logo-${timestamp}.${fileExtension}`;
          formData.append('fileName', fileName);

          const response = await fetch('/api/upload-to-s3', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            console.log('S3 upload successful:', result);
            return result.url;
          } else {
            const errorData = await response.json();
            console.warn('S3 upload failed, falling back to local storage:', errorData);
            throw new Error('S3 upload failed');
          }
        } catch (s3Error) {
          console.warn('S3 upload error, falling back to local storage:', s3Error);
        }
      } else {
        console.log('S3 not configured, using local storage directly');
      }
        
      // Fallback to local storage upload
      const formData = new FormData();
      formData.append('logo', logoFile);
      formData.append('category', 'clinic_logo');

      const currentTenant = TenantManager.getCurrentTenant();
      const headers = {};
      if (currentTenant && currentTenant._id) {
        headers['X-Tenant-ID'] = currentTenant._id;
      }

      const response = await fetch('/api/upload-clinic-logo', {
        method: 'POST',
        headers,
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Local storage upload successful:', result);
        return result.url;
      } else {
        throw new Error('Both S3 and local storage upload failed');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      let logoUrl = null;
      
      // Upload logo if new file selected
      if (logoFile) {
        logoUrl = await uploadLogo();
        // Update the preview with the new logo URL
        if (logoUrl) {
          setLogoPreview(logoUrl);
        }
      } else if (logoPreview && logoPreview.startsWith('data:')) {
        // If preview is a data URL, it means we need to upload it
        logoUrl = await uploadLogo();
        // Update the preview with the new logo URL
        if (logoUrl) {
          setLogoPreview(logoUrl);
        }
      } else if (logoPreview) {
        // Keep existing logo URL
        logoUrl = logoPreview;
      }

      // Update clinic profile
      const updateData = {
        ...formData,
        logo_url: logoUrl
      };

      const currentTenant = TenantManager.getCurrentTenant();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (currentTenant && currentTenant._id) {
        headers['X-Tenant-ID'] = currentTenant._id;
      }

      const response = await fetch('/api/clinic/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the local tenant cache with the new data
        const updatedTenant = {
          ...tenant,
          clinic_name: formData.clinicName,
          tagline: formData.tagline,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          description: formData.description,
          logo_url: logoUrl
        };
        console.log('Updating tenant cache with new logo URL:', logoUrl);
        TenantManager.setCurrentTenant(updatedTenant);
        
        toast({
          title: "Profile updated successfully",
          description: "Your clinic profile has been saved",
          variant: "default"
        });

        // Reload theme to update header with new logo and clinic name
        await reloadTheme();
        
        // Clear logo file since it's now uploaded
        setLogoFile(null);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update failed",
        description: "Failed to update clinic profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (tenant) {
      setFormData({
        clinicName: tenant.clinic_name || tenant.name || '',
        tagline: tenant.tagline || '',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        website: tenant.website || '',
        description: tenant.description || ''
      });
      
      if (tenant.logo_url) {
        setLogoPreview(tenant.logo_url);
      } else {
        setLogoPreview(null);
      }
      setLogoFile(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Clinic Profile
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
                      src={logoPreview} 
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
                    onClick={() => document.getElementById('logo-upload').click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                  {logoPreview && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeLogo}
                      className="gap-2 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </Button>
                  )}
                </div>
                
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                
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
              <Label htmlFor="clinicName">Clinic Name *</Label>
              <Input
                id="clinicName"
                value={formData.clinicName}
                onChange={(e) => handleInputChange('clinicName', e.target.value)}
                placeholder="Enter clinic name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => handleInputChange('tagline', e.target.value)}
                placeholder="e.g., Caring for your pets with love and expertise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="clinic@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.clinic.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
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
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Tell clients about your clinic, services, and expertise..."
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving || !formData.clinicName.trim()}
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
            
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </Button>
          </div>

          {/* Preview Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">Header Preview</h4>
            <div className="flex items-center space-x-4 p-3 bg-white rounded border">
              {logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="Clinic Logo" 
                  className="h-8 w-auto"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {formData.clinicName || 'Your Clinic Name'}
                </h1>
                {formData.tagline && (
                  <p className="text-sm text-gray-600">
                    {formData.tagline}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 