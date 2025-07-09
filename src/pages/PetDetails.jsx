import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PawPrint, Calendar, FileText, Stethoscope, Pill, User, Phone, MapPin, Image, FileIcon, ArrowLeft, Heart, Weight } from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TenantPet, TenantClient, TenantMedicalRecord, TenantVaccination } from "@/api/tenant-entities";
import DocumentViewer from "../components/medical-records/DocumentViewer";

export default function PetDetails() {
  const [searchParams] = useSearchParams();
  const petId = searchParams.get('id');
  
  const [pet, setPet] = useState(null);
  const [client, setClient] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [recentVaccinations, setRecentVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState({ url: '', name: '', type: '' });

  useEffect(() => {
    if (petId) {
      loadPetDetails();
    }
  }, [petId]);

  const loadPetDetails = async () => {
    try {
      const [petData, allRecords, allVaccinations] = await Promise.all([
        TenantPet.list(),
        TenantMedicalRecord.list(),
        TenantVaccination.list()
      ]);

      const currentPet = petData.find(p => p.id === petId);
      if (currentPet) {
        setPet(currentPet);
        
        // Get client data
        const allClients = await TenantClient.list();
        const petOwner = allClients.find(c => c.id === currentPet.client_id);
        setClient(petOwner);

        // Get recent records (last 3)
        const petRecords = allRecords
          .filter(r => r.pet_id === petId)
          .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))
          .slice(0, 3);
        setRecentRecords(petRecords);

        // Get recent vaccinations (last 3)
        const petVaccinations = allVaccinations
          .filter(v => v.pet_id === petId)
          .sort((a, b) => new Date(b.date_administered) - new Date(a.date_administered))
          .slice(0, 3);
        setRecentVaccinations(petVaccinations);
      }
    } catch (error) {
      console.error('Error loading pet details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileView = (fileUrl, fileName, fileType) => {
    setCurrentFile({ url: fileUrl, name: fileName, type: fileType });
    setViewerOpen(true);
  };

  const getAge = (birthDate) => {
    if (!birthDate) return 'Unknown age';
    
    const birth = new Date(birthDate);
    const years = differenceInYears(new Date(), birth);
    const months = differenceInMonths(new Date(), birth) % 12;
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''} old`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''} old`;
    } else {
      return `${years}y ${months}m old`;
    }
  };

  const FileAttachmentPreview = ({ files, type, icon: Icon }) => {
    if (!files || files.length === 0) return null;

    return (
      <div className="mt-3">
        <h6 className="font-medium text-xs flex items-center gap-1 mb-2 text-gray-600">
          <Icon className="w-3 h-3" />
          {type} ({files.length})
        </h6>
        <div className="flex flex-wrap gap-1">
          {files.map((file, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleFileView(file, `${type.slice(0, -1)} ${index + 1}`, type.includes('Blood') ? 'application/pdf' : type.includes('Scan') ? 'image/jpeg' : 'application/pdf')}
              className="gap-1 text-xs px-2 py-1 h-auto hover:bg-pink-50 hover:border-pink-300"
            >
              <Icon className="w-3 h-3" />
              View {index + 1}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white rounded w-64"></div>
            <div className="h-48 bg-white rounded-2xl"></div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-64 bg-white rounded-2xl"></div>
              <div className="h-64 bg-white rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="text-center py-12">
              <PawPrint className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pet not found</h3>
              <p>The pet you are looking for does not exist.</p>
              <Link to={createPageUrl("Pets")}>
                <Button variant="outline" className="mt-4">Go Back</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
          {/* Back Button */}
          <Link to={createPageUrl("MyPets")}>
            <Button variant="outline" className="gap-2 mb-4 hover:bg-pink-50">
              <ArrowLeft className="w-4 h-4" />
              Back to My Pets
            </Button>
          </Link>

          {/* Pet Profile Card */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-pink-400 to-purple-500 relative">
              {pet.photo_url && (
                <img 
                  src={pet.photo_url} 
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/20" />
            </div>
            
            <CardContent className="p-6 -mt-8 relative">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  {pet.photo_url ? (
                    <img 
                      src={pet.photo_url} 
                      alt={pet.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <PawPrint className="w-12 h-12 text-pink-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">{pet.name}</h1>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-pink-100 text-pink-800 capitalize">
                          {pet.species} {pet.breed && `• ${pet.breed}`}
                        </Badge>
                        {pet.gender && (
                          <Badge variant="outline" className="capitalize">
                            {pet.gender}
                          </Badge>
                        )}
                      </div>
                      {pet.birth_date && (
                        <p className="text-gray-600 mt-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {getAge(pet.birth_date)}
                        </p>
                      )}
                    </div>
                    
                    {pet.pet_id && (
                      <div className="text-center bg-gray-100 rounded-lg p-3">
                        <div className="text-sm text-gray-500">Pet ID</div>
                        <div className="font-mono font-bold text-lg text-gray-900">{pet.pet_id}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pet Details */}
              <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <PawPrint className="w-4 h-4 text-pink-500" />
                    Pet Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    {pet.color && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Color:</span>
                        <span className="font-medium">{pet.color}</span>
                      </div>
                    )}
                    {pet.weight && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Weight:</span>
                        <span className="font-medium">{pet.weight} kg</span>
                      </div>
                    )}
                    {pet.microchip_id && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Microchip:</span>
                        <span className="font-mono text-xs">{pet.microchip_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Owner Information
                  </h3>
                  {client && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{client.first_name} {client.last_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{client.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Special Notes & Allergies */}
              {(pet.allergies || pet.special_notes) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  {pet.allergies && pet.allergies !== 'None known' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Allergies</h4>
                      <p className="text-yellow-700">{pet.allergies}</p>
                    </div>
                  )}
                  {pet.special_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">📝 Special Notes</h4>
                      <p className="text-blue-700">{pet.special_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Medical Records */}
          {recentRecords.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-pink-500" />
                    Recent Medical Records
                  </CardTitle>
                  <Link to={createPageUrl(`PetMedicalHistory?pet=${pet.id}`)}>
                    <Button variant="outline" size="sm">
                      View All Records
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentRecords.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{format(new Date(record.visit_date), 'MMM d, yyyy')}</span>
                      </div>
                      {record.veterinarian && (
                        <span className="text-sm text-gray-600">Dr. {record.veterinarian}</span>
                      )}
                    </div>
                    
                    {record.chief_complaint && (
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Reason:</strong> {record.chief_complaint}
                      </p>
                    )}
                    
                    {record.diagnosis && (
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Diagnosis:</strong> {record.diagnosis}
                      </p>
                    )}

                    {/* File Attachments Preview for Recent Records */}
                    {(record.blood_reports?.length > 0 || record.scan_reports?.length > 0 || record.other_attachments?.length > 0) && (
                      <div className="bg-gray-50 rounded p-3 mt-3">
                        <div className="text-xs text-gray-600 mb-2 font-medium">📎 Attached Documents:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                          <FileAttachmentPreview
                            files={record.other_attachments}
                            type="Other Documents"
                            icon={FileIcon}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Vaccinations */}
          {recentVaccinations.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-green-500" />
                  Recent Vaccinations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentVaccinations.map((vaccination) => (
                  <div key={vaccination.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{vaccination.vaccine_name}</div>
                      <div className="text-sm text-gray-600">
                        Given on {format(new Date(vaccination.date_administered), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {vaccination.vaccine_type?.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
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