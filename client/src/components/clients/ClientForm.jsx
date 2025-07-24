import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Save, X, ArrowLeft } from "lucide-react"; // Added ArrowLeft

export default function ClientForm({ client, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    first_name: client?.first_name || "",
    last_name: client?.last_name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    address: client?.address || "",
    emergency_contact: client?.emergency_contact || "",
    notes: client?.notes || "",
    sendWelcomeMail: false
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (e) => {
    setFormData(prev => ({ ...prev, sendWelcomeMail: e.target.checked }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="max-w-2xl mx-auto w-full">
      <CardHeader className="relative"> {/* Relative for positioning back button */}
        {/* Back Arrow Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="absolute top-2 left-2 p-0 w-16 h-16 hover:bg-transparent flex items-center justify-center" // Positioned top-left, sized for visibility
          aria-label="Go back"
        >
          <ArrowLeft className="w-12 h-12 text-gray-600 hover:text-blue-800" /> {/* Large icon */}
        </Button>
        
        <CardTitle className="flex items-center justify-center gap-2 text-center">
          <Users className="w-5 h-5 text-blue-600" />
          {client ? 'Edit Client' : 'Add New Client'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name(Optional)</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email(Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact">Emergency Contact</Label>
            <Input
              id="emergency_contact"
              value={formData.emergency_contact}
              onChange={(e) => handleChange('emergency_contact', e.target.value)}
              placeholder="Name and phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder="Any special notes about this client..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="sendWelcomeMail"
              type="checkbox"
              checked={formData.sendWelcomeMail}
              onChange={handleCheckboxChange}
            />
            <Label htmlFor="sendWelcomeMail">Send Welcome Mail</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {client ? 'Update Client' : 'Add Client'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
