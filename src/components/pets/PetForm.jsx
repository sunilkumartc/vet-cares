
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { PawPrint, Save, X, RefreshCw } from "lucide-react"; // Added RefreshCw
import { format } from "date-fns";
import { UploadFile } from "@/api/integrations"; // Kept existing import
import { generatePetId } from "@/api/functions"; // Added new import

const speciesOptions = ["dog", "cat", "bird", "rabbit", "hamster", "fish", "reptile", "other"];
const genderOptions = ["male", "female", "unknown"];

export default function PetForm({ pet, clients, onSubmit, onCancel }) {
  const getInitialFormData = () => ({
    pet_id: pet?.pet_id || "", // Added pet_id
    name: pet?.name || "",
    species: pet?.species || "",
    breed: pet?.breed || "",
    color: pet?.color || "",
    gender: pet?.gender || "",
    birth_date: pet?.birth_date || "",
    weight: pet?.weight || "",
    microchip_id: pet?.microchip_id || "",
    client_id: pet?.client_id || "",
    photo_url: pet?.photo_url || "",
    allergies: pet?.allergies || "",
    special_notes: pet?.special_notes || ""
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [generatingId, setGeneratingId] = useState(false); // Added state for ID generation

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [pet]);

  // Auto-generate TenantPet ID when species changes (only for new pets)
  useEffect(() => {
    if (!pet && formData.species && !formData.pet_id) {
      generateNewPetId(formData.species);
    }
  }, [formData.species, pet]); // Depend on formData.species and pet prop

  const generateNewPetId = async (species) => {
    if (!species) return;

    setGeneratingId(true);
    try {
      // Mock generatePetId for demonstration if not fully implemented in functions/generatePetId
      // In a real app, this would call your backend API.
      // Example mock:
      // const response = { data: { pet_id: `${species.substring(0,1).toUpperCase()}${Math.floor(Math.random() * 900) + 100}` } };
      // Replace with actual call if `generatePetId` is an API integration:
      const response = await generatePetId({ species }); // Assuming generatePetId returns { data: { pet_id: '...' } }

      if (response.data && response.data.pet_id) {
        setFormData(prev => ({ ...prev, pet_id: response.data.pet_id }));
      }
    } catch (error) {
      console.error('Error generating pet ID:', error);
      // Optionally set pet_id to an error state or clear it
      setFormData(prev => ({ ...prev, pet_id: "ERROR" }));
    } finally {
      setGeneratingId(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSpeciesChange = (species) => {
    setFormData(prev => ({ ...prev, species }));
    // Auto-generate new ID for new pets when species changes
    if (!pet) { // Only for new pets, not when editing an existing one
      generateNewPetId(species);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert weight to number if provided
    const submitData = {
      ...formData,
      weight: formData.weight ? parseFloat(formData.weight) : undefined
    };
    onSubmit(submitData);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : '';
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PawPrint className="w-5 h-5 text-blue-600" />
          {pet ? 'Edit TenantPet Profile' : 'Register New TenantPet'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TenantPet ID and Owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">TenantPet Owner *</Label>
              <Combobox
                options={clients.map(client => ({ value: client.id, label: `${client.first_name} ${client.last_name}` }))}
                value={formData.client_id}
                onValueChange={(value) => handleChange('client_id', value)}
                placeholder="Select pet owner..."
                searchPlaceholder="Search owners..."
                emptyPlaceholder="No owner found."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pet_id">TenantPet ID</Label>
              <div className="flex gap-2">
                <Input
                  id="pet_id"
                  value={formData.pet_id}
                  onChange={(e) => handleChange('pet_id', e.target.value)}
                  placeholder="Auto-generated (e.g., D001, C001)"
                  className="font-mono"
                  readOnly={!pet && formData.pet_id !== "ERROR"} // Make readOnly if new pet and ID is generating/generated
                />
                {!pet && formData.species && ( // Show regenerate button only for new pets and if species is selected
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => generateNewPetId(formData.species)}
                    disabled={generatingId}
                    title="Regenerate TenantPet ID"
                  >
                    <RefreshCw className={`w-4 h-4 ${generatingId ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Auto-generated based on species. Use this ID for external machines.
              </p>
            </div>
          </div>

          {/* Basic Information (now name and species) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">TenantPet Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="species">Species *</Label>
              <Select onValueChange={handleSpeciesChange} value={formData.species} required>
                <SelectTrigger id="species">
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  {speciesOptions.map(species => (
                    <SelectItem key={species} value={species} className="capitalize">
                      {species}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Breed and Color (now in a separate 2-column grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                value={formData.breed}
                onChange={(e) => handleChange('breed', e.target.value)}
                placeholder="e.g., Golden Retriever, Siamese"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color/Markings</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="e.g., Golden, Black and White"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select onValueChange={(value) => handleChange('gender', value)} value={formData.gender}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map(gender => (
                    <SelectItem key={gender} value={gender} className="capitalize">
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Date of Birth</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleChange('birth_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder="e.g., 25.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="microchip_id">Microchip ID</Label>
              <Input
                id="microchip_id"
                value={formData.microchip_id}
                onChange={(e) => handleChange('microchip_id', e.target.value)}
                placeholder="15-digit microchip number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo_url">Photo URL</Label>
              <Input
                id="photo_url"
                type="url"
                value={formData.photo_url}
                onChange={(e) => handleChange('photo_url', e.target.value)}
                placeholder="https://example.com/pet-photo.jpg"
              />
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Medical Information</h3>

            <div className="space-y-2">
              <Label htmlFor="allergies">Known Allergies</Label>
              <Input
                id="allergies"
                value={formData.allergies}
                onChange={(e) => handleChange('allergies', e.target.value)}
                placeholder="e.g., Chicken, Pollen, None known"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_notes">Special Care Notes</Label>
              <Textarea
                id="special_notes"
                value={formData.special_notes}
                onChange={(e) => handleChange('special_notes', e.target.value)}
                placeholder="Any special care instructions, behavioral notes, or medical conditions..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {pet ? 'Update TenantPet' : 'Register TenantPet'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
