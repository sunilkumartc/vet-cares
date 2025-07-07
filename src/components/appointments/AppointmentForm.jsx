import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Calendar as CalendarIcon, Save, X } from "lucide-react";
import { format } from "date-fns";

const serviceTypes = ["checkup", "vaccination", "surgery", "emergency", "grooming", "dental", "consultation", "other"];
const statuses = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"];

export default function AppointmentForm({ appointment, pets, clients, onSubmit, onCancel }) {
  const getInitialFormData = () => ({
    client_id: appointment?.client_id || "",
    pet_id: appointment?.pet_id || "",
    appointment_date: appointment ? format(new Date(appointment.appointment_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    appointment_time: appointment?.appointment_time || "",
    service_type: appointment?.service_type || "",
    status: appointment?.status || "scheduled",
    reason: appointment?.reason || "",
    notes: appointment?.notes || "",
    duration_minutes: appointment?.duration_minutes || 30,
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [availablePets, setAvailablePets] = useState([]);

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [appointment]);

  useEffect(() => {
    if (formData.client_id) {
      setAvailablePets(pets.filter(p => p.client_id === formData.client_id));
    } else {
      setAvailablePets([]);
    }
  }, [formData.client_id, pets]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientChange = (clientId) => {
    setFormData(prev => ({ ...prev, client_id: clientId, pet_id: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          {appointment ? 'Edit Appointment' : 'Schedule New Appointment'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">TenantClient *</Label>
              <Combobox
                options={clients.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
                value={formData.client_id}
                onValueChange={handleClientChange}
                placeholder="Select client..."
                searchPlaceholder="Search clients..."
                emptyPlaceholder="No client found."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pet_id">TenantPet *</Label>
              <Combobox
                options={availablePets.map(p => ({ value: p.id, label: p.name }))}
                value={formData.pet_id}
                onValueChange={(value) => handleChange('pet_id', value)}
                placeholder={!formData.client_id ? "Select a client first" : "Select pet..."}
                searchPlaceholder="Search pets..."
                emptyPlaceholder="No pet found."
                disabled={!formData.client_id}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appointment_date">Date *</Label>
              <Input
                id="appointment_date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) => handleChange('appointment_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment_time">Time *</Label>
              <Input
                id="appointment_time"
                type="time"
                value={formData.appointment_time}
                onChange={(e) => handleChange('appointment_time', e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="service_type">Service Type *</Label>
              <Select onValueChange={(value) => handleChange('service_type', value)} value={formData.service_type} required>
                <SelectTrigger id="service_type">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">{type.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select onValueChange={(value) => handleChange('status', value)} value={formData.status} required>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Visit</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="e.g., Annual checkup, limping, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes for this appointment."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {appointment ? 'Update TenantAppointment' : 'Schedule TenantAppointment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
