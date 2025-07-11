import React, { useState, useEffect } from "react";
import { Search, Users, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TenantClient, TenantPet, TenantAppointment, TenantInvoice, TenantMedicalRecord, TenantVaccination } from "@/api/tenant-entities";

import ClientForm from "../components/clients/ClientForm";
import ClientList from "../components/clients/ClientList";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(client => 
      client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
    );
    setFilteredClients(filtered);
  }, [clients, searchTerm]);

  const loadClients = async () => {
    try {
      const clientData = await TenantClient.list('-created_date');
      setClients(clientData);
      setFilteredClients(clientData);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (clientData) => {
    try {
      if (editingClient) {
        const clientId = editingClient._id || editingClient.id;
        console.log('editingClient:', editingClient);
        console.log('clientId:', clientId);
        if (!clientId) {
          alert('Error: No client ID found for update!');
          return;
        }
        await TenantClient.update(clientId, clientData);
      } else {
        await TenantClient.create(clientData);
      }
      setShowForm(false);
      setEditingClient(null);
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (client) => {
    // Check for related data first
    try {
      const [pets, appointments, invoices, medicalRecords, vaccinations] = await Promise.all([
        TenantPet.filter({ client_id: client.id }),
        TenantAppointment.filter({ client_id: client.id }),
        TenantInvoice.filter({ client_id: client.id }),
        TenantMedicalRecord.filter({ client_id_for_join: client.id }),
        TenantVaccination.filter({ client_id_for_join: client.id })
      ]);

      let warningMessage = `Are you sure you want to delete ${client.first_name} ${client.last_name}?`;
      
      if (pets.length > 0 || appointments.length > 0 || invoices.length > 0 || medicalRecords.length > 0 || vaccinations.length > 0) {
        warningMessage += `\n\nThis client has:`;
        if (pets.length > 0) warningMessage += `\n• ${pets.length} pet(s)`;
        if (appointments.length > 0) warningMessage += `\n• ${appointments.length} appointment(s)`;
        if (invoices.length > 0) warningMessage += `\n• ${invoices.length} invoice(s)`;
        if (medicalRecords.length > 0) warningMessage += `\n• ${medicalRecords.length} medical record(s)`;
        if (vaccinations.length > 0) warningMessage += `\n• ${vaccinations.length} vaccination(s)`;
        warningMessage += `\n\nDeleting this client will also remove all related data. This action cannot be undone.`;
      }

      if (confirm(warningMessage)) {
        // Delete all related data first
        for (const pet of pets) {
          await TenantPet.delete(pet.id);
        }
        for (const appointment of appointments) {
          await TenantAppointment.delete(appointment.id);
        }
        for (const invoice of invoices) {
          await TenantInvoice.delete(invoice.id);
        }
        for (const record of medicalRecords) {
          await TenantMedicalRecord.delete(record.id);
        }
        for (const vaccination of vaccinations) {
          await TenantVaccination.delete(vaccination.id);
        }
        
        // Finally delete the client
        await TenantClient.delete(client.id);
        
        alert('Client and all related data deleted successfully.');
        loadClients();
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
          <p className="text-gray-600 mt-1">Manage your pet owners and their contact information</p>
        </div>
      </div>

      {!showForm && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search clients by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {showForm ? (
        <ClientForm
          client={editingClient}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <ClientList
          clients={filteredClients}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
