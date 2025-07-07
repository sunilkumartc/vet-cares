import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Phone, Mail, MapPin, PawPrint, FileText, Syringe, Calendar, Heart, Weight, Stethoscope, Pill, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { format, differenceInYears, differenceInMonths, isAfter, isBefore, addDays } from "date-fns";
import { TenantClient, TenantPet, TenantMedicalRecord, TenantVaccination } from "@/api/tenant-entities";
import { createPageUrl } from "@/utils";

const speciesColors = {
  dog: "bg-blue-100 text-blue-800",
  cat: "bg-purple-100 text-purple-800",
  bird: "bg-yellow-100 text-yellow-800",
  rabbit: "bg-green-100 text-green-800",
  hamster: "bg-orange-100 text-orange-800",
  fish: "bg-cyan-100 text-cyan-800",
  reptile: "bg-emerald-100 text-emerald-800",
  other: "bg-gray-100 text-gray-800"
};

export default function ClientDetails() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id');
  
  const [client, setClient] = useState(null);
  const [pets, setPets] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  const loadClientData = async () => {
    try {
      const [clientData, allPets, allRecords, allVaccinations] = await Promise.all([
        TenantClient.list(),
        TenantPet.list(),
        TenantMedicalRecord.list(),
        TenantVaccination.list()
      ]);

      const foundClient = clientData.find(c => c.id === clientId);
      setClient(foundClient);

      if (foundClient) {
        const clientPets = allPets.filter(p => p.client_id === clientId);
        setPets(clientPets);

        const petIds = clientPets.map(p => p.id);
        const clientRecords = allRecords
          .filter(r => petIds.includes(r.pet_id))
          .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
        setMedicalRecords(clientRecords);

        const clientVaccinations = allVaccinations
          .filter(v => petIds.includes(v.pet_id))
          .sort((a, b) => new Date(b.next_due_date) - new Date(a.next_due_date));
        setVaccinations(clientVaccinations);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
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

  const getVaccinationStatus = (nextDueDate) => {
    const now = new Date();
    const dueDate = new Date(nextDueDate);
    
    if (isBefore(dueDate, now)) {
      return { status: 'overdue', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    } else if (isBefore(dueDate, addDays(now, 30))) {
      return { status: 'due_soon', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    } else {
      return { status: 'current', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  const getPetName = (petId) => pets.find(p => p.id === petId)?.name || 'Unknown TenantPet';

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <div className="lg:col-span-2">
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">TenantClient Not Found</h3>
          <p className="text-gray-600 mb-4">The requested client could not be found.</p>
          <Link to={createPageUrl("Clients")}>
            <Button variant="outline">Back to Clients</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Clients")}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Clients
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-gray-600">TenantClient Details & TenantPet Information</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TenantClient Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              TenantClient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {client.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                  <span>{client.address}</span>
                </div>
              )}
              {client.emergency_contact && (
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-700">Emergency Contact</div>
                    <div>{client.emergency_contact}</div>
                  </div>
                </div>
              )}
            </div>
            
            {client.notes && (
              <div className="bg-gray-50 rounded-lg p-3 mt-4">
                <h4 className="font-medium text-sm mb-2">Notes</h4>
                <p className="text-sm text-gray-600">{client.notes}</p>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{pets.length}</div>
                <div className="text-xs text-gray-500">Pets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{medicalRecords.length}</div>
                <div className="text-xs text-gray-500">Records</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="pets" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pets">Pets ({pets.length})</TabsTrigger>
              <TabsTrigger value="medical">Medical History ({medicalRecords.length})</TabsTrigger>
              <TabsTrigger value="vaccinations">Vaccinations ({vaccinations.length})</TabsTrigger>
            </TabsList>

            {/* Pets Tab */}
            <TabsContent value="pets" className="space-y-4 mt-6">
              {pets.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <PawPrint className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pets Registered</h3>
                    <p className="text-gray-600">This client doesn't have any pets registered yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pets.map((pet) => (
                    <Card key={pet.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center">
                              {pet.photo_url ? (
                                <img 
                                  src={pet.photo_url} 
                                  alt={pet.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <PawPrint className="w-8 h-8 text-blue-300" />
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
                                <Badge className={`${speciesColors[pet.species]} capitalize`}>
                                  {pet.species}
                                </Badge>
                                {pet.pet_id && (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {pet.pet_id}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                {pet.breed && (
                                  <div className="flex items-center gap-1">
                                    <Heart className="w-4 h-4 text-red-500" />
                                    <span>{pet.breed}</span>
                                  </div>
                                )}
                                {pet.birth_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    <span>{getAge(pet.birth_date)}</span>
                                  </div>
                                )}
                                {pet.weight && (
                                  <div className="flex items-center gap-1">
                                    <Weight className="w-4 h-4 text-orange-500" />
                                    <span>{pet.weight} kg</span>
                                  </div>
                                )}
                              </div>
                              {pet.allergies && pet.allergies !== 'None known' && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 max-w-lg">
                                  <p className="text-xs text-yellow-800">
                                    <strong>Allergies:</strong> {pet.allergies}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <Link to={createPageUrl(`PetDetails?id=${pet.id}`)}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Medical History Tab */}
            <TabsContent value="medical" className="space-y-4 mt-6">
              {medicalRecords.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Records</h3>
                    <p className="text-gray-600">No medical records found for this client's pets.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {medicalRecords.map((record) => (
                    <Card key={record.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {getPetName(record.pet_id)} - Medical Visit
                              </h3>
                              <p className="text-sm text-gray-600">
                                {format(new Date(record.visit_date), 'MMMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {record.chief_complaint && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-900 mb-1">Chief Complaint</h4>
                              <p className="text-sm text-gray-600">{record.chief_complaint}</p>
                            </div>
                          )}
                          {record.diagnosis && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-900 mb-1 flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-red-500" />
                                Diagnosis
                              </h4>
                              <p className="text-sm text-gray-600">{record.diagnosis}</p>
                            </div>
                          )}
                          {record.treatment && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-900 mb-1">Treatment</h4>
                              <p className="text-sm text-gray-600">{record.treatment}</p>
                            </div>
                          )}
                          {record.medications && record.medications.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-900 mb-2 flex items-center gap-2">
                                <Pill className="w-4 h-4 text-purple-500" />
                                Medications
                              </h4>
                              <div className="bg-purple-50 rounded-lg p-3">
                                {record.medications.map((med, index) => (
                                  <div key={index} className="text-sm text-purple-700 mb-1">
                                    <strong>{med.name}:</strong> {med.dosage}, {med.frequency} for {med.duration}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Vaccinations Tab */}
            <TabsContent value="vaccinations" className="space-y-4 mt-6">
              {vaccinations.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Syringe className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No TenantVaccination Records</h3>
                    <p className="text-gray-600">No vaccination records found for this client's pets.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {vaccinations.map((vaccination) => {
                    const status = getVaccinationStatus(vaccination.next_due_date);
                    const StatusIcon = status.icon;
                    
                    return (
                      <Card key={vaccination.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Syringe className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">
                                    {vaccination.vaccine_name}
                                  </h3>
                                  <Badge className={status.color}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {status.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                  For {getPetName(vaccination.pet_id)}
                                </p>
                                <div className="flex gap-4 text-sm text-gray-600">
                                  <span>Given: {format(new Date(vaccination.date_administered), 'MMM d, yyyy')}</span>
                                  <span>Due: {format(new Date(vaccination.next_due_date), 'MMM d, yyyy')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}