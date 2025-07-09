
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, PawPrint, User, Edit, Calendar, Stethoscope, Pill, Syringe, Image, FileIcon } from "lucide-react";
import { format } from "date-fns";
import { Badge } from '@/components/ui/badge';
import DocumentViewer from './DocumentViewer';

export default function MedicalRecordList({ records, pets, clients, loading, onEdit }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState({ url: '', name: '', type: '' });

  const getPetInfo = (petId) => pets.find(p => p.id === petId);
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Owner';
  };

  const handleFileView = (fileUrl, fileName, fileType) => {
    setCurrentFile({ url: fileUrl, name: fileName, type: fileType });
    setViewerOpen(true);
  };

  const FileAttachmentPreview = ({ files, type, icon: Icon }) => {
    if (!files || files.length === 0) return null;

    // Infer file type for viewer. This might need refinement based on actual file types.
    const getMimeType = (attachmentType) => {
      if (attachmentType.includes('Blood Reports') || attachmentType.includes('Other Documents')) {
        return 'application/pdf'; // Assuming these are PDFs
      } else if (attachmentType.includes('Scan Reports')) {
        return 'image/jpeg'; // Assuming these are images
      }
      return ''; // Default or unknown
    };

    return (
      <div className="mt-3">
        <h5 className="font-medium text-sm flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" />
          {type} ({files.length})
        </h5>
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleFileView(file, `${type.slice(0, -1)} ${index + 1}`, getMimeType(type))}
              className="gap-1 text-xs hover:bg-blue-50 hover:border-blue-300"
            >
              <Icon className="w-3 h-3" />
              View {type.slice(0, -1)} {index + 1}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Records Found</h3>
          <p className="text-gray-600">Start by adding a new medical record for a patient.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {records.map((record) => {
          const pet = getPetInfo(record.pet_id);
          const clientName = pet ? getClientName(pet.client_id) : 'Unknown Owner';

          return (
            <Card key={record.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <PawPrint className="w-4 h-4 text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-900">{pet?.name || 'Unknown Pet'}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{clientName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(record.visit_date), 'MMM d, yyyy')}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(record)}
                      className="gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {record.chief_complaint && (
                    <div>
                      <h4 className="font-semibold text-sm">Chief Complaint</h4>
                      <p className="text-sm text-gray-600">{record.chief_complaint}</p>
                    </div>
                  )}
                  {record.diagnosis && (
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-red-500" />
                        Diagnosis
                      </h4>
                      <p className="text-sm text-gray-600">{record.diagnosis}</p>
                    </div>
                  )}
                  {record.treatment && (
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-green-500" />
                        Treatment
                      </h4>
                      <p className="text-sm text-gray-600">{record.treatment}</p>
                    </div>
                  )}
                  {record.medications && record.medications.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Pill className="w-4 h-4 text-purple-500" />
                        Medications
                      </h4>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {record.medications.map((med, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            <strong>{med.name}:</strong> {med.dosage}, {med.frequency} for {med.duration}.
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* File Attachments Preview */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <FileAttachmentPreview
                      files={record.blood_reports}
                      type="Blood Reports"
                      icon={FileText}
                    />
                    <FileAttachmentPreview
                      files={record.scan_reports}
                      type="Scan Reports"
                      icon={Image}
                    />
                  </div>

                  {record.other_attachments && record.other_attachments.length > 0 && (
                    <FileAttachmentPreview
                      files={record.other_attachments}
                      type="Other Documents"
                      icon={FileIcon}
                    />
                  )}

                  {record.follow_up_date && (
                    <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded-md">
                      <strong>Follow-up recommended on:</strong> {format(new Date(record.follow_up_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DocumentViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        fileUrl={currentFile.url}
        fileName={currentFile.name}
        fileType={currentFile.type}
      />
    </>
  );
}
