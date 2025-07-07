import React, { useState, useEffect } from "react";
import { Calendar, Users, PawPrint, FileText, Heart, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TenantAppointment, TenantPet, TenantClient } from "@/api/tenant-entities";
import { format } from "date-fns";

export default function StaffDashboard() {
  const [staffInfo, setStaffInfo] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaffData();
  }, []);

  const loadStaffData = async () => {
    try {
      // Get staff info from localStorage
      const staffSession = localStorage.getItem('staffSession');
      if (staffSession) {
        const staffData = JSON.parse(staffSession);
        setStaffInfo(staffData);

        // Load today's appointments
        const appointments = await TenantAppointment.list('-appointment_date', 20);
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayAppts = appointments.filter(apt => apt.appointment_date === today);
        setTodayAppointments(todayAppts);
      } else {
        // No staff session, redirect to login
        window.location.href = createPageUrl('StaffLogin');
        return;
      }
    } catch (error) {
      console.error('Error loading staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staffSession');
    window.location.href = createPageUrl('Home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!staffInfo) {
    window.location.href = createPageUrl('StaffLogin');
    return null;
  }

  const hasPermission = (permission) => {
    return staffInfo.permissions?.includes(permission) || staffInfo.role === 'admin';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome, {staffInfo.full_name}
              </h1>
              <p className="text-sm text-gray-600 capitalize">
                {staffInfo.role} • {staffInfo.employee_id}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Today's Appointments</p>
                  <p className="text-2xl font-bold">{todayAppointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">
                    {todayAppointments.filter(a => a.status === 'scheduled').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">
                    {todayAppointments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <p className="text-lg font-bold capitalize">{staffInfo.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hasPermission('appointments') && (
                <Link to={createPageUrl("Appointments")}>
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                    <Calendar className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Manage Appointments</div>
                      <div className="text-sm text-gray-500">Schedule and update</div>
                    </div>
                  </Button>
                </Link>
              )}
              
              {hasPermission('client_management') && (
                <Link to={createPageUrl("Clients")}>
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                    <Users className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Client Management</div>
                      <div className="text-sm text-gray-500">Add and update clients</div>
                    </div>
                  </Button>
                </Link>
              )}
              
              {hasPermission('medical_records') && (
                <Link to={createPageUrl("MedicalRecords")}>
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                    <FileText className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Medical Records</div>
                      <div className="text-sm text-gray-500">Patient history</div>
                    </div>
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No appointments scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {todayAppointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{appointment.appointment_time}</p>
                      <p className="text-sm text-gray-600">{appointment.reason || appointment.service_type}</p>
                    </div>
                    <Badge variant={
                      appointment.status === 'completed' ? 'default' :
                      appointment.status === 'confirmed' ? 'secondary' : 'outline'
                    }>
                      {appointment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}