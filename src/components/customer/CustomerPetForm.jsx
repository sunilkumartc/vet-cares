import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PawPrint, Save, X, RefreshCw, Upload } from "lucide-react";
import { generatePetId } from "@/api/functions";
import { UploadFile } from "@/api/integrations";

const speciesOptions = ["dog", "cat", "bird", "rabbit", "hamster", "fish", "reptile", "other"];
const genderOptions = ["male", "female", "unknown"];

export default function CustomerPetForm({ pet, onSubmit, onCancel }) {
  const getInitialFormData = () => ({
    pet_id: pet?.pet_id || "",
    name: pet?.name || "",
    species: pet?.species || "",
    breed: pet?.breed || "",
    color: pet?.color || "",
    gender: pet?.gender || "",
    birth_date: pet?.birth_date || "",
    weight: pet?.weight || "",
    microchip_id: pet?.microchip_id || "",
    allergies: pet?.allergies || "",
    special_notes: pet?.special_notes || "",
    photo_url: pet?.photo_url || ""
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [generatingId, setGeneratingId] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [pet]);

  useEffect(() => {
    if (!pet && formData.species && !formData.pet_id) {
      generateNewPetId(formData.species);
    }
  }, [formData.species, pet]);

  const generateNewPetId = async (species) => {
    if (!species) return;
    setGeneratingId(true);
    try {
      const response = await generatePetId({ species });
      if (response.data && response.data.pet_id) {
        setFormData(prev => ({ ...prev, pet_id: response.data.pet_id }));
      }
    } catch (error) {
      console.error('Error generating pet ID:', error);
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
    if (!pet) {
      generateNewPetId(species);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    let submitData = {
      ...formData,
      weight: formData.weight ? parseFloat(formData.weight) : undefined
    };

    if (imageFile) {
      try {
        const { file_url } = await UploadFile({ file: imageFile });
        submitData.photo_url = file_url;
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image. Please try again.");
        setUploading(false);
        return;
      }
    }
    
    await onSubmit(submitData);
    setUploading(false);
  };

  const currentImage = imageFile ? URL.createObjectURL(imageFile) : formData.photo_url;

  return (
    <Card className="max-w-4xl mx-auto my-8 bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <PawPrint className="w-6 h-6 text-pink-500" />
          {pet ? 'Edit Pet Profile' : 'Register New Pet'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Pet Name & Species */}
              <div className="space-y-2">
                <Label htmlFor="name">Pet Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required placeholder="e.g., Buddy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="species">Species *</Label>
                <Select onValueChange={handleSpeciesChange} value={formData.species} required>
                  <SelectTrigger id="species"><SelectValue placeholder="Select species" /></SelectTrigger>
                  <SelectContent>{speciesOptions.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {/* Pet ID & Breed */}
              <div className="space-y-2">
                <Label htmlFor="pet_id">Pet ID</Label>
                <div className="flex gap-2">
                  <Input id="pet_id" value={formData.pet_id} readOnly placeholder="Auto-generated" className="font-mono bg-gray-100" />
                  {!pet && formData.species && (<Button type="button" variant="outline" size="icon" onClick={() => generateNewPetId(formData.species)} disabled={generatingId} title="Regenerate"><RefreshCw className={`w-4 h-4 ${generatingId ? 'animate-spin' : ''}`} /></Button>)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input id="breed" value={formData.breed} onChange={(e) => handleChange('breed', e.target.value)} placeholder="e.g., Golden Retriever" />
              </div>
            </div>
            {/* Photo Uploader */}
            <div className="space-y-2 flex flex-col items-center justify-center bg-gray-50 rounded-lg p-4">
              <Label>Pet Photo</Label>
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-2">
                {currentImage ? (
                  <img src={currentImage} alt="Pet" className="w-full h-full object-cover" />
                ) : (
                  <PawPrint className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <Input id="photo" type="file" onChange={(e) => setImageFile(e.target.files[0])} accept="image/*" className="text-xs" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="space-y-2">
              <Label htmlFor="color">Color/Markings</Label>
              <Input id="color" value={formData.color} onChange={(e) => handleChange('color', e.target.value)} placeholder="e.g., Golden" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select onValueChange={(value) => handleChange('gender', value)} value={formData.gender}>
                <SelectTrigger id="gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>{genderOptions.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Date of Birth</Label>
              <Input id="birth_date" type="date" value={formData.birth_date} onChange={(e) => handleChange('birth_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" step="0.1" min="0" value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} placeholder="e.g., 25.5" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="microchip_id">Microchip ID</Label>
            <Input id="microchip_id" value={formData.microchip_id} onChange={(e) => handleChange('microchip_id', e.target.value)} placeholder="15-digit microchip number" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies">Known Allergies</Label>
            <Input id="allergies" value={formData.allergies} onChange={(e) => handleChange('allergies', e.target.value)} placeholder="e.g., Chicken, Pollen, None known" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_notes">Special Care Notes</Label>
            <Textarea id="special_notes" value={formData.special_notes} onChange={(e) => handleChange('special_notes', e.target.value)} placeholder="Any special care instructions, behavioral notes, or medical conditions..." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white" disabled={uploading}>
              {uploading ? <>Saving...</> : <><Save className="w-4 h-4 mr-2" /> {pet ? 'Update Pet' : 'Save Pet'}</>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}