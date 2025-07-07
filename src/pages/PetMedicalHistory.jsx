
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Calendar, Stethoscope, Pill, Image, FileIcon, PawPrint, User, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TenantMedicalRecord, TenantPet, TenantClient, TenantVaccination } from "@/api/tenant-entities";
import DocumentViewer from "../components/medical-records/DocumentViewer";

export default function PetMedicalHistory() {
  const [searchParams] = useSearchParams();
  const petId = searchParams.get('pet');
  
  const [pet, setPet] = useState(null);
  const [client, setClient] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]); // New state for vaccinations
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false); // State for document viewer modal
  const [currentFile, setCurrentFile] = useState({ url: '', name: '', type: '' }); // State for current file being viewed

  useEffect(() => {
    if (petId) {
      loadPetData();
    } else {
      // Redirect if petId is not found in URL
      window.location.href = createPageUrl('Pets');
    }
  }, [petId]);

  const loadPetData = async () => {
    try {
      const [allPets, allClients, allRecords, allVaccinations] = await Promise.all([
        TenantPet.list(),
        TenantClient.list(),
        TenantMedicalRecord.list(),
        TenantVaccination.list()
      ]);

      const currentPet = allPets.find(p => p.id === petId);
      if (currentPet) {
        setPet(currentPet);
        
        // Get client data
        const petOwner = allClients.find(c => c.id === currentPet.client_id);
        setClient(petOwner);

        // Filter records for this pet
        const petRecords = allRecords.filter(r => r.pet_id === petId);
        setMedicalRecords(petRecords.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date)));

        // Filter vaccinations for this pet
        const petVaccinations = allVaccinations.filter(v => v.pet_id === petId);
        setVaccinations(petVaccinations.sort((a, b) => new Date(b.date_administered) - new Date(a.date_administered)));
      } else {
        // If pet is not found, set pet to null to trigger "TenantPet Not Found" message
        setPet(null);
      }
    } catch (error) {
      console.error('Error loading pet data:', error);
      // Optionally, set pet to null or show an error state
      setPet(null); 
    } finally {
      setLoading(false);
    }
  };

  const handleFileView = (fileUrl, fileName, fileType) => {
    setCurrentFile({ url: fileUrl, name: fileName, type: fileType });
    setViewerOpen(true);
  };

  const FileAttachment = ({ files, type, icon: Icon }) => {
    if (!files || files.length === 0) return null;

    return (
      <div className="space-y-2">
        <h5 className="font-medium text-sm flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {type}
        </h5>
        <div className="grid grid-cols-1 gap-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <FileIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-700">
                  {type} {index + 1}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFileView(file, `${type} ${index + 1}`, type.includes('Blood') ? 'application/pdf' : 'image/jpeg')}
                className="gap-1 hover:bg-blue-50 text-blue-600"
              >
                <FileIcon className="w-3 h-3" />
                View
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">TenantPet Not Found</h2>
        <p className="text-gray-600 mb-6">The pet you are looking for could not be found. It might have been deleted or the ID is incorrect.</p>
        <Link to={createPageUrl('Pets')}>
          <Button>Back to Pets</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Pets')}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Pets
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <PawPrint className="w-8 h-8 text-blue-600" />
              {pet.name}'s Medical History
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Owner: {client ? `${client.first_name} ${client.last_name}` : 'Unknown'}
              </span>
              {client?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {client.phone}
                </span>
              )}
              {client?.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {client.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TenantPet Summary Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <PawPrint className="w-10 h-10 text-blue-600" />
                )}
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Species</p>
                  <p className="font-semibold capitalize">{pet.species}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Breed</p>
                  <p className="font-semibold">{pet.breed || 'Mixed'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Age</p>
                  <p className="font-semibold">
                    {pet.birth_date ? 
                      `${Math.floor((new Date() - new Date(pet.birth_date)) / (365.25 * 24 * 60 * 60 * 1000))} years` : 
                      'Unknown'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Weight</p>
                  <p className="font-semibold">{pet.weight ? `${pet.weight} kg` : 'Not recorded'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add New Record Button */}
        <div className="flex justify-end">
          <Link to={createPageUrl(`MedicalRecords?pet=${pet.id}`)}>
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              <FileText className="w-4 h-4" />
              Add New Medical Record
            </Button>
          </Link>
        </div>

        {/* Medical Records */}
        <div className="space-y-6">
          {medicalRecords.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Records</h3>
                <p className="text-gray-600 mb-4">No medical records found for {pet.name}.</p>
                <Link to={createPageUrl(`MedicalRecords?pet=${pet.id}`)}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    Add First Record
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            medicalRecords.map((record) => (
              <Card key={record.id} className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Visit on {format(new Date(record.visit_date), 'MMMM d, yyyy')}
                    </CardTitle>
                    <Badge variant="outline" className="self-start md:self-center">
                      {record.veterinarian || 'Dr. Ravi'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Chief Complaint */}
                  {record.chief_complaint && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Chief Complaint</h4>
                      <p className="text-gray-700">{record.chief_complaint}</p>
                    </div>
                  )}

                  {/* Diagnosis */}
                  {record.diagnosis && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-red-500" />
                        Diagnosis
                      </h4>
                      <p className="text-gray-700">{record.diagnosis}</p>
                    </div>
                  )}

                  {/* Treatment */}
                  {record.treatment && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Treatment</h4>
                      <p className="text-gray-700">{record.treatment}</p>
                    </div>
                  )}

                  {/* Medications */}
                  {record.medications && record.medications.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-purple-500" />
                        Medications
                      </h4>
                      <div className="space-y-2">
                        {record.medications.map((med, index) => (
                          <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <div className="font-medium text-purple-900">{med.name}</div>
                            <div className="text-sm text-purple-700">
                              {med.dosage} • {med.frequency} • {med.duration}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Attachments */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <FileAttachment 
                      files={record.blood_reports} 
                      type="Blood Reports" 
                      icon={FileText}
                    />
                    <FileAttachment 
                      files={record.scan_reports} 
                      type="Scan Reports" 
                      icon={Image}
                    />
                    <FileAttachment 
                      files={record.other_attachments} 
                      type="Other Documents" 
                      icon={FileIcon}
                    />
                  </div>

                  {/* Vitals */}
                  {(record.weight || record.temperature) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Vitals</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {record.weight && (
                          <div>
                            <span className="text-sm text-blue-700">Weight:</span>
                            <span className="ml-2 font-medium">{record.weight} kg</span>
                          </div>
                        )}
                        {record.temperature && (
                          <div>
                            <span className="text-sm text-blue-700">Temperature:</span>
                            <span className="ml-2 font-medium">{record.temperature}°C</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Follow-up */}
                  {record.follow_up_date && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-1">Follow-up Scheduled</h4>
                      <p className="text-yellow-800">
                        Next visit: {format(new Date(record.follow_up_date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {record.notes && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Additional Notes</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{record.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Vaccinations Section */}
        {vaccinations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Pill className="w-6 h-6 text-green-600" />
              TenantVaccination History
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vaccinations.map((vaccine) => (
                <Card key={vaccine.id} className="bg-white/80 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg text-gray-800">{vaccine.vaccine_name}</h3>
                    <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                      <Calendar className="w-4 h-4" />
                      Administered on: {format(new Date(vaccine.date_administered), 'MMMM d, yyyy')}
                    </p>
                    {vaccine.next_due_date && (
                      <p className="text-orange-700 text-sm flex items-center gap-1 mt-1">
                        <Calendar className="w-4 h-4" />
                        Next Due: {format(new Date(vaccine.next_due_date), 'MMMM d, yyyy')}
                      </p>
                    )}
                    {vaccine.notes && (
                      <p className="text-gray-500 text-sm mt-2">{vaccine.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
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
