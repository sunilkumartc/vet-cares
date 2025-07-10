import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Phone, Mail, Edit, Shield, UserCheck, Calendar, MapPin, AlertTriangle, Trash2 } from "lucide-react";
import { format } from "date-fns";

const roleColors = {
  admin: "bg-red-100 text-red-800",
  veterinarian: "bg-blue-100 text-blue-800",
  receptionist: "bg-green-100 text-green-800"
};

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  on_leave: "bg-yellow-100 text-yellow-800"
};

const roleIcons = {
  admin: Shield,
  veterinarian: UserCheck,
  receptionist: Users
};

export default function StaffList({ staff, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="grid gap-4">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No staff members found</h3>
          <p className="text-gray-600">Start by adding your first staff member to the system.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {staff.map((member) => {
        const RoleIcon = roleIcons[member.role] || Users;
        
        return (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <RoleIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {member.full_name}
                      </h3>
                      <Badge className={roleColors[member.role]}>
                        {member.role?.replace('_', ' ')}
                      </Badge>
                      <Badge className={statusColors[member.status]}>
                        {member.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">ID:</span>
                        {member.employee_id}
                      </div>
                      {member.department && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Dept:</span>
                          {member.department}
                        </div>
                      )}
                      {member.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {member.email}
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {member.phone}
                        </div>
                      )}
                    </div>
                    {member.hire_date && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Joined: {format(new Date(member.hire_date), 'dd-MM-yyyy')}</span>
                      </div>
                    )}
                    {member.salary && (
                      <div className="text-sm text-gray-600">
                        <strong>Salary:</strong> ₹{member.salary.toLocaleString()}/month
                      </div>
                    )}
                    {member.qualifications && (
                      <div className="text-sm text-gray-600 bg-gray-50 rounded p-2 max-w-lg">
                        <strong>Qualifications:</strong> {member.qualifications}
                      </div>
                    )}
                    {member.status === 'inactive' && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Staff member is currently inactive</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(member)}
                    className="gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(member)}
                    className="gap-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}