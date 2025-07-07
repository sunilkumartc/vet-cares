import React, { useState, useEffect } from "react";
import { Plus, Search, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TenantVaccination, TenantPet, TenantClient } from "@/api/tenant-entities";

import VaccinationForm from "../components/vaccinations/VaccinationForm";
import VaccinationList from "../components/vaccinations/VaccinationList";

export default function Vaccinations() {
  const [vaccinations, setVaccinations] = useState([]);
  const [pets, setPets] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredVaccinations, setFilteredVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterVaccinations();
  }, [searchTerm, vaccinations, pets, clients]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [vaccinationData, petData, clientData] = await Promise.all([
        TenantVaccination.list('-next_due_date'),
        TenantPet.list(),
        TenantClient.list()
      ]);
      setVaccinations(vaccinationData);
      setPets(petData);
      setClients(clientData);
      setFilteredVaccinations(vaccinationData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterVaccinations = () => {
    if (!searchTerm) {
      setFilteredVaccinations(vaccinations);
      return;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = vaccinations.filter(vaccine => {
      const pet = pets.find(p => p.id === vaccine.pet_id);
      const client = pet ? clients.find(c => c.id === pet.client_id) : null;

      return (
        vaccine.vaccine_name.toLowerCase().includes(lowercasedTerm) ||
        pet?.name.toLowerCase().includes(lowercasedTerm) ||
        client?.first_name.toLowerCase().includes(lowercasedTerm) ||
        client?.last_name.toLowerCase().includes(lowercasedTerm)
      );
    });
    setFilteredVaccinations(filtered);
  };

  const handleFormSubmit = async (vaccinationData) => {
    try {
      if (editingVaccination) {
        await TenantVaccination.update(editingVaccination.id, vaccinationData);
      } else {
        await TenantVaccination.create(vaccinationData);
      }
      setShowForm(false);
      setEditingVaccination(null);
      loadInitialData();
    } catch (error) {
      console.error("Failed to save vaccination:", error);
      alert('Failed to save vaccination. Please try again.');
    }
  };

  const handleEdit = (vaccination) => {
    setEditingVaccination(vaccination);
    setShowForm(true);
  };

  const handleDelete = async (vaccination) => {
    if (confirm(`Are you sure you want to delete the ${vaccination.vaccine_name} record for pet ID ${vaccination.pet_id}?`)) {
      try {
        await TenantVaccination.delete(vaccination.id);
        loadInitialData();
      } catch (error) {
        console.error("Failed to delete vaccination:", error);
        alert('Failed to delete vaccination. Please try again.');
      }
    }
  };

  if (showForm) {
    return (
      <VaccinationForm
        vaccination={editingVaccination}
        pets={pets}
        onSubmit={handleFormSubmit}
        onCancel={() => { setShowForm(false); setEditingVaccination(null); }}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Syringe className="w-8 h-8" />
            TenantVaccination Management
          </h1>
          <p className="text-gray-600 mt-1">Track and manage all pet vaccinations and due dates.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add TenantVaccination Record
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search by vaccine, pet, or client name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <VaccinationList
        vaccinations={filteredVaccinations}
        pets={pets}
        clients={clients}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}