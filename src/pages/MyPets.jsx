import React, { useState, useEffect } from "react";
import { Heart, PawPrint, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TenantPet, TenantClient, TenantVaccination, TenantMedicalRecord, TenantAppointment, User } from "@/api/tenant-entities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CustomerPetForm from "../components/customer/CustomerPetForm";
import AppointmentBookingForm from "../components/customer/AppointmentBookingForm";
import PetTimeline from "../components/customer/PetTimeline";
import PetDetailsCard from "../components/customer/PetDetailsCard";
import MedicalHistoryTab from "../components/customer/MedicalHistoryTab";
import VaccinationsTab from "../components/customer/VaccinationsTab";

export default function MyPets() {
  const [pets, setPets] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [myClient, setMyClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, []);

  useEffect(() => {
    if (!loading && pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [loading, pets, selectedPetId]);

  const loadCustomerData = async () => {
    try {
      const clientSessionData = localStorage.getItem('clientSession');
      let currentUser = null;
      let clientRecord = null;
      
      const clients = await TenantClient.list();

      if (clientSessionData) {
        currentUser = JSON.parse(clientSessionData);
        clientRecord = clients.find(c => c.id === currentUser.id);
      } 
      
      if (!currentUser || !clientRecord) {
        currentUser = await User.me();
        clientRecord = clients.find(c => c.email === currentUser.email);
      }

      setUser(currentUser);
      setMyClient(clientRecord);
      
      if (clientRecord) {
        const [petData, vaccinationData, recordData, appointmentData] = await Promise.all([
          TenantPet.filter({ client_id: clientRecord.id }),
          TenantVaccination.list(),
          TenantMedicalRecord.list(),
          TenantAppointment.filter({ client_id: clientRecord.id })
        ]);

        const myPetIds = petData.map(p => p.id);
        setPets(petData);
        setVaccinations(vaccinationData.filter(v => myPetIds.includes(v.pet_id)));
        setMedicalRecords(recordData.filter(r => myPetIds.includes(r.pet_id)));
        setAppointments(appointmentData.filter(a => myPetIds.includes(a.pet_id)));
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePetSubmit = async (petData) => {
    try {
        if (editingPet) {
            await TenantPet.update(editingPet.id, petData);
        } else {
            if (!myClient || !myClient.id) {
              throw new Error("TenantClient information not available. Cannot add pet.");
            }
            await TenantPet.create({ ...petData, client_id: myClient.id });
        }
        setShowPetForm(false);
        setEditingPet(null);
        await loadCustomerData();
        alert('TenantPet saved successfully!');
    } catch (error) {
        console.error('Error saving pet:', error);
        alert(`Failed to save pet: ${error.message || 'Please try again.'}`);
    }
  };
  
  const handleAppointmentSuccess = () => {
    setShowAppointmentForm(false);
    loadCustomerData(); // Reload data to show new appointment
    alert('TenantAppointment booked successfully!');
  };

  const handleCancelPetForm = () => {
    setShowPetForm(false);
    setEditingPet(null);
  };

  const handleEditClick = (pet) => {
    setEditingPet(pet);
    setShowPetForm(true);
  };
  
  const handleBookAppointmentClick = (pet) => {
    setSelectedPetId(pet.id);
    setShowAppointmentForm(true);
  };

  const getCombinedHistoryForPet = (petId) => {
    if (!petId) return [];

    const petRecords = medicalRecords.filter(r => r.pet_id === petId).map(r => ({ ...r, type: 'medical', date: r.visit_date, data: r }));
    const petVaccines = vaccinations.filter(v => v.pet_id === petId).map(v => ({ ...v, type: 'vaccination', date: v.date_administered, data: v }));
    const petAppointments = appointments.filter(a => a.pet_id === petId).map(a => ({...a, type: 'appointment', date: a.appointment_date, data: a }));

    return [...petRecords, ...petVaccines, ...petAppointments].sort((a, b) => new Date(b.date) - new Date(a.date));
  };
  
  const selectedPet = pets.find(p => p.id === selectedPetId);
  const combinedHistory = selectedPet ? getCombinedHistoryForPet(selectedPet.id) : [];
  const petMedicalRecords = selectedPet ? medicalRecords.filter(r => r.pet_id === selectedPet.id) : [];
  const petVaccinations = selectedPet ? vaccinations.filter(v => v.pet_id === selectedPet.id) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-20 bg-white rounded-2xl"></div>
            <div className="h-64 bg-white rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (showAppointmentForm) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <AppointmentBookingForm
                    pets={pets}
                    selectedPet={selectedPetId}
                    onSuccess={handleAppointmentSuccess}
                    onCancel={() => setShowAppointmentForm(false)}
                />
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50">
      <div className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome back, {user?.full_name?.split(' ')[0]}! 🐾
                </h1>
                <p className="text-gray-600 mt-1">Your furry family's health dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => { setEditingPet(null); setShowPetForm(true); }}
                variant="outline"
                className="bg-white/50 hover:bg-white border-pink-200 text-pink-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Pet
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {showPetForm ? (
          <CustomerPetForm
            pet={editingPet}
            onSubmit={handlePetSubmit}
            onCancel={handleCancelPetForm}
          />
        ) : (
          <>
            {pets.length === 0 ? (
              <Card className="text-center py-12 bg-white/60 backdrop-blur-sm border-pink-100">
                <CardContent>
                  <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PawPrint className="w-10 h-10 text-pink-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No pets registered yet</h3>
                  <p className="text-gray-600 mb-4">Add your first pet to get started!</p>
                  <Button
                    onClick={() => { setEditingPet(null); setShowPetForm(true); }}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your TenantPet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div>
                {/* TenantPet Selector */}
                <div className="mb-8">
                   <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <PawPrint className="w-5 h-5 text-pink-500" />
                      Select a TenantPet
                    </h2>
                  <div className="flex flex-wrap gap-3">
                    {pets.map(pet => (
                      <Button
                        key={pet.id}
                        variant={selectedPetId === pet.id ? 'default' : 'outline'}
                        onClick={() => setSelectedPetId(pet.id)}
                        className={selectedPetId === pet.id ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'bg-white/80'}
                      >
                        {pet.name}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* TenantPet Details and Timeline */}
                {selectedPet && (
                    <div className="space-y-8">
                        <PetDetailsCard pet={selectedPet} onEdit={handleEditClick} onBookAppointment={handleBookAppointmentClick} />
                        
                        <Tabs defaultValue="timeline" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="timeline">Health Timeline</TabsTrigger>
                            <TabsTrigger value="medical">Medical History</TabsTrigger>
                            <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
                          </TabsList>
                          <TabsContent value="timeline" className="mt-6">
                            <PetTimeline history={combinedHistory} pet={selectedPet} />
                          </TabsContent>
                          <TabsContent value="medical" className="mt-6">
                            <MedicalHistoryTab records={petMedicalRecords} />
                          </TabsContent>
                          <TabsContent value="vaccinations" className="mt-6">
                            <VaccinationsTab vaccinations={petVaccinations} />
                          </TabsContent>
                        </Tabs>
                    </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
