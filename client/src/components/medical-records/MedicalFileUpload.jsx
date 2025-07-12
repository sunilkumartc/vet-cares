import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Image, 
  X, 
  Eye, 
  Download, 
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import medicalFileUploadAPI from '@/api/medicalFileUpload';

const FileTypeIcon = ({ fileType, className = "w-4 h-4" }) => {
  if (fileType.startsWith('image/')) {
    return <Image className={className} />;
  }
  return <FileText className={className} />;
};

const FilePreview = ({ file, onRemove, onView }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  // Generate preview for images
  React.useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileTypeIcon fileType={file.type} className="w-6 h-6 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(file.size)} • {file.type}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {previewUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(file, previewUrl)}
                className="h-8 w-8 p-0"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(file)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {previewUrl && (
          <div className="mt-3">
            <img
              src={previewUrl}
              alt={file.name}
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const UploadedFile = ({ file, onRemove, onView }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="border border-green-200 bg-green-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                {file.fileName || file.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt || new Date())}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(file)}
              className="h-8 w-8 p-0"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(file)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function MedicalFileUpload({ 
  category, 
  title, 
  icon: Icon, 
  onFilesChange, 
  existingFiles = [],
  maxFiles = 10,
  maxSizeMB = 15,
  onViewFile
}) {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);

  // Update uploadedFiles when existingFiles prop changes
  React.useEffect(() => {
    setUploadedFiles(existingFiles);
  }, [existingFiles]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setErrors([]);
    
    // Validate files
    const newErrors = [];
    
    // Check file count limit
    if (files.length + acceptedFiles.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
    }
    
    // Validate each file
    acceptedFiles.forEach(file => {
      try {
        medicalFileUploadAPI.validateFileType(file);
        medicalFileUploadAPI.validateFileSize(file, maxSizeMB);
      } catch (error) {
        newErrors.push(`${file.name}: ${error.message}`);
      }
    });
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, [files, maxFiles, maxSizeMB]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.bmp'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: true
  });

  const removeFile = (fileToRemove) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove));
  };

  const removeUploadedFile = (fileToRemove) => {
    const updatedFiles = uploadedFiles.filter(file => file !== fileToRemove);
    setUploadedFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadProgress({});
    
    const uploadPromises = files.map(async (file, index) => {
      try {
        setUploadProgress(prev => ({ ...prev, [index]: 0 }));
        
        const result = await medicalFileUploadAPI.uploadMedicalFile(file, category, {
          originalName: file.name,
          uploadedBy: 'user', // TODO: Get from auth context
          category: category
        });
        
        setUploadProgress(prev => ({ ...prev, [index]: 100 }));
        
        return result;
      } catch (error) {
        console.error('Upload failed for file:', file.name, error);
        setErrors(prev => [...prev, `${file.name}: ${error.message}`]);
        return null;
      }
    });
    
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(result => result !== null);
    
    const newUploadedFiles = [...uploadedFiles, ...successfulUploads];
    setUploadedFiles(newUploadedFiles);
    setFiles([]);
    setUploading(false);
    setUploadProgress({});
    
    // Notify parent component
    onFilesChange(newUploadedFiles);
  };

  const handleView = (file, previewUrl = null) => {
    // Use the parent's onViewFile handler for modal display
    if (onViewFile) {
      if (previewUrl) {
        // For local file preview
        onViewFile(previewUrl, file.name, file.type);
      } else {
        // For uploaded file
        onViewFile(file.url, file.fileName || file.name, file.type);
      }
    } else {
      // Fallback to window.open if no handler provided
      if (previewUrl) {
        window.open(previewUrl, '_blank');
      } else {
        window.open(file.url, '_blank');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {uploadedFiles.length + files.length}/{maxFiles}
          </Badge>
        </div>
        {files.length > 0 && (
          <Button
            onClick={uploadFiles}
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
                Upload {files.length} file{files.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Upload Errors:</span>
          </div>
          <ul className="mt-2 text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag & drop files here, or click to select files'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supported: PDF, Images, Word docs • Max {maxSizeMB}MB per file
        </p>
      </div>

      {/* Files to Upload */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Files to Upload:</h4>
          {files.map((file, index) => (
            <div key={index} className="space-y-2">
              <FilePreview
                file={file}
                onRemove={removeFile}
                onView={handleView}
              />
              {uploadProgress[index] !== undefined && (
                <Progress value={uploadProgress[index]} className="h-2" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
          {uploadedFiles.map((file, index) => (
            <UploadedFile
              key={index}
              file={file}
              onRemove={removeUploadedFile}
              onView={handleView}
            />
          ))}
        </div>
      )}
    </div>
  );
} 