import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Syringe, Save, X } from "lucide-react";
import { addYears, format } from "date-fns";
import { Combobox } from "@/components/ui/combobox";
import { TenantVaccine } from "@/api/tenant-entities"; // Import TenantVaccine entity

const vaccineTypes = ["core", "non_core", "required_by_law"];

export default function VaccinationForm({ vaccination, pets, clients, veterinarians, onSubmit, onCancel }) {
  const getInitialFormData = () => {
    let initialClientId = "";
    let initialPetId = "";
    
    // If editing an existing record, find the client via the pet.
    if (vaccination?.pet_id) {
      const petForRecord = pets.find(p => (p._id || p.id) === (vaccination.pet_id || vaccination._id));
      initialClientId = petForRecord?.client_id || "";
      initialPetId = vaccination.pet_id || vaccination._id;
    } 
    // If creating a new record from the single-client view, use that client's ID.
    else if (clients?.length === 1) {
      initialClientId = clients[0]._id || clients[0].id;
      // If there's a pet_id in the vaccination prop (from context), use it
      if (vaccination?.pet_id) {
        initialPetId = vaccination.pet_id || vaccination._id;
      }
    }

    return {
      pet_id: initialPetId,
      client_id: initialClientId,
      vaccine_name: vaccination?.vaccine_name || "",
      vaccine_type: vaccination?.vaccine_type || "core",
      date_administered: vaccination?.date_administered || new Date().toISOString().split('T')[0],
      next_due_date: vaccination?.next_due_date || addYears(new Date(), 1).toISOString().split('T')[0],
      batch_number: vaccination?.batch_number || "",
      veterinarian: vaccination?.veterinarian || "",
      site_of_injection: vaccination?.site_of_injection || "",
      reactions: vaccination?.reactions || "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [availablePets, setAvailablePets] = useState([]);
  const [allVaccines, setAllVaccines] = useState([]); // All vaccines from database/fallback
  const [availableVaccines, setAvailableVaccines] = useState([]); // Filtered vaccines for display
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [vaccination, pets, clients]); // Added clients to dependency array for initialClientId logic

  useEffect(() => {
    if (formData.client_id) {
      setAvailablePets(pets.filter(p => p.client_id === formData.client_id));
    } else {
      setAvailablePets(pets);
    }
  }, [formData.client_id, pets]);

  // Load vaccines when component mounts
  useEffect(() => {
    console.log('VaccinationForm - Component mounted, loading vaccines...');
    loadVaccines();
  }, []);

  // Load vaccines based on selected pet's species
  useEffect(() => {
    if (formData.pet_id) {
      const selectedPet = pets.find(p => (p._id || p.id) === (formData.pet_id || formData._id));
      if (selectedPet) {
        console.log('Pet selected, filtering vaccines for species:', selectedPet.species);
        filterVaccinesBySpecies(selectedPet.species);
      }
    } else {
      // If no pet is selected, show all vaccines
      console.log('No pet selected, showing all vaccines');
      setAvailableVaccines(allVaccines);
    }
  }, [formData.pet_id, pets, allVaccines]); // Changed dependency to allVaccines instead of availableVaccines

  const loadVaccines = async () => {
    setLoading(true);
    try {
      // Load all vaccines (not filtering by is_active since the database doesn't have this field yet)
      const vaccines = await TenantVaccine.filter({}, 'name');
      console.log('Loaded vaccines from database:', vaccines);
      
      let vaccineList = [];
      if (vaccines && vaccines.length > 0) {
        // Transform database vaccines to match expected format
        vaccineList = vaccines.map(vaccine => ({
          ...vaccine,
          vaccine_type: vaccine.vaccine_type || vaccine.category || 'core', // Map category to vaccine_type
          frequency_months: vaccine.frequency_months || vaccine.duration_months || 12, // Map duration_months to frequency_months
          species: vaccine.species || [], // Add empty species array if not present
          is_active: vaccine.is_active !== undefined ? vaccine.is_active : true // Add is_active field
        }));
        console.log('Transformed vaccines:', vaccineList);
      } else {
        console.log('No vaccines found in database, using fallback list');
        // Fallback to hardcoded list if no vaccines configured
        vaccineList = [
          { name: "Rabies", vaccine_type: "required_by_law", species: ["dog", "cat"], frequency_months: 12 },
          { name: "DHPPiL", vaccine_type: "core", species: ["dog"], frequency_months: 12 },
          { name: "Kennel Cough", vaccine_type: "core", species: ["dog"], frequency_months: 12 },
          { name: "FVRCP", vaccine_type: "core", species: ["cat"], frequency_months: 12 },
          { name: "FeLV", vaccine_type: "non_core", species: ["cat"], frequency_months: 12 }
        ];
      }
      
      setAllVaccines(vaccineList);
      setAvailableVaccines(vaccineList); // Initially show all vaccines
    } catch (error) {
      console.error('Error loading vaccines:', error);
      // Fallback to hardcoded list if entity fails
      const fallbackVaccines = [
        { name: "Rabies", vaccine_type: "required_by_law", species: ["dog", "cat"], frequency_months: 12 },
        { name: "DHPPiL", vaccine_type: "core", species: ["dog"], frequency_months: 12 },
        { name: "Kennel Cough", vaccine_type: "core", species: ["dog"], frequency_months: 12 },
        { name: "FVRCP", vaccine_type: "core", species: ["cat"], frequency_months: 12 },
        { name: "FeLV", vaccine_type: "non_core", species: ["cat"], frequency_months: 12 }
      ];
      setAllVaccines(fallbackVaccines);
      setAvailableVaccines(fallbackVaccines);
    } finally {
      setLoading(false);
    }
  };

  const filterVaccinesBySpecies = (species) => {
    console.log('Filtering vaccines by species:', species);
    console.log('All vaccines:', allVaccines);
    
    if (!species || allVaccines.length === 0) {
      console.log('No species selected or no vaccines available, showing all vaccines');
      setAvailableVaccines(allVaccines);
      return;
    }

    const filtered = allVaccines.filter(vaccine => {
      // Handle cases where vaccine.species might be undefined, null, or not an array
      const vaccineSpecies = vaccine.species || [];
      const isArray = Array.isArray(vaccineSpecies);
      
      if (!isArray || vaccineSpecies.length === 0) {
        console.log(`Vaccine ${vaccine.name} has no species restrictions, including it`);
        return true; // Include vaccines with no species restrictions
      }
      
      const includesSpecies = vaccineSpecies.includes(species);
      console.log(`Vaccine ${vaccine.name} species: ${vaccineSpecies}, includes ${species}: ${includesSpecies}`);
      return includesSpecies;
    });
    
    console.log('Filtered vaccines:', filtered);
    setAvailableVaccines(filtered);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVaccineSelect = (vaccineName) => {
    const selectedVaccine = availableVaccines.find(v => v.name === vaccineName);
    if (selectedVaccine) {
      const nextDue = selectedVaccine.frequency_months
        ? addYears(new Date(formData.date_administered), selectedVaccine.frequency_months / 12).toISOString().split('T')[0]
        : addYears(new Date(formData.date_administered), 1).toISOString().split('T')[0];

      setFormData(prev => ({
        ...prev,
        vaccine_name: vaccineName,
        vaccine_type: selectedVaccine.vaccine_type || prev.vaccine_type,
        next_due_date: nextDue
      }));
    } else {
      setFormData(prev => ({ ...prev, vaccine_name: vaccineName }));
    }
  };

  const handleClientChange = (clientId) => {
    setFormData(prev => ({ ...prev, client_id: clientId, pet_id: "" }));
  };

  const handleDateChange = (date) => {
    const selectedVaccine = availableVaccines.find(v => v.name === formData.vaccine_name);
    const nextDue = selectedVaccine?.frequency_months
      ? addYears(new Date(date), selectedVaccine.frequency_months / 12).toISOString().split('T')[0]
      : addYears(new Date(date), 1).toISOString().split('T')[0];

    setFormData(prev => ({
      ...prev,
      date_administered: date,
      next_due_date: nextDue
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.pet_id) {
      alert('Please select a pet.');
      return;
    }

    if (!formData.vaccine_name) {
      alert('Please select a vaccine.');
      return;
    }

    const submitData = { ...formData };
    delete submitData.client_id; // Remove client_id as it's not part of the schema

    console.log('Submitting vaccination data:', submitData);
    onSubmit(submitData);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Syringe className="w-5 h-5 text-green-600" />
          {vaccination ? 'Edit TenantVaccination Record' : 'Record New TenantVaccination'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => handleChange('client_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client._id || client.id} value={client._id || client.id}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pet_id">Pet *</Label>
              <Select
                value={formData.pet_id}
                onValueChange={(value) => handleChange('pet_id', value)}
                disabled={!formData.client_id || availablePets.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.client_id ? "Select a client first" : "Select a pet"} />
                </SelectTrigger>
                <SelectContent>
                  {availablePets.map((pet) => (
                    <SelectItem key={pet._id || pet.id} value={pet._id || pet.id}>
                      {pet.name} ({pet.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vaccine_name">Vaccine Name *</Label>
              <Select onValueChange={handleVaccineSelect} value={formData.vaccine_name} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select vaccine" />
                </SelectTrigger>
                <SelectContent>
                  {availableVaccines.map(vaccine => (
                    <SelectItem key={vaccine.id || vaccine.name} value={vaccine.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{vaccine.name}</span>
                        {vaccine.vaccine_type && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({vaccine.vaccine_type.replace('_', ' ')})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaccine_type">Vaccine Type</Label>
              <Select onValueChange={(value) => handleChange('vaccine_type', value)} value={formData.vaccine_type}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {vaccineTypes.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_administered">Date Administered *</Label>
              <Input
                id="date_administered"
                type="date"
                value={formData.date_administered}
                onChange={(e) => handleDateChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_due_date">Next Due Date *</Label>
              <Input
                id="next_due_date"
                type="date"
                value={formData.next_due_date}
                onChange={(e) => handleChange('next_due_date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input
                id="batch_number"
                value={formData.batch_number}
                onChange={(e) => handleChange('batch_number', e.target.value)}
                placeholder="Vaccine batch number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="veterinarian">Administering Veterinarian</Label>
              <Select onValueChange={(value) => handleChange('veterinarian', value)} value={formData.veterinarian}>
                <SelectTrigger id="veterinarian">
                  <SelectValue placeholder="Select a veterinarian" />
                </SelectTrigger>
                <SelectContent>
                  {(veterinarians || []).map(vet => (
                    <SelectItem key={vet.id} value={vet.full_name}>
                      {vet.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site_of_injection">Site of Injection</Label>
            <Input
              id="site_of_injection"
              value={formData.site_of_injection}
              onChange={(e) => handleChange('site_of_injection', e.target.value)}
              placeholder="e.g., Left shoulder, Right rear leg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reactions">Reactions/Notes</Label>
            <Textarea
              id="reactions"
              value={formData.reactions}
              onChange={(e) => handleChange('reactions', e.target.value)}
              placeholder="Any adverse reactions or additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {vaccination ? 'Update TenantVaccination' : 'Record TenantVaccination'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
