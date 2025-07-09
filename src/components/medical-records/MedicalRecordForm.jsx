
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save, X, PlusCircle, Trash2, Upload, FileIcon, Image, TestTube2, CalendarIcon, PawPrint, Thermometer, HeartPulse, Wind, Droplets } from "lucide-react";
import { UploadFile } from "@/api/integrations";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import DocumentViewer from "./DocumentViewer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper component for displaying vitals summary
const VitalsDisplay = ({ vitals }) => {
  if (!vitals) return null;

  // Convert Celsius to Fahrenheit for display
  const convertToFahrenheit = (celsius) => {
    return celsius ? (parseFloat(celsius) * 9 / 5 + 32).toFixed(1) : null;
  };

  const vitalItems = [
    { label: "Weight", value: vitals.weight_kg, unit: "kg", icon: PawPrint },
    { label: "Temperature", value: vitals.temperature_c ? convertToFahrenheit(vitals.temperature_c) : null, unit: "°F", icon: Thermometer },
    { label: "Heart Rate", value: vitals.heart_rate_bpm, unit: "bpm", icon: HeartPulse },
    { label: "Resp. Rate", value: vitals.respiratory_rate_rpm, unit: "rpm", icon: Wind },
    { label: "Blood Pressure", value: vitals.blood_pressure, unit: "", icon: Droplets },
    // Capillary refill time is not included in the outline for VitalsDisplay, so excluding it here
  ].filter(item => item.value);

  if (vitalItems.length === 0) return null;

  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><HeartPulse className="w-5 h-5 text-red-500" />Vitals</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {vitalItems.map(item => (
          <div key={item.label} className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{item.value} <span className="text-lg">{item.unit}</span></div>
            <div className="text-blue-700 text-sm">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function MedicalRecordForm({ record, pets, clients, veterinarians, onSubmit, onCancel }) {
  const getInitialFormData = () => {
    let initialClientId = "";
    let initialPetId = "";
    
    // If editing an existing record, find the client via the pet.
    if (record?.pet_id) {
      const petForRecord = pets.find(p => p.id === record.pet_id);
      initialClientId = petForRecord?.client_id || "";
      initialPetId = record.pet_id;
    } 
    // If creating a new record from the single-client view, use that client's ID.
    else if (clients?.length === 1) {
      initialClientId = clients[0].id;
      // If there's a pet_id in the record prop (from context), use it
      if (record?.pet_id) {
        initialPetId = record.pet_id;
      }
    }

    return {
      pet_id: initialPetId,
      client_id: initialClientId,
      visit_date: record?.visit_date || new Date().toISOString().split('T')[0],
      status: record?.status || "active",
      subjective: record?.subjective || "",
      objective: record?.objective || "",
      assessment: record?.assessment || "",
      plan: record?.plan || "",
      vitals: record?.vitals || { weight_kg: '', temperature_c: '', heart_rate_bpm: '', respiratory_rate_rpm: '', blood_pressure: '', capillary_refill_time_sec: '' },
      medications: record?.medications || [],
      follow_up_date: record?.follow_up_date || "",
      veterinarian: record?.veterinarian || "",
      lab_reports: record?.lab_reports || [],
      radiology_reports: record?.radiology_reports || [],
      other_attachments: record?.other_attachments || [],
      notes: record?.notes || "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [availablePets, setAvailablePets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState({ url: '', name: '', type: '' });
  const [activeTab, setActiveTab] = useState("subjective");

  // Helper function to convert Celsius to Fahrenheit
  const convertToFahrenheit = (celsius) => {
    // Removed .toFixed() to allow for free-form float input without reformatting.
    return celsius ? (parseFloat(celsius) * 9 / 5 + 32) : '';
  };

  // Helper function to convert Fahrenheit to Celsius
  const convertToCelsius = (fahrenheit) => {
    // Removed .toFixed() to allow for free-form float input without reformatting.
    return fahrenheit ? ((parseFloat(fahrenheit) - 32) * 5 / 9) : '';
  };

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [record, pets]);

  useEffect(() => {
    if (formData.client_id) {
      const clientPets = pets.filter(p => p.client_id === formData.client_id);
      setAvailablePets(clientPets);
      // If a pet is selected, update its weight in the vitals
      const selectedPet = clientPets.find(p => p.id === formData.pet_id);
      if (selectedPet && !formData.vitals.weight_kg) {
        setFormData(prev => ({
          ...prev,
          vitals: { ...prev.vitals, weight_kg: selectedPet.weight || '' }
        }));
      }
    } else {
      setAvailablePets([]);
    }
  }, [formData.client_id, formData.pet_id, pets]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVitalChange = (field, value) => {
    if (field === 'temperature_f') {
      // Convert Fahrenheit input to Celsius for storage in temperature_c
      const celsiusValue = convertToCelsius(value);
      setFormData(prev => ({
        ...prev,
        vitals: {
          ...prev.vitals,
          temperature_c: celsiusValue,
          // We only store temperature_c as the canonical value.
          // The display value for the input will be derived from temperature_c.
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, vitals: { ...prev.vitals, [field]: value } }));
    }
  };

  const handleClientChange = (clientId) => {
    setFormData(prev => ({ ...prev, client_id: clientId, pet_id: "" }));
  };

  const handleMedicationChange = (index, field, value) => {
    const newMedications = [...formData.medications];
    newMedications[index][field] = value;
    handleChange('medications', newMedications);
  };

  const addMedication = () => {
    const newMedication = { name: '', route: '', frequency: '', duration: '', notes: '' };
    handleChange('medications', [...formData.medications, newMedication]);
  };

  const removeMedication = (index) => {
    const newMedications = formData.medications.filter((_, i) => i !== index);
    handleChange('medications', newMedications);
  };

  const handleFileUpload = async (file, category) => {
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleChange(category, [...(formData[category] || []), file_url]);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (category, index) => {
    handleChange(category, formData[category].filter((_, i) => i !== index));
  };

  const handleFileView = (fileUrl, fileName, fileType) => {
    setCurrentFile({ url: fileUrl, name: fileName, type: fileType });
    setViewerOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.pet_id) {
      alert('Please select a pet.');
      return;
    }

    if (!formData.subjective.trim()) {
      alert('Please enter subjective findings (chief complaint/history).');
      return;
    }

    // Clean up vitals data - convert empty strings to null for numeric fields
    const cleanedVitals = {
      weight_kg: formData.vitals.weight_kg === '' ? null : parseFloat(formData.vitals.weight_kg) || null,
      temperature_c: formData.vitals.temperature_c === '' ? null : parseFloat(formData.vitals.temperature_c) || null,
      heart_rate_bpm: formData.vitals.heart_rate_bpm === '' ? null : parseInt(formData.vitals.heart_rate_bpm) || null,
      respiratory_rate_rpm: formData.vitals.respiratory_rate_rpm === '' ? null : parseInt(formData.vitals.respiratory_rate_rpm) || null,
      blood_pressure: formData.vitals.blood_pressure || null,
      capillary_refill_time_sec: formData.vitals.capillary_refill_time_sec === '' ? null : parseFloat(formData.vitals.capillary_refill_time_sec) || null
    };

    const { client_id, ...submitData } = formData;
    const finalData = {
      ...submitData,
      vitals: cleanedVitals,
      medications: formData.medications,
      follow_up_date: formData.follow_up_date || null
    };

    console.log('Submitting medical record data:', finalData);
    onSubmit(finalData);
  };

  const FileUploadSection = ({ category, title, icon: Icon }) => (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 font-semibold text-gray-800"><Icon className="w-5 h-5 text-blue-600" /> {title}</Label>
        <Button type="button" variant="outline" size="sm" asChild><label htmlFor={`${category}-upload`} className="cursor-pointer gap-1"><Upload className="w-3 h-3" /> Upload</label></Button>
        <input type="file" multiple onChange={(e) => Array.from(e.target.files).forEach(file => handleFileUpload(file, category))} className="hidden" id={`${category}-upload`} />
      </div>
      <div className="space-y-2">
        {(formData[category] || []).map((file, index) => (
          <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
            <span className="text-sm">{title.slice(0, -1)} {index + 1}</span>
            <div className="flex gap-1"><Button type="button" variant="ghost" size="sm" onClick={() => handleFileView(file, `${title.slice(0, -1)} ${index + 1}`, 'application/pdf')}>View</Button><Button type="button" variant="ghost" size="sm" onClick={() => removeFile(category, index)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {record ? 'Edit Medical Record' : 'Create Medical Record'}
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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
                    <SelectItem key={client.id} value={client.id}>
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
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name} ({pet.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Replaced visit date input with Popover Calendar */}
            <div className="space-y-2">
              <Label>Visit Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.visit_date ? format(new Date(formData.visit_date), 'dd-MM-yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.visit_date ? new Date(formData.visit_date) : undefined}
                    onSelect={(date) => handleChange('visit_date', date ? format(date, 'yyyy-MM-dd') : '')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Moved and replaced follow-up date input with Popover Calendar */}
            <div className="space-y-2">
              <Label>Follow-up Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.follow_up_date ? format(new Date(formData.follow_up_date), 'dd-MM-yyyy') : 'Select follow-up date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.follow_up_date ? new Date(formData.follow_up_date) : undefined}
                    onSelect={(date) => handleChange('follow_up_date', date ? format(date, 'yyyy-MM-dd') : '')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="veterinarian">Attending Veterinarian</Label>
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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="subjective">Subjective</TabsTrigger><TabsTrigger value="objective">Objective</TabsTrigger><TabsTrigger value="assessment">Assessment</TabsTrigger><TabsTrigger value="plan">Plan</TabsTrigger></TabsList>

              <TabsContent value="subjective" className="mt-4"><Textarea placeholder="Enter chief complaint, history, and client observations..." value={formData.subjective} onChange={(e) => handleChange('subjective', e.target.value)} rows={12} /></TabsContent>

              <TabsContent value="objective" className="mt-4 space-y-4">
                <Textarea placeholder="Enter physical examination findings..." value={formData.objective} onChange={(e) => handleChange('objective', e.target.value)} rows={8} />
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-semibold">Vitals</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={formData.vitals.weight_kg} onChange={(e) => handleVitalChange('weight_kg', e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label>Temperature (°F)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.vitals.temperature_c ? convertToFahrenheit(formData.vitals.temperature_c) : ''}
                        onChange={(e) => handleVitalChange('temperature_f', e.target.value)}
                        placeholder="e.g., 101.5"
                      />
                    </div>
                    <div className="space-y-1"><Label>Heart Rate (bpm)</Label><Input type="number" value={formData.vitals.heart_rate_bpm} onChange={(e) => handleVitalChange('heart_rate_bpm', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Resp. Rate (rpm)</Label><Input type="number" value={formData.vitals.respiratory_rate_rpm} onChange={(e) => handleVitalChange('respiratory_rate_rpm', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Blood Pressure</Label><Input value={formData.vitals.blood_pressure} onChange={(e) => handleVitalChange('blood_pressure', e.target.value)} placeholder="e.g., 120/80" /></div>
                    <div className="space-y-1"><Label>CRT (sec)</Label><Input type="number" step="0.1" value={formData.vitals.capillary_refill_time_sec} onChange={(e) => handleVitalChange('capillary_refill_time_sec', e.target.value)} /></div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <FileUploadSection category="lab_reports" title="Lab Reports" icon={TestTube2} />
                  <FileUploadSection category="radiology_reports" title="Radiology Reports" icon={Image} />
                </div>
                <FileUploadSection category="other_attachments" title="Other Documents" icon={FileIcon} />
              </TabsContent>

              <TabsContent value="assessment" className="mt-4"><Textarea placeholder="Enter diagnosis, differential diagnoses, or assessment of the case..." value={formData.assessment} onChange={(e) => handleChange('assessment', e.target.value)} rows={12} /></TabsContent>

              <TabsContent value="plan" className="mt-4 space-y-4">
                <Textarea placeholder="Enter treatment plan, further diagnostics, and client communication..." value={formData.plan} onChange={(e) => handleChange('plan', e.target.value)} rows={6} />
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center"><h4 className="font-semibold">Medications</h4><Button type="button" variant="outline" size="sm" onClick={addMedication} className="gap-1"><PlusCircle className="w-4 h-4" /> Add</Button></div>
                  <div className="space-y-2">
                    {formData.medications.map((med, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end p-2 border rounded bg-gray-50">
                        <div className="space-y-1 md:col-span-2"><Label className="text-xs">Name</Label><Input value={med.name} onChange={(e) => handleMedicationChange(index, 'name', e.target.value)} placeholder="Medication Name" /></div>
                        <div className="space-y-1"><Label className="text-xs">Route</Label><Input value={med.route} onChange={(e) => handleMedicationChange(index, 'route', e.target.value)} placeholder="e.g., Oral" /></div>
                        <div className="space-y-1"><Label className="text-xs">Frequency</Label><Input value={med.frequency} onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)} placeholder="e.g., BID" /></div>
                        <div className="space-y-1"><Label className="text-xs">Duration</Label><Input value={med.duration} onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)} placeholder="e.g., 7 days" /></div>
                        <div className="space-y-1 md:col-span-2"><Label className="text-xs">Notes</Label><Input value={med.notes} onChange={(e) => handleMedicationChange(index, 'notes', e.target.value)} placeholder="Notes" /></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMedication(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-3 pt-6 mt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}><X className="w-4 h-4 mr-2" /> Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={uploading}><Save className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : (record ? 'Update Record' : 'Save Record')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <DocumentViewer isOpen={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={currentFile.url} fileName={currentFile.name} fileType={currentFile.type} />
    </>
  );
}
