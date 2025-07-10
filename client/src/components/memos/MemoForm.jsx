import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StickyNote, Save, X, Plus, Trash2 } from "lucide-react";

const categories = [
  { value: "behavioral", label: "Behavioral", color: "bg-red-100 text-red-800" },
  { value: "medical_preference", label: "Medical Preference", color: "bg-blue-100 text-blue-800" },
  { value: "payment", label: "Payment Issue", color: "bg-orange-100 text-orange-800" },
  { value: "appointment_preference", label: "TenantAppointment Preference", color: "bg-green-100 text-green-800" },
  { value: "handling", label: "Handling Instructions", color: "bg-purple-100 text-purple-800" },
  { value: "owner_preference", label: "Owner Preference", color: "bg-cyan-100 text-cyan-800" },
  { value: "clinic_workflow", label: "Clinic Workflow", color: "bg-yellow-100 text-yellow-800" },
  { value: "general", label: "General", color: "bg-gray-100 text-gray-800" }
];

const priorities = ["low", "medium", "high", "urgent"];

export default function MemoForm({ memo, client, pet, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    client_id: memo?.client_id || client?.id || "",
    pet_id: memo?.pet_id || pet?.id || "",
    category: memo?.category || "general",
    priority: memo?.priority || "medium",
    title: memo?.title || "",
    content: memo?.content || "",
    tags: memo?.tags || [],
    is_active: memo?.is_active !== undefined ? memo.is_active : true,
    expires_on: memo?.expires_on || "",
    author: memo?.author || "Current User"
  });

  const [newTag, setNewTag] = useState("");

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-600" />
          {memo ? 'Edit Internal TenantMemo' : 'Add Internal TenantMemo'}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Internal staff notes - not visible to clients
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select onValueChange={(value) => handleChange('category', value)} value={formData.category}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${cat.color.split(' ')[0]}`}></div>
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select onValueChange={(value) => handleChange('priority', value)} value={formData.priority}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title/Summary *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief summary of the memo..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">TenantMemo Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Detailed memo content..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
                className="flex-1"
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires_on">Expires On (Optional)</Label>
            <Input
              id="expires_on"
              type="date"
              value={formData.expires_on}
              onChange={(e) => handleChange('expires_on', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
              <Save className="w-4 h-4 mr-2" />
              {memo ? 'Update TenantMemo' : 'Save TenantMemo'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}