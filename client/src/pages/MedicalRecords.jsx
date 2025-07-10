import React, { useState, useEffect } from "react";
import { Plus, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TenantMedicalRecord, TenantPet, TenantClient } from "@/api/tenant-entities";

import MedicalRecordForm from "../components/medical-records/MedicalRecordForm";
import MedicalRecordList from "../components/medical-records/MedicalRecordList";

export default function MedicalRecords() {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [pets, setPets] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRecords(medicalRecords);
      return;
    }
    
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = medicalRecords.filter(record => {
      const pet = pets.find(p => p.id === record.pet_id);
      const client = clients.find(c => c.id === pet?.client_id);

      const petMatch = pet?.name.toLowerCase().includes(lowercasedFilter);
      const clientMatch = client && `${client.first_name} ${client.last_name}`.toLowerCase().includes(lowercasedFilter);
      const diagnosisMatch = record.diagnosis?.toLowerCase().includes(lowercasedFilter);
      const treatmentMatch = record.treatment?.toLowerCase().includes(lowercasedFilter);

      return petMatch || clientMatch || diagnosisMatch || treatmentMatch;
    });
    setFilteredRecords(filtered);
  }, [medicalRecords, pets, clients, searchTerm]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [recordData, petData, clientData] = await Promise.all([
        TenantMedicalRecord.list('-visit_date'),
        TenantPet.list(),
        TenantClient.list()
      ]);
      setMedicalRecords(recordData);
      setPets(petData);
      setClients(clientData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (recordData) => {
    try {
      if (editingRecord) {
        await TenantMedicalRecord.update(editingRecord.id, recordData);
      } else {
        await TenantMedicalRecord.create(recordData);
      }
      setShowForm(false);
      setEditingRecord(null);
      loadInitialData();
    } catch (error) {
      console.error('Error saving medical record:', error);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-600 mt-1">Manage comprehensive health records for all patients.</p>
        </div>
        <Button 
          onClick={() => { setEditingRecord(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Record
        </Button>
      </div>

      {!showForm && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by pet, owner, diagnosis, or treatment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {showForm ? (
        <MedicalRecordForm
          record={editingRecord}
          pets={pets}
          clients={clients}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <MedicalRecordList
          records={filteredRecords}
          pets={pets}
          clients={clients}
          loading={loading}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}