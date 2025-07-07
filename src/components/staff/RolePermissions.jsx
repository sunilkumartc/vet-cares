import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCheck, Users, Check } from "lucide-react";

const rolePermissions = {
  admin: {
    name: "Administrator",
    icon: Shield,
    color: "text-red-600 bg-red-100",
    permissions: [
      "Complete system access",
      "Staff management",
      "Financial reporting",
      "System settings",
      "Data export/import",
      "User account management",
      "Clinic configuration"
    ]
  },
  veterinarian: {
    name: "Veterinarian",
    icon: UserCheck,
    color: "text-blue-600 bg-blue-100",
    permissions: [
      "TenantAppointment management",
      "Medical records access",
      "Prescription writing",
      "TenantVaccination records",
      "Treatment planning",
      "Billing creation",
      "Patient diagnosis",
      "Surgery scheduling"
    ]
  },
  receptionist: {
    name: "Receptionist",
    icon: Users,
    color: "text-green-600 bg-green-100",
    permissions: [
      "TenantAppointment scheduling",
      "TenantClient management",
      "Basic billing operations",
      "Phone support",
      "Check-in/Check-out",
      "Payment processing",
      "Basic reporting"
    ]
  }
};

export default function RolePermissions() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Role-Based Access Control</h2>
        <p className="text-gray-600">Overview of permissions for each staff role</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {Object.entries(rolePermissions).map(([role, config]) => {
          const IconComponent = config.icon;
          
          return (
            <Card key={role} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${config.color}`}>
                  <IconComponent className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl">{config.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">Permissions:</h4>
                  <div className="space-y-2">
                    {config.permissions.map((permission, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Permission Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-red-600 mb-2">Administrator Access</h4>
            <p className="text-sm text-gray-600">
              Full system access including sensitive operations like staff management, financial reports, 
              and system configuration. Should be limited to trusted senior staff only.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-blue-600 mb-2">Veterinarian Access</h4>
            <p className="text-sm text-gray-600">
              Clinical access focused on patient care, medical records, and treatment. Can manage 
              appointments and billing related to their services.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-green-600 mb-2">Receptionist Access</h4>
            <p className="text-sm text-gray-600">
              Front-desk operations including appointment scheduling, client management, and basic 
              billing. Limited access to medical information to maintain patient privacy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}