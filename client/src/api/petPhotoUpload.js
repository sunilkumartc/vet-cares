// Pet Photo Upload Service - Multi-tenant S3 integration
import ClientSessionManager from '@/lib/clientSession';

// Upload pet photo to S3 with tenant-specific organization
export const uploadPetPhoto = async (file, petId = null) => {
  try {
    console.log('Uploading pet photo to S3:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      petId 
    });
    
    // Validate file
    if (!file || !file.size) {
      throw new Error('Invalid file: file is empty or undefined');
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    // Get current tenant and client info
    const session = ClientSessionManager.getCurrentSession();
    if (!session || !session.tenant_id) {
      throw new Error('No tenant information available. Please log in again.');
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const sanitizedPetId = petId ? petId.replace(/[^a-zA-Z0-9]/g, '_') : 'new';
    const fileName = `pet_${sanitizedPetId}_${timestamp}.${fileExtension}`;
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('contentType', file.type);
    formData.append('fileType', 'pet-photo');
    formData.append('tenant_id', session.tenant_id);
    
    console.log('FormData created for pet photo upload:', {
      hasFile: formData.has('file'),
      hasFileName: formData.has('fileName'),
      hasContentType: formData.has('contentType'),
      hasFileType: formData.has('fileType'),
      hasTenantId: formData.has('tenant_id'),
      fileName,
      tenantId: session.tenant_id
    });
    
    // Upload via backend API
    const response = await fetch('/api/upload-to-s3', {
      method: 'POST',
      body: formData
    });
    
    console.log('Backend response status:', response.status);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('Pet photo upload failed with status:', response.status, errorData);
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Backend response data:', result);
    
    if (!result.success) {
      console.error('Pet photo upload failed:', result);
      throw new Error(result.error || 'Upload failed');
    }
    
    console.log('Pet photo upload successful:', result);
    
    return {
      success: true,
      url: result.url,
      fileName: result.fileName,
      bucket: result.bucket,
      isPublic: result.isPublic,
      size: result.size,
      s3Key: result.fileName // The S3 key for future reference
    };
  } catch (error) {
    console.error('Error uploading pet photo to S3:', {
      message: error.message,
      stack: error.stack,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });
    throw new Error(`Failed to upload pet photo to S3: ${error.message}`);
  }
};

// Delete pet photo from S3
export const deletePetPhoto = async (s3Key) => {
  try {
    console.log('Deleting pet photo from S3:', { s3Key });
    
    const session = ClientSessionManager.getCurrentSession();
    if (!session || !session.tenant_id) {
      throw new Error('No tenant information available. Please log in again.');
    }
    
    const response = await fetch('/api/delete-from-s3', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: s3Key,
        tenant_id: session.tenant_id
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Delete failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Delete failed');
    }
    
    console.log('Pet photo deleted successfully:', result);
    return result;
  } catch (error) {
    console.error('Error deleting pet photo from S3:', error);
    throw new Error(`Failed to delete pet photo from S3: ${error.message}`);
  }
};

// Validate pet photo file
export const validatePetPhoto = (file) => {
  const errors = [];
  
  // Check file size (max 5MB for pet photos)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push(`File size must be less than 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate preview URL for pet photo
export const generatePetPhotoPreview = (file) => {
  if (!file) return null;
  return URL.createObjectURL(file);
};

// Clean up preview URL to prevent memory leaks
export const cleanupPetPhotoPreview = (previewUrl) => {
  if (previewUrl && previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl);
  }
}; 