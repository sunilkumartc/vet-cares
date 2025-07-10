import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink } from "lucide-react";

export default function DocumentViewer({ isOpen, onClose, fileUrl, fileName, fileType }) {
  if (!fileUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  const isImage = fileType?.startsWith('image/') || fileUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
  const isPDF = fileType === 'application/pdf' || fileUrl.match(/\.pdf$/i);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{fileName || 'Document Viewer'}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isImage ? (
            <div className="flex justify-center p-4">
              <img 
                src={fileUrl} 
                alt={fileName} 
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] border-0 rounded-lg"
              title={fileName}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ExternalLink className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Document Preview Not Available</h3>
              <p className="text-gray-600 mb-4">This file type cannot be previewed in the browser.</p>
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="gap-1">
                  <Download className="w-4 h-4" />
                  Download File
                </Button>
                <Button variant="outline" onClick={handleOpenInNewTab} className="gap-1">
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}