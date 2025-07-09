
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, X, Plus, Edit, Trash2, Upload } from "lucide-react";
import { TenantReportTemplate } from "@/api/tenant-entities";
import { UploadFile } from "@/api/integrations";

export default function ReportTemplateSettings({ templates, onSubmit }) {
  const [templateList, setTemplateList] = useState(templates || []);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingSignatureIndex, setUploadingSignatureIndex] = useState(null);
  
  const getDefaultTemplate = () => ({
    template_name: "",
    report_type: "cytology",
    clinic_name: "Dr. Ravi Pet Portal",
    clinic_address: "No. 32, 4th temple Street road, Malleshwaram, Bengaluru",
    clinic_phone: "082961 43115",
    clinic_email: "dr.ravi@example.com",
    logo_url: "",
    header_text: "",
    footer_text: "Thank you for choosing Dr. Ravi Pet Portal for your pet's diagnostic needs.",
    signature_fields: [
      {
        title: "Veterinary Pathologist",
        name: "",
        qualification: "",
        signature_image_url: ""
      }
    ],
    is_default: false,
    is_active: true
  });

  const [formData, setFormData] = useState(getDefaultTemplate());

  useEffect(() => {
    setTemplateList(templates || []);
  }, [templates]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignatureChange = (index, field, value) => {
    const newSignatures = [...formData.signature_fields];
    newSignatures[index] = { ...newSignatures[index], [field]: value };
    setFormData(prev => ({ ...prev, signature_fields: newSignatures }));
  };

  const addSignatureField = () => {
    setFormData(prev => ({
      ...prev,
      signature_fields: [...prev.signature_fields, { title: "", name: "", qualification: "", signature_image_url: "" }]
    }));
  };

  const removeSignatureField = (index) => {
    setFormData(prev => ({
      ...prev,
      signature_fields: prev.signature_fields.filter((_, i) => i !== index)
    }));
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleChange('logo_url', file_url);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureImageUpload = async (event, index) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingSignatureIndex(index);
    try {
      const { file_url } = await UploadFile({ file });
      handleSignatureChange(index, 'signature_image_url', file_url);
    } catch (error) {
      console.error('Error uploading signature:', error);
      alert('Failed to upload signature. Please try again.');
    } finally {
      setUploadingSignatureIndex(null);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setFormData({ ...getDefaultTemplate(), ...template }); // Ensure all fields are present
    setIsEditing(true);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setFormData(getDefaultTemplate());
    setIsEditing(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (selectedTemplate) {
        await TenantReportTemplate.update(selectedTemplate.id, formData);
      } else {
        await TenantReportTemplate.create(formData);
      }
      
      setIsEditing(false);
      setSelectedTemplate(null);
      setFormData(getDefaultTemplate());
      
      // Notify parent to refetch templates
      if (onSubmit) {
        onSubmit();
      }
      
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (confirm(`Are you sure you want to delete the template "${template.template_name}"?`)) {
      try {
        await TenantReportTemplate.delete(template.id);
        if (onSubmit) {
          onSubmit();
        }
        alert('Template deleted successfully!');
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedTemplate(null);
    setFormData(getDefaultTemplate());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Templates</h2>
          <p className="text-gray-600">Configure templates for diagnostic reports</p>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <Button onClick={handleNewTemplate} className="gap-2">
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templateList.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        {template.report_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {template.is_default && (
                        <Badge className="bg-green-100 text-green-800">Default</Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{template.clinic_name}</p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {selectedTemplate ? 'Edit Template' : 'New Template'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="signatures">Signatures</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template_name">Template Name *</Label>
                    <Input
                      id="template_name"
                      value={formData.template_name}
                      onChange={(e) => handleChange('template_name', e.target.value)}
                      placeholder="e.g., Standard Cytology Template"
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
                        <SelectItem value="fecal_exam">Fecal Exam</SelectItem>
                        <SelectItem value="skin_scraping">Skin Scraping</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinic_name">Clinic Name *</Label>
                  <Input
                    id="clinic_name"
                    value={formData.clinic_name}
                    onChange={(e) => handleChange('clinic_name', e.target.value)}
                    placeholder="Your clinic name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinic_address">Clinic Address</Label>
                  <Textarea
                    id="clinic_address"
                    value={formData.clinic_address}
                    onChange={(e) => handleChange('clinic_address', e.target.value)}
                    placeholder="Full clinic address"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinic_phone">Phone</Label>
                    <Input
                      id="clinic_phone"
                      value={formData.clinic_phone}
                      onChange={(e) => handleChange('clinic_phone', e.target.value)}
                      placeholder="Clinic phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clinic_email">Email</Label>
                    <Input
                      id="clinic_email"
                      value={formData.clinic_email}
                      onChange={(e) => handleChange('clinic_email', e.target.value)}
                      placeholder="Clinic email address"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="branding" className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Clinic Logo</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      accept=".jpg,.jpeg,.png"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload').click()}
                      disabled={uploading}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                    {formData.logo_url && (
                      <img
                        src={formData.logo_url}
                        alt="Clinic Logo"
                        className="h-12 w-auto object-contain"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="header_text">Header Text</Label>
                  <Textarea
                    id="header_text"
                    value={formData.header_text}
                    onChange={(e) => handleChange('header_text', e.target.value)}
                    placeholder="Additional text to appear in the header"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer_text">Footer Text</Label>
                  <Textarea
                    id="footer_text"
                    value={formData.footer_text}
                    onChange={(e) => handleChange('footer_text', e.target.value)}
                    placeholder="Text to appear in the footer"
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="signatures" className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Signature Fields</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSignatureField}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Signature
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.signature_fields && formData.signature_fields.map((signature, index) => (
                    <Card key={index} className="p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={signature.title}
                              onChange={(e) => handleSignatureChange(index, 'title', e.target.value)}
                              placeholder="e.g., Veterinary Pathologist"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={signature.name}
                              onChange={(e) => handleSignatureChange(index, 'name', e.target.value)}
                              placeholder="Doctor's name"
                            />
                          </div>
                           <div className="space-y-2">
                            <Label>Qualification</Label>
                             <Input
                              value={signature.qualification}
                              onChange={(e) => handleSignatureChange(index, 'qualification', e.target.value)}
                              placeholder="e.g., DVM, PhD"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Signature Image</Label>
                           <div className="flex items-center gap-4">
                            <input
                              type="file"
                              onChange={(e) => handleSignatureImageUpload(e, index)}
                              className="hidden"
                              id={`signature-upload-${index}`}
                              accept=".jpg,.jpeg,.png"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById(`signature-upload-${index}`).click()}
                              disabled={uploadingSignatureIndex === index}
                            >
                              {uploadingSignatureIndex === index ? 'Uploading...' : 'Upload'}
                            </Button>
                            {signature.signature_image_url && (
                              <div className="p-2 border rounded-md bg-white">
                                <img
                                  src={signature.signature_image_url}
                                  alt="Signature"
                                  className="h-12 w-auto object-contain"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSignatureField(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-6 mt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
