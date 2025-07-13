
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

export default function AppointmentMetrics({ appointments, dateRange }) {
  const calculateMetrics = () => {
    const today = new Date();
    const startDate = dateRange?.from || startOfDay(today);
    const endDate = dateRange?.to || endOfDay(today);

    const periodAppointments = appointments.filter(apt => {
      if (!apt.appointment_date) return false;
      try {
        const aptDate = parseISO(apt.appointment_date);
        return isWithinInterval(aptDate, { start: startDate, end: endDate });
      } catch (error) {
        console.warn('Invalid appointment_date in AppointmentMetrics:', apt.appointment_date);
        return false;
      }
    });

    // Status breakdown for the period
    const statusCount = {
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0
    };

    periodAppointments.forEach(apt => {
      statusCount[apt.status] = (statusCount[apt.status] || 0) + 1;
    });

    const statusData = Object.entries(statusCount).map(([status, count]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      count,
      color: status === 'completed' ? '#10B981' :
             status === 'scheduled' || status === 'confirmed' ? '#F59E0B' :
             '#EF4444'
    }));

    // Peak hours analysis (calculated on all data for better trend analysis)
    const hourlyCount = {};
    appointments.forEach(apt => { // Uses all 'appointments'
      if (apt.appointment_time) {
        const hour = parseInt(apt.appointment_time.split(':')[0]);
        hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
      }
    });

    const peakHours = Object.entries(hourlyCount)
      .map(([hour, count]) => ({
        hour: `${hour}:00`,
        count
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    // Service type breakdown (calculated on all data)
    const serviceCount = {};
    appointments.forEach(apt => { // Uses all 'appointments'
      const service = apt.service_type || 'other';
      serviceCount[service] = (serviceCount[service] || 0) + 1;
    });

    const serviceData = Object.entries(serviceCount).map(([service, count]) => ({
      service: service.replace('_', ' ').toUpperCase(),
      count
    }));

    return {
      periodTotal: periodAppointments.length, // Changed from todayTotal
      completed: statusCount.completed,
      cancelled: statusCount.cancelled + statusCount.no_show,
      statusData: statusData.filter(item => item.count > 0),
      peakHours,
      serviceData
    };
  };

  const metrics = calculateMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Appointments & Visits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary for the period */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-blue-600">Total in Period</p>
            <p className="text-xl font-bold text-blue-700">{metrics.periodTotal}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-green-600">Completed</p>
            <p className="text-xl font-bold text-green-700">{metrics.completed}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-red-600">Cancelled/No-show</p>
            <p className="text-xl font-bold text-red-700">{metrics.cancelled}</p>
          </div>
        </div>

        {/* Peak Hours */}
        {metrics.peakHours.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Peak Hours Analysis</h4>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={metrics.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Service Type Breakdown */}
        {metrics.serviceData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Appointments by Service Type</h4>
            <div className="space-y-2">
              {metrics.serviceData.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.service}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(item.count / metrics.serviceData.reduce((sum, s) => sum + s.count, 0)) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-800 w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
