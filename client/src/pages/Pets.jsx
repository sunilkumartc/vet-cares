import React, { useState, useEffect } from "react";
import { Plus, Search, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TenantPet, TenantClient, TenantAppointment, TenantMedicalRecord, TenantVaccination, TenantInvoice, TenantMemo } from "@/api/tenant-entities";

import PetForm from "../components/pets/PetForm";
import PetList from "../components/pets/PetList";

export default function Pets() {
  const [pets, setPets] = useState([]);
  const [filteredPets, setFilteredPets] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredPets(pets);
      return;
    }
    
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = pets.filter(pet => {
      const client = clients.find(c => c.id === pet.client_id);
      const clientName = client ? `${client.first_name} ${client.last_name}` : '';
      
      return (
        pet.name?.toLowerCase().includes(lowercasedFilter) ||
        pet.species?.toLowerCase().includes(lowercasedFilter) ||
        pet.breed?.toLowerCase().includes(lowercasedFilter) ||
        clientName.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredPets(filtered);
  }, [pets, clients, searchTerm]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [petData, clientData] = await Promise.all([
        TenantPet.list('-created_date'),
        TenantClient.list()
      ]);
      setPets(petData);
      setClients(clientData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (petData) => {
    try {
      if (editingPet) {
        // Use the correct ID field (_id or id)
        const petId = editingPet._id || editingPet.id;
        if (!petId) {
          throw new Error('Pet ID not found');
        }
        await TenantPet.update(petId, petData);
      } else {
        await TenantPet.create(petData);
      }
      setShowForm(false);
      setEditingPet(null);
      loadInitialData();
    } catch (error) {
      console.error('Error saving pet:', error);
    }
  };

  const handleEdit = (pet) => {
    setEditingPet(pet);
    setShowForm(true);
  };

  const handleDelete = async (pet) => {
    try {
      // Use the correct ID field (_id or id)
      const petId = pet._id || pet.id;
      if (!petId) {
        throw new Error('Pet ID not found');
      }
      
      // Find all related data for the pet
      const [appointments, medicalRecords, vaccinations, invoices, memos] = await Promise.all([
        TenantAppointment.filter({ pet_id: petId }),
        TenantMedicalRecord.filter({ pet_id: petId }),
        TenantVaccination.filter({ pet_id: petId }),
        TenantInvoice.filter({ pet_id: petId }),
        TenantMemo.filter({ pet_id: petId })
      ]);

      let warningMessage = `Are you sure you want to delete ${pet.name}?`;
      const relatedDataMessages = [];
      if (appointments.length > 0) relatedDataMessages.push(`• ${appointments.length} appointment(s)`);
      if (medicalRecords.length > 0) relatedDataMessages.push(`• ${medicalRecords.length} medical record(s)`);
      if (vaccinations.length > 0) relatedDataMessages.push(`• ${vaccinations.length} vaccination(s)`);
      if (invoices.length > 0) relatedDataMessages.push(`• ${invoices.length} invoice(s)`);
      if (memos.length > 0) relatedDataMessages.push(`• ${memos.length} memo(s)`);
      
      if (relatedDataMessages.length > 0) {
        warningMessage += `\n\nThis pet has associated data:\n${relatedDataMessages.join('\n')}`;
        warningMessage += `\n\nDeleting this pet will also remove all related data. This action cannot be undone.`;
      }

      if (confirm(warningMessage)) {
        // Delete all related data first
        await Promise.all([
          ...appointments.map(item => TenantAppointment.delete(item._id || item.id)),
          ...medicalRecords.map(item => TenantMedicalRecord.delete(item._id || item.id)),
          ...vaccinations.map(item => TenantVaccination.delete(item._id || item.id)),
          ...invoices.map(item => TenantInvoice.delete(item._id || item.id)),
          ...memos.map(item => TenantMemo.delete(item._id || item.id))
        ]);
        
        // Finally delete the pet
        await TenantPet.delete(petId);
        
        alert('Pet and all related data deleted successfully.');
        loadInitialData();
      }
    } catch (error) {
      console.error('Error deleting pet:', error);
      alert('Failed to delete pet. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPet(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pet Management</h1>
          <p className="text-gray-600 mt-1">Register and manage pet profiles and medical information</p>
        </div>
      </div>

      {!showForm && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by pet name, species, breed, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {showForm ? (
        <PetForm
          pet={editingPet}
          clients={clients}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <PetList
          pets={filteredPets}
          clients={clients}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
