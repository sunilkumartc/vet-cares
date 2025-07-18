import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Syringe, Plus, Edit, Trash2, Save, X, ArrowLeft } from "lucide-react"; // Added ArrowLeft
import { TenantVaccine } from "@/api/tenant-entities";

const vaccineTypes = ["core", "non_core", "required_by_law"];
const speciesOptions = ["dog", "cat", "bird", "rabbit", "hamster", "fish", "reptile", "other"];

export default function VaccineManagement() {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    vaccine_type: "core",
    species: [],
    frequency_months: 12,
    description: "",
    manufacturer: "",
    is_active: true
  });

  useEffect(() => {
    loadVaccines();
  }, []);

  const loadVaccines = async () => {
    try {
      const vaccineData = await TenantVaccine.list('-created_date');
      setVaccines(vaccineData);
    } catch (error) {
      console.error('Error loading vaccines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Map form data to match database schema
      const vaccineData = {
        name: formData.name,
        description: formData.description,
        manufacturer: formData.manufacturer,
        category: formData.vaccine_type, // Map vaccine_type to category
        duration_months: formData.frequency_months, // Map frequency_months to duration_months
        species: formData.species,
        is_active: formData.is_active
      };
      
      console.log('Saving vaccine data:', vaccineData);
      
      if (editingVaccine) {
        await TenantVaccine.update(editingVaccine.id, vaccineData);
      } else {
        await TenantVaccine.create(vaccineData);
      }
      setShowForm(false);
      setEditingVaccine(null);
      resetForm();
      loadVaccines();
    } catch (error) {
      console.error('Error saving vaccine:', error);
      alert('Failed to save vaccine. Please try again.');
    }
  };

  const handleEdit = (vaccine) => {
    console.log('Editing vaccine:', vaccine);
    setEditingVaccine(vaccine);
    setFormData({
      name: vaccine.name || "",
      vaccine_type: vaccine.vaccine_type || vaccine.category || "core",
      species: vaccine.species || [],
      frequency_months: vaccine.frequency_months || vaccine.duration_months || 12,
      description: vaccine.description || "",
      manufacturer: vaccine.manufacturer || "",
      is_active: vaccine.is_active !== undefined ? vaccine.is_active : true
    });
    setShowForm(true);
  };

  const handleDelete = async (vaccine) => {
    if (confirm(`Are you sure you want to delete "${vaccine.name}"? This action cannot be undone.`)) {
      try {
        await TenantVaccine.delete(vaccine.id);
        loadVaccines();
      } catch (error) {
        console.error('Error deleting vaccine:', error);
        alert('Failed to delete vaccine. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      vaccine_type: "core",
      species: [],
      frequency_months: 12,
      description: "",
      manufacturer: "",
      is_active: true
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVaccine(null);
    resetForm();
  };

  const handleSpeciesChange = (species, checked) => {
    setFormData(prev => ({
      ...prev,
      species: checked 
        ? [...prev.species, species]
        : prev.species.filter(s => s !== species)
    }));
  };

  if (showForm) {
    return (
      <Card className="max-w-7xl mx-auto w-full">
        <CardHeader className="relative"> {/* Relative for positioning back button */}
          {/* Back Arrow Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="absolute top-2 left-2 p-0 w-16 h-16 hover:bg-transparent flex items-center justify-center" // Positioned top-left, sized for visibility
            aria-label="Go back"
          >
            <ArrowLeft className="w-12 h-12 text-gray-600 hover:text-blue-800" /> {/* Large icon */}
          </Button>
          
          <CardTitle className="flex items-center justify-center gap-2 text-center">
            <Syringe className="w-5 h-5 text-green-600" />
            {editingVaccine ? 'Edit Vaccine' : 'Add New Vaccine'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Vaccine Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., DHPPiL, Rabies"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vaccine_type">Vaccine Type</Label>
                <Select
                  value={formData.vaccine_type}
                  onValueChange={(value) => setFormData({...formData, vaccine_type: value})}
                >
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
                <Label htmlFor="frequency_months">Frequency (Months)</Label>
                <Input
                  id="frequency_months"
                  type="number"
                  min="1"
                  value={formData.frequency_months}
                  onChange={(e) => setFormData({...formData, frequency_months: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                  placeholder="e.g., Merck, Zoetis"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Applicable Species *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                {speciesOptions.map(species => (
                  <div key={species} className="flex items-center space-x-2">
                    <Checkbox
                      id={species}
                      checked={formData.species.includes(species)}
                      onCheckedChange={(checked) => handleSpeciesChange(species, checked)}
                    />
                    <Label htmlFor={species} className="text-sm capitalize">
                      {species}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="What does this vaccine protect against?"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="is_active">Active (show in vaccination forms)</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                {editingVaccine ? 'Update Vaccine' : 'Add Vaccine'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vaccine Management</h2>
          <p className="text-gray-600 mt-1">Manage available vaccines for your clinic</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Vaccine
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading vaccines...</div>
      ) : vaccines.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Syringe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vaccines Found</h3>
            <p className="text-gray-600">Add your first vaccine to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {vaccines.map(vaccine => (
            <Card key={vaccine.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{vaccine.name}</h3>
                      <Badge className={vaccine.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {vaccine.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {(vaccine.vaccine_type || vaccine.category || 'unknown').replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <strong>Species:</strong> {vaccine.species?.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') || 'Not specified'}
                      </div>
                      <div>
                        <strong>Frequency:</strong> Every {vaccine.frequency_months || vaccine.duration_months || 12} months
                      </div>
                      {vaccine.manufacturer && (
                        <div>
                          <strong>Manufacturer:</strong> {vaccine.manufacturer}
                        </div>
                      )}
                      {vaccine.description && (
                        <div>
                          <strong>Description:</strong> {vaccine.description}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(vaccine)}
                      className="gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(vaccine)}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
