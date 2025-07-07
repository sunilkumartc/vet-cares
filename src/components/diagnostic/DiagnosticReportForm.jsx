import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Save, X, Calendar as CalendarIcon, Upload, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { UploadFile } from "@/api/integrations";

export default function DiagnosticReportForm({ report, pets, clients, templates, onSubmit, onCancel }) {
  const generateReportId = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `RPT-${timestamp}`;
  };

  const getInitialFormData = () => ({
    report_id: report?.report_id || generateReportId(),
    pet_id: report?.pet_id || "",
    client_id: report?.client_id || "",
    template_id: report?.template_id || "",
    report_type: report?.report_type || "cytology",
    report_date: report?.report_date || new Date().toISOString().split('T')[0],
    collection_date: report?.collection_date || new Date().toISOString().split('T')[0],
    specimen_site: report?.specimen_site || "",
    referred_by: report?.referred_by || "",
    observations: report?.observations || "",
    images: report?.images || [],
    status: report?.status || "draft"
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [availablePets, setAvailablePets] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [report]);

  useEffect(() => {
    if (formData.client_id) {
      setAvailablePets(pets.filter(p => p.client_id === formData.client_id));
    } else {
      setAvailablePets([]);
    }
    if (formData.client_id && formData.pet_id && !pets.some(p => p.id === formData.pet_id && p.client_id === formData.client_id)) {
      setFormData(prev => ({ ...prev, pet_id: "" }));
    }
  }, [formData.client_id, pets]);

  useEffect(() => {
    // Filter templates by report type
    if (formData.report_type) {
      const filtered = templates.filter(t => 
        t.report_type === formData.report_type || t.report_type === 'other'
      );
      setAvailableTemplates(filtered);
      
      // Auto-select default template if available
      const defaultTemplate = filtered.find(t => t.is_default);
      if (defaultTemplate && !formData.template_id) {
        setFormData(prev => ({ ...prev, template_id: defaultTemplate.id }));
      }
    }
  }, [formData.report_type, templates]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientChange = (clientId) => {
    setFormData(prev => ({ ...prev, client_id: clientId, pet_id: "" }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, file_url]
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {report ? 'Edit Diagnostic Report' : 'New Diagnostic Report'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report_id">Report ID</Label>
              <Input
                id="report_id"
                value={formData.report_id}
                onChange={(e) => handleChange('report_id', e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report_type">Report Type *</Label>
              <Select
                value={formData.report_type}
                onValueChange={(value) => handleChange('report_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cytology">Cytology</SelectItem>
                  <SelectItem value="histopathology">Histopathology</SelectItem>
                  <SelectItem value="blood_work">Blood Work</SelectItem>
                  <SelectItem value="urine_analysis">Urine Analysis</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Owner *</Label>
              <Select
                value={formData.client_id}
                onValueChange={handleClientChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
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
              <Label htmlFor="pet_id">TenantPet *</Label>
              <Select
                value={formData.pet_id}
                onValueChange={(value) => handleChange('pet_id', value)}
                disabled={!formData.client_id || availablePets.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.client_id ? "Select owner first" : "Select pet"} />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_id">Report Template</Label>
            <Select
              value={formData.template_id}
              onValueChange={(value) => handleChange('template_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No Template</SelectItem>
                {availableTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name} {template.is_default && "(Default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Report Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.report_date ? format(new Date(formData.report_date), 'dd/MM/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.report_date ? new Date(formData.report_date) : undefined}
                    onSelect={(date) => handleChange('report_date', date ? format(date, 'yyyy-MM-dd') : '')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
             <div className="space-y-2">
              <Label>Collection Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.collection_date ? format(new Date(formData.collection_date), 'dd/MM/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.collection_date ? new Date(formData.collection_date) : undefined}
                    onSelect={(date) => handleChange('collection_date', date ? format(date, 'yyyy-MM-dd') : '')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specimen_site">Specimen Site</Label>
              <Input
                id="specimen_site"
                value={formData.specimen_site}
                onChange={(e) => handleChange('specimen_site', e.target.value)}
                placeholder="e.g., Left hind leg mass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referred_by">Referred By</Label>
              <Input
                id="referred_by"
                value={formData.referred_by}
                onChange={(e) => handleChange('referred_by', e.target.value)}
                placeholder="e.g., Dr. Smith"
              />
            </div>
          </div>


          <div className="space-y-2">
            <Label htmlFor="observations">Observations *</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => handleChange('observations', e.target.value)}
              placeholder="Enter your clinical observations and findings..."
              rows={8}
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Diagnostic Images</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  accept=".jpg,.jpeg,.png"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image-upload').click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
            </div>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative border rounded-lg p-2">
                    <img 
                      src={image} 
                      alt={`Diagnostic image ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(image, '_blank')}
                        className="bg-white/80 hover:bg-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="bg-white/80 hover:bg-white text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {report ? 'Update Report' : 'Save Report'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}