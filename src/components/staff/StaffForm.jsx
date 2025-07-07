
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Save, X, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

const roles = ["admin", "veterinarian", "receptionist"];
const statuses = ["active", "inactive", "on_leave"];

const rolePermissions = {
  admin: ["all_access", "dashboard", "staff_management", "reporting", "system_settings"],
  veterinarian: ["dashboard", "appointments", "medical_records", "prescriptions", "vaccinations", "billing", "client_management"],
  receptionist: ["dashboard", "appointments", "client_management", "basic_billing", "phone_support"]
};

export default function StaffForm({ staff, onSubmit, onCancel }) {
  const getInitialFormData = () => ({
    full_name: staff?.full_name || "",
    email: staff?.email || "",
    password: "", // Always empty for security
    phone: staff?.phone || "",
    role: staff?.role || "",
    employee_id: staff?.employee_id || "",
    department: staff?.department || "",
    hire_date: staff?.hire_date || format(new Date(), 'yyyy-MM-dd'),
    salary: staff?.salary || "",
    status: staff?.status || "active",
    permissions: staff?.permissions || [],
    address: staff?.address || "",
    emergency_contact: staff?.emergency_contact || "",
    qualifications: staff?.qualifications || "",
    notes: staff?.notes || ""
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [staff]);

  useEffect(() => {
    // Auto-set permissions based on role
    if (formData.role && rolePermissions[formData.role]) {
      setFormData(prev => ({
        ...prev,
        permissions: rolePermissions[formData.role]
      }));
    }
  }, [formData.role]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (permission, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // If editing and password is empty, don't include it in the update
    const submitData = { ...formData };
    if (staff && !submitData.password) {
      delete submitData.password;
    }
    
    onSubmit(submitData);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const availablePermissions = [
    "dashboard", "appointments", "client_management", "medical_records", "prescriptions", 
    "vaccinations", "billing", "reporting", "staff_management", "system_settings"
  ];

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Section */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password {staff ? '(Leave empty to keep current password)' : '*'}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required={!staff}
                  placeholder={staff ? "Enter new password or leave empty" : "Enter password"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generateRandomPassword}
              >
                Generate
              </Button>
            </div>
            {formData.password && (
              <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                <strong>Remember to share this password securely with the staff member!</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => handleChange('employee_id', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Role and Department */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select onValueChange={(value) => handleChange('role', value)} value={formData.role} required>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="e.g., Surgery, General Practice"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value) => handleChange('status', value)} value={formData.status}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => handleChange('hire_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Monthly Salary (₹)</Label>
              <Input
                id="salary"
                type="number"
                value={formData.salary}
                onChange={(e) => handleChange('salary', parseFloat(e.target.value))}
                placeholder="50000"
              />
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              {availablePermissions.map(permission => (
                <div key={permission} className="flex items-center space-x-2">
                  <Checkbox
                    id={permission}
                    checked={formData.permissions.includes(permission)}
                    onCheckedChange={(checked) => handlePermissionChange(permission, checked)}
                  />
                  <Label htmlFor={permission} className="text-sm capitalize">
                    {permission.replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
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
              <Label htmlFor="qualifications">Qualifications</Label>
              <Textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) => handleChange('qualifications', e.target.value)}
                placeholder="Educational background, certifications, etc."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about the staff member"
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
              {staff ? 'Update Staff Member' : 'Add Staff Member'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
