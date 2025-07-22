// Mock integrations - replace with actual implementations as needed
// These were previously provided by Base44 SDK


export const Core = {
  InvokeLLM: async (prompt, options = {}) => {
    console.log('Mock LLM invocation:', { prompt, options });
    return {
      response: `Mock response to: ${prompt}`,
      tokens: 100,
      model: 'mock-model'
    };
  },
  
  SendEmail: async (to, subject, body, options = {}) => {
    console.log('Mock email sent:', { to, subject, body, options });
    return {
      messageId: `mock-${Date.now()}`,
      status: 'sent'
    };
  },
  
  UploadFile: async (formData) => { // Accept formData directly
    console.log('Starting S3 upload...');
    
    try {
      // Extract from formData for logging
      const file = formData.get('file');
      const fileName = formData.get('fileName');
      const contentType = formData.get('contentType');
      const tenantId = formData.get('tenant_id') || 'general'; // Default to 'general' if missing
      
      console.log('Upload details:', {
        fileName,
        contentType,
        tenantId,
        fileSize: file ? file.size : 'No file'
      });

      // Upload via backend API
      const response = await fetch('/api/upload-to-s3', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('S3 upload failed with status:', response.status, errorData);
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('S3 upload failed:', result);
        throw new Error(result.error || 'Upload failed');
      }
      
      console.log('S3 upload successful:', result);
      
      return {
        fileId: result.fileName,
        url: result.url, // Ensure this is the full public URL
        size: result.size,
        bucket: result.bucket,
        isPublic: result.isPublic
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  },
  
  GenerateImage: async (prompt, options = {}) => {
    console.log('Mock image generation:', { prompt, options });
    return {
      imageId: `mock-image-${Date.now()}`,
      url: 'https://via.placeholder.com/512x512?text=Mock+Image',
      prompt: prompt
    };
  },
  
  ExtractDataFromUploadedFile: async (fileId, options = {}) => {
    console.log('Mock data extraction:', { fileId, options });
    return {
      extractedData: {
        text: 'Mock extracted text',
        tables: [],
        entities: []
      },
      confidence: 0.95
    };
  }
};


export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
