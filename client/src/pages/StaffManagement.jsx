import React, { useState, useEffect } from "react";
import { Plus, Search, Users, Shield, UserCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantStaff } from "@/api/tenantEntities";
import { User } from "@/api/tenant-entities";

import StaffForm from "../components/staff/StaffForm";
import StaffList from "../components/staff/StaffList";
import RolePermissions from "../components/staff/RolePermissions";

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [staff, searchTerm, activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const staffData = await TenantStaff.list('-created_date');
      setStaff(staffData);
      
      // Try to get current user, but don't fail if it doesn't work
      try {
        const userData = await User.me();
        setCurrentUser(userData);
      } catch (userError) {
        console.log('Could not load user data:', userError);
      }
    } catch (error) {
      console.error('Error loading staff data:', error);
      alert('Failed to load staff data. Please refresh the page and try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = staff;

    // Filter by role
    if (activeTab !== "all") {
      filtered = filtered.filter(member => member.role === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        member.full_name?.toLowerCase().includes(lowercasedFilter) ||
        member.email?.toLowerCase().includes(lowercasedFilter) ||
        member.employee_id?.toLowerCase().includes(lowercasedFilter) ||
        member.department?.toLowerCase().includes(lowercasedFilter)
      );
    }

    setFilteredStaff(filtered);
  };

  const handleSubmit = async (staffData) => {
    try {
      const dataToSubmit = { ...staffData };

      // Clean up salary field
      if (dataToSubmit.salary === '' || dataToSubmit.salary === null || isNaN(parseFloat(dataToSubmit.salary))) {
        delete dataToSubmit.salary;
      } else {
        dataToSubmit.salary = parseFloat(dataToSubmit.salary);
      }

      if (editingStaff) {
        await TenantStaff.update(editingStaff.id, dataToSubmit);
      } else {
        // Generate employee ID if not provided
        if (!dataToSubmit.employee_id) {
          const prefix = dataToSubmit.role === 'veterinarian' ? 'VET' : 
                       dataToSubmit.role === 'receptionist' ? 'REC' : 'ADM';
          dataToSubmit.employee_id = `${prefix}${Date.now().toString().slice(-4)}`;
        }
        await TenantStaff.create(dataToSubmit);
      }
      setShowForm(false);
      setEditingStaff(null);
      loadInitialData();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Failed to save staff member. Please try again.');
    }
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setShowForm(true);
  };

  const handleDelete = async (staffMember) => {
    const confirmMessage = `Are you sure you want to delete ${staffMember.full_name}?\n\nThis action cannot be undone and will permanently remove this staff member from the system.`;
    
    if (confirm(confirmMessage)) {
      try {
        await TenantStaff.delete(staffMember.id);
        alert('Staff member deleted successfully.');
        loadInitialData();
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Failed to delete staff member. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStaff(null);
  };

  const getRoleCount = (role) => {
    return staff.filter(member => member.role === role && member.status === 'active').length;
  };

  // Check if current user has admin permissions
  const checkAccess = () => {
    const staffSessionData = localStorage.getItem('staffSession');
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData);
        return staffSession.role === 'admin' || 
               staffSession.permissions?.includes('staff_management') ||
               staffSession.permissions?.includes('all_access');
      } catch (e) {
        console.error("Failed to parse staff session:", e);
      }
    }
    
    return currentUser?.role === 'admin';
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4">Loading staff data...</p>
      </div>
    );
  }

  if (!checkAccess()) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access staff management.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage team members and their access permissions</p>
        </div>
        <Button 
          onClick={() => { setEditingStaff(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Staff Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">Administrators</p>
              <p className="text-2xl font-bold">{getRoleCount('admin')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Veterinarians</p>
              <p className="text-2xl font-bold">{getRoleCount('veterinarian')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Receptionists</p>
              <p className="text-2xl font-bold">{getRoleCount('receptionist')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">Total Active</p>
              <p className="text-2xl font-bold">{staff.filter(s => s.status === 'active').length}</p>
            </div>
          </div>
        </div>
      </div>

      {!showForm && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, email, employee ID, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All Staff</TabsTrigger>
              <TabsTrigger value="admin">Administrators</TabsTrigger>
              <TabsTrigger value="veterinarian">Veterinarians</TabsTrigger>
              <TabsTrigger value="receptionist">Receptionists</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <StaffList
                staff={filteredStaff}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>
            
            <TabsContent value="admin" className="mt-6">
              <StaffList
                staff={filteredStaff}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>
            
            <TabsContent value="veterinarian" className="mt-6">
              <StaffList
                staff={filteredStaff}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>
            
            <TabsContent value="receptionist" className="mt-6">
              <StaffList
                staff={filteredStaff}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>
            
            <TabsContent value="permissions" className="mt-6">
              <RolePermissions />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {showForm && (
        <StaffForm
          staff={editingStaff}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}