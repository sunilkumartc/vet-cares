
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Save, X, Heart } from "lucide-react";
import { format, addDays } from "date-fns";
import { TenantAppointment, TenantPet } from "@/api/tenant-entities";

const serviceTypes = [
  { value: "checkup", label: "General Checkup" },
  { value: "vaccination", label: "TenantVaccination" },
  { value: "dental", label: "Dental Care" },
  { value: "grooming", label: "Grooming" },
  { value: "consultation", label: "Consultation" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" }
];

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
];

export default function AppointmentBookingForm({ pets, selectedPet, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    pet_id: selectedPet || "",
    appointment_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    appointment_time: "",
    service_type: "",
    reason: "",
    notes: "",
    duration_minutes: 30
  });
  const [newPetName, setNewPetName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const clientSessionData = localStorage.getItem('clientSession');
      const myClient = clientSessionData ? JSON.parse(clientSessionData) : null;
      
      if (myClient && myClient.id) {
        let petIdToSubmit = formData.pet_id;

        // If no pets exist and a new pet name is provided, create it first
        if (pets.length === 0 && newPetName.trim()) {
            const newPet = await TenantPet.create({
                name: newPetName.trim(),
                species: 'other', // A sensible default
                client_id: myClient.id,
            });
            petIdToSubmit = newPet.id;
        }

        if (!petIdToSubmit) {
            alert('Please select or enter a name for your pet.');
            setSubmitting(false);
            return;
        }

        await TenantAppointment.create({
          ...formData,
          pet_id: petIdToSubmit,
          client_id: myClient.id,
          status: "scheduled"
        });
        
        onSuccess();
      } else {
        alert("Session expired. Please log in again.");
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('An error occurred while booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Book TenantAppointment for Your TenantPet
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pet_id">{pets.length > 0 ? 'Select TenantPet' : 'TenantPet Name'} *</Label>
              {pets.length > 0 ? (
                <Select onValueChange={(value) => handleChange('pet_id', value)} value={formData.pet_id} required>
                  <SelectTrigger id="pet_id">
                    <SelectValue placeholder="Choose your pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map(pet => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div>
                  <Input
                    id="new_pet_name"
                    value={newPetName}
                    onChange={(e) => setNewPetName(e.target.value)}
                    placeholder="e.g., Buddy, Luna"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your pet will be registered with this name.
                  </p>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="service_type">Service Type *</Label>
              <Select onValueChange={(value) => handleChange('service_type', value)} value={formData.service_type} required>
                <SelectTrigger id="service_type">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(service => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appointment_date">Preferred Date *</Label>
              <Input
                id="appointment_date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) => handleChange('appointment_date', e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="appointment_time">Preferred Time *</Label>
              <Select onValueChange={(value) => handleChange('appointment_time', value)} value={formData.appointment_time} required>
                <SelectTrigger id="appointment_time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
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
              placeholder="e.g., Annual checkup, vaccination, concerns about behavior..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any specific concerns, symptoms, or special requests..."
              rows={4}
            />
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>📋 Please Note:</strong> This is a booking request. Our team will contact you within 24 hours to confirm your appointment time and discuss any special preparations needed.
            </p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              <Save className="w-4 h-4 mr-2" />
              {submitting ? 'Booking...' : 'Book TenantAppointment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
