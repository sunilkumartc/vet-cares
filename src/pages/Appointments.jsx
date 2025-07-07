
import React, { useState, useEffect } from "react";
import { Plus, Search, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TenantAppointment, TenantPet, TenantClient } from "@/api/tenant-entities";
import { format } from "date-fns";
import { usePermissions, filterByTenant, ReadOnlyIndicator } from "@/utils/permissions.jsx";

import AppointmentForm from "../components/appointments/AppointmentForm";
import AppointmentList from "../components/appointments/AppointmentList";

export default function Appointments() {
  const { hasPermission, canPerformAction, filterByTenant: filterData } = usePermissions();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [pets, setPets] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredAppointments(appointments);
      return;
    }
    
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = appointments.filter(apt => {
        const pet = pets.find(p => p.id === apt.pet_id);
        const client = clients.find(c => c.id === apt.client_id);
        
        const petMatch = pet?.name.toLowerCase().includes(lowercasedFilter);
        const clientMatch = client && `${client.first_name} ${client.last_name}`.toLowerCase().includes(lowercasedFilter);
        const serviceMatch = apt.service_type.toLowerCase().includes(lowercasedFilter);
        const reasonMatch = apt.reason?.toLowerCase().includes(lowercasedFilter);

        return petMatch || clientMatch || serviceMatch || reasonMatch;
    });
    setFilteredAppointments(filtered);
  }, [appointments, pets, clients, searchTerm]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [appointmentData, petData, clientData] = await Promise.all([
        TenantAppointment.list('-appointment_date'),
        TenantPet.list(),
        TenantClient.list()
      ]);
      
      // Filter data by tenant
      const filteredAppointments = filterData(appointmentData);
      const filteredPets = filterData(petData);
      const filteredClients = filterData(clientData);
      
      setAppointments(filteredAppointments);
      setPets(filteredPets);
      setClients(filteredClients);
      
      // Check if user has read-only access
      const canCreate = canPerformAction('create', 'appointment');
      const canEdit = canPerformAction('edit', 'appointment');
      const canDelete = canPerformAction('delete', 'appointment');
      setIsReadOnly(!canCreate && !canEdit && !canDelete);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (appointmentData) => {
    try {
      if (editingAppointment) {
        await TenantAppointment.update(editingAppointment.id, appointmentData);
      } else {
        await TenantAppointment.create(appointmentData);
      }
      setShowForm(false);
      setEditingAppointment(null);
      loadInitialData();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('Error saving appointment.');
    }
  };

  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
  };

  const handleDelete = async (appointment) => {
    const pet = pets.find(p => p.id === appointment.pet_id);
    const client = clients.find(c => c.id === appointment.client_id);
    
    const confirmMessage = `Are you sure you want to delete this appointment?\n\nDetails:\n• TenantPet: ${pet?.name || 'Unknown'}\n• TenantClient: ${client ? `${client.first_name} ${client.last_name}` : 'Unknown'}\n• Date: ${format(new Date(appointment.appointment_date), 'EEEE, MMM d, yyyy')}\n• Time: ${appointment.appointment_time}\n• Service: ${appointment.service_type?.replace(/_/g, ' ')}\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      try {
        await TenantAppointment.delete(appointment.id);
        alert('TenantAppointment deleted successfully.');
        loadInitialData();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Failed to delete appointment. Please try again.');
      }
    }
  };
  
  const handleCancel = () => {
    setShowForm(false);
    setEditingAppointment(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-1">
            {isReadOnly ? 'View patient appointments (Read Only)' : 'Schedule and manage patient appointments.'}
          </p>
          {isReadOnly && (
            <div className="flex items-center gap-2 mt-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Read-only mode - you can view but not modify appointments</span>
            </div>
          )}
        </div>
        {!isReadOnly && canPerformAction('create', 'appointment') && (
          <Button 
            onClick={() => { setEditingAppointment(null); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Schedule Appointment
          </Button>
        )}
      </div>

      {!showForm && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by pet name, client name, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {showForm ? (
        <AppointmentForm
          appointment={editingAppointment}
          pets={pets}
          clients={clients}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <ReadOnlyIndicator show={isReadOnly}>
          <AppointmentList
            appointments={filteredAppointments}
            pets={pets}
            clients={clients}
            loading={loading}
            onEdit={isReadOnly ? null : handleEdit}
            onDelete={isReadOnly ? null : handleDelete}
            isReadOnly={isReadOnly}
          />
        </ReadOnlyIndicator>
      )}
    </div>
  );
}
