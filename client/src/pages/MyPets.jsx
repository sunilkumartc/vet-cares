import React, { useState, useEffect } from "react";
import { Heart, PawPrint, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TenantPet, TenantClient, TenantVaccination, TenantMedicalRecord, TenantAppointment } from "@/api/tenant-entities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientAuthGuard from "@/components/ClientAuthGuard";
import ClientSessionManager from "@/lib/clientSession";

import CustomerPetForm from "../components/customer/CustomerPetForm";
import AppointmentBookingForm from "../components/customer/AppointmentBookingForm";
import PetTimeline from "../components/customer/PetTimeline";
import PetDetailsCard from "../components/customer/PetDetailsCard";
import MedicalHistoryTab from "../components/customer/MedicalHistoryTab";
import VaccinationsTab from "../components/customer/VaccinationsTab";
import ProfileUpdateModal from "../components/auth/ProfileUpdateModal";

export default function MyPets() {
  const [pets, setPets] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, []);

  useEffect(() => {
    // Check if profile needs to be completed
    const session = ClientSessionManager.getCurrentSession();
    if (session && !session.profile_completed) {
      setShowProfileUpdateModal(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id || pets[0]._id);
    }
  }, [loading, pets, selectedPetId]);

  const loadCustomerData = async () => {
    try {
      // Get authenticated client session
      const session = ClientSessionManager.getCurrentSession();
      if (!session || !session.authenticated) {
        throw new Error('Client not authenticated');
      }

      // Get client record from database
      const clientId = ClientSessionManager.getClientId();
      const clientRecord = await TenantClient.get(clientId);
      
      if (!clientRecord) {
        throw new Error('Client record not found');
      }

      setUser(session);
      
      // Load client-specific data
      const [petData, vaccinationData, recordData, appointmentData] = await Promise.all([
        TenantPet.filter({ client_id: clientId }),
        TenantVaccination.list(),
        TenantMedicalRecord.list(),
        TenantAppointment.filter({ client_id: clientId })
      ]);

      const myPetIds = petData.map(p => p.id || p._id);
      setPets(petData);
      setVaccinations(vaccinationData.filter(v => myPetIds.includes(v.pet_id)));
      setMedicalRecords(recordData.filter(r => myPetIds.includes(r.pet_id)));
      setAppointments(appointmentData.filter(a => myPetIds.includes(a.pet_id)));
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePetSubmit = async (petData) => {
    try {
        if (editingPet) {
            await TenantPet.update(editingPet.id || editingPet._id, petData);
        } else {
            // Get client ID from session manager
            const clientId = ClientSessionManager.getClientId();
            if (!clientId) {
              throw new Error("Client information not available. Cannot add pet.");
            }
            await TenantPet.create({ ...petData, client_id: clientId });
        }
        setShowPetForm(false);
        setEditingPet(null);
        await loadCustomerData();
        alert('Pet saved successfully!');
    } catch (error) {
        console.error('Error saving pet:', error);
        alert(`Failed to save pet: ${error.message || 'Please try again.'}`);
    }
  };
  
  const handleAppointmentSuccess = () => {
    setShowAppointmentForm(false);
    loadCustomerData(); // Reload data to show new appointment
    alert('Appointment booked successfully!');
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
    setSelectedPetId(pet.id || pet._id);
    setShowAppointmentForm(true);
  };

  const getCombinedHistoryForPet = (petId) => {
    if (!petId) return [];

    const petRecords = medicalRecords.filter(r => r.pet_id === petId).map(r => ({ ...r, type: 'medical', date: r.visit_date, data: r }));
    const petVaccines = vaccinations.filter(v => v.pet_id === petId).map(v => ({ ...v, type: 'vaccination', date: v.date_administered, data: v }));
    const petAppointments = appointments.filter(a => a.pet_id === petId).map(a => ({...a, type: 'appointment', date: a.appointment_date, data: a }));

    return [...petRecords, ...petVaccines, ...petAppointments].sort((a, b) => new Date(b.date) - new Date(a.date));
  };
  
  const selectedPet = pets.find(p => (p.id || p._id) === selectedPetId);
  const combinedHistory = selectedPet ? getCombinedHistoryForPet(selectedPet.id || selectedPet._id) : [];
  const petMedicalRecords = selectedPet ? medicalRecords.filter(r => r.pet_id === (selectedPet.id || selectedPet._id)) : [];
  const petVaccinations = selectedPet ? vaccinations.filter(v => v.pet_id === (selectedPet.id || selectedPet._id)) : [];

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
    <ClientAuthGuard>
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
                    Welcome back, {ClientSessionManager.getDisplayName()}! 🐾
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
              <div className="text-center py-12">
                <PawPrint className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Add Your Pet</h3>
                <p className="text-gray-600 mb-4">Start by adding your first pet to get personalized care.</p>
                <Button onClick={() => setShowPetForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pet
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pet Selector */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Select a Pet</h3>
                  <div className="flex flex-wrap gap-3">
                    {pets.map(pet => {
                      const petId = pet.id || pet._id;
                      return (
                        <Button
                          key={petId}
                          variant={selectedPetId === petId ? 'default' : 'outline'}
                          onClick={() => setSelectedPetId(petId)}
                          className={selectedPetId === petId ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'bg-white/80'}
                        >
                          {pet.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Pet Details and Timeline */}
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

      {/* Profile Update Modal */}
      <ProfileUpdateModal 
        isOpen={showProfileUpdateModal} 
        onClose={() => setShowProfileUpdateModal(false)} 
        onSuccess={(updatedSession) => {
          console.log('Profile updated successfully:', updatedSession);
          setShowProfileUpdateModal(false);
          // Reload data to reflect updated session
          loadCustomerData();
        }}
      />
    </ClientAuthGuard>
  );
}
