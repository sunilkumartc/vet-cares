// Medical Record File Upload API with S3 multi-tenant directory structure
const API_BASE_URL = '/api';

class MedicalFileUploadAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async getCurrentTenant() {
    try {
      const response = await fetch(`${this.baseURL}/tenant/current`);
      if (!response.ok) {
        throw new Error('Failed to get current tenant');
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting current tenant:', error);
      throw error;
    }
  }

  async uploadMedicalFile(file, category, metadata = {}) {
    try {
      // Get current tenant for directory structure
      const tenant = await this.getCurrentTenant();
      if (!tenant) {
        throw new Error('No tenant found');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Generate proper file path for multi-tenant structure
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = file.name.split('.').pop();
      const fileName = `${category}_${timestamp}.${fileExtension}`;
      
      // Create S3 directory structure: medical-records/{tenant_id}/{category}/{year}/{month}/
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const s3Path = `medical-records/${tenant._id || tenant.id}/${category}/${year}/${month}/${fileName}`;
      
      formData.append('fileName', s3Path);
      formData.append('contentType', file.type || 'application/octet-stream');
      formData.append('category', category);
      formData.append('tenant_id', tenant._id || tenant.id);
      
      // Add metadata
      Object.keys(metadata).forEach(key => {
        formData.append(`metadata_${key}`, metadata[key]);
      });

      console.log('Uploading medical file:', {
        fileName: file.name,
        s3Path,
        category,
        tenant: tenant.name,
        size: file.size,
        type: file.type
      });

      // Upload via backend API
      const response = await fetch(`${this.baseURL}/upload-medical-file`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Medical file upload failed:', response.status, errorData);
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('Medical file upload failed:', result);
        throw new Error(result.error || 'Upload failed');
      }

      console.log('Medical file upload successful:', result);

      return {
        fileId: result.fileId,
        url: result.url,
        fileName: file.name,
        s3Path: result.s3Path,
        category: category,
        size: result.size,
        contentType: file.type,
        uploadedAt: result.uploadedAt,
        metadata: result.metadata
      };

    } catch (error) {
      console.error('Error uploading medical file:', error);
      throw new Error(`Failed to upload medical file: ${error.message}`);
    }
  }

  async uploadLabReport(file, metadata = {}) {
    return this.uploadMedicalFile(file, 'lab-reports', {
      ...metadata,
      documentType: 'lab-report'
    });
  }

  async uploadRadiologyReport(file, metadata = {}) {
    return this.uploadMedicalFile(file, 'radiology-reports', {
      ...metadata,
      documentType: 'radiology-report'
    });
  }

  async uploadOtherDocument(file, metadata = {}) {
    return this.uploadMedicalFile(file, 'other-documents', {
      ...metadata,
      documentType: 'other-document'
    });
  }

  async deleteMedicalFile(fileId, category) {
    try {
      const tenant = await this.getCurrentTenant();
      
      const response = await fetch(`${this.baseURL}/delete-medical-file`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          category,
          tenant_id: tenant._id || tenant.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Delete failed with status ${response.status}`);
      }

      const result = await response.json();
      return result.success;

    } catch (error) {
      console.error('Error deleting medical file:', error);
      throw new Error(`Failed to delete medical file: ${error.message}`);
    }
  }

  async getMedicalFiles(category, filters = {}) {
    try {
      const tenant = await this.getCurrentTenant();
      
      const params = new URLSearchParams({
        category,
        tenant_id: tenant._id || tenant.id,
        ...filters
      });

      const response = await fetch(`${this.baseURL}/medical-files?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get medical files: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting medical files:', error);
      throw new Error(`Failed to get medical files: ${error.message}`);
    }
  }

  // Helper method to validate file types
  validateFileType(file, allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'tiff', 'bmp']) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    // Check file extension
    if (!allowedTypes.includes(fileExtension)) {
      throw new Error(`File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    // Check MIME type for common medical file types
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/tiff',
      'image/bmp'
    ];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed for medical documents`);
    }
    
    return true;
  }

  // Helper method to validate file size (default 10MB)
  validateFileSize(file, maxSizeMB = 10) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${maxSizeMB}MB`);
    }
    return true;
  }
}

// Create and export instance
const medicalFileUploadAPI = new MedicalFileUploadAPI();

export default medicalFileUploadAPI;
export { MedicalFileUploadAPI }; 