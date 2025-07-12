# Document Viewer Modal Fix

## Problem
When viewing documents (lab reports, radiology reports, other attachments) in the Medical Record form, clicking the "View" button was opening documents in a new tab instead of showing them in a popup/modal within the same screen.

## Root Cause
The `MedicalFileUpload` component was using `window.open()` to display documents, bypassing the existing `DocumentViewer` modal component that was already implemented.

## Solution
Updated the `MedicalFileUpload` component to use the parent's `onViewFile` handler instead of directly opening documents in new tabs.

### Key Changes:

1. **Added onViewFile prop to MedicalFileUpload**:
   ```javascript
   export default function MedicalFileUpload({ 
     category, 
     title, 
     icon: Icon, 
     onFilesChange, 
     existingFiles = [],
     maxFiles = 10,
     maxSizeMB = 15,
     onViewFile  // New prop for modal handling
   }) {
   ```

2. **Updated handleView function**:
   ```javascript
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
   ```

3. **Updated MedicalRecordForm to pass handler**:
   ```javascript
   const FileUploadSection = ({ category, title, icon: Icon }) => (
     <div className="space-y-2 rounded-lg border p-4">
       <MedicalFileUpload
         category={category}
         title={title}
         icon={Icon}
         onFilesChange={(files) => handleChange(category, files)}
         existingFiles={formData[category] || []}
         maxFiles={10}
         maxSizeMB={15}
         onViewFile={handleFileView}  // Pass the modal handler
       />
     </div>
   );
   ```

## DocumentViewer Modal Features

The existing `DocumentViewer` component provides:

### ✅ **Supported File Types**:
- **PDFs**: Displayed in iframe with full browser controls
- **Images**: Direct preview with zoom and responsive sizing
- **Other files**: Download and external view options

### ✅ **Modal Features**:
- **Responsive design**: Works on mobile and desktop
- **Download button**: Direct file download
- **Open in New Tab**: External viewing option
- **Close button**: Easy modal dismissal
- **File type detection**: Automatic format recognition

### ✅ **User Experience**:
- **No page navigation**: Stays on current form
- **Quick access**: Instant document preview
- **Multiple options**: Download, preview, or external view
- **Consistent UI**: Matches application design

## Behavior After Fix

### ✅ **Documents now open in modal when**:
- Clicking "View" on uploaded files in Medical Record form
- Clicking "View" on file previews before upload
- Viewing documents from any category (Lab Reports, Radiology, Other)

### ✅ **Modal provides**:
- PDF preview in embedded iframe
- Image preview with responsive sizing
- Download button for all file types
- "Open in New Tab" option for external viewing
- Easy close with X button or clicking outside

### ❌ **No longer opens in new tab**:
- Document viewing stays within the application
- Better user experience and workflow continuity

## Files Modified
- `client/src/components/medical-records/MedicalFileUpload.jsx` - Added onViewFile prop and modal handling
- `client/src/components/medical-records/MedicalRecordForm.jsx` - Passed handleFileView to upload components
- `scripts/test-document-viewer.js` - Test script for verification

## Testing
Use the test script to verify functionality:
```bash
node scripts/test-document-viewer.js
```

## Performance Impact
- Improved user experience with no page navigation
- Faster document access within the same interface
- Consistent modal behavior across all document types
- Maintained all existing functionality while improving UX 