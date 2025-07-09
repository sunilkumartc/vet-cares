import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";

export default function OperationalInsights({ appointments, clients, pets }) {
  const calculateInsights = () => {
    const today = new Date();
    
    // Doctor productivity (appointments handled per day over last 7 days)
    const doctorProductivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return isWithinInterval(aptDate, { start: dayStart, end: dayEnd });
      });

      const completed = dayAppointments.filter(apt => apt.status === 'completed').length;
      
      doctorProductivity.push({
        date: format(date, 'MMM dd'),
        appointments: dayAppointments.length,
        completed
      });
    }

    // Peak hours analysis
    const hourlyActivity = {};
    appointments.forEach(apt => {
      if (apt.appointment_time) {
        const hour = parseInt(apt.appointment_time.split(':')[0]);
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      }
    });

    const peakHoursData = Object.entries(hourlyActivity)
      .map(([hour, count]) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        appointments: count
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    // TenantClient retention analysis (clients with multiple visits)
    const clientVisits = {};
    appointments.forEach(apt => {
      clientVisits[apt.client_id] = (clientVisits[apt.client_id] || 0) + 1;
    });

    const retentionData = {
      oneTime: 0,
      returning: 0,
      frequent: 0
    };

    Object.values(clientVisits).forEach(visits => {
      if (visits === 1) retentionData.oneTime++;
      else if (visits <= 3) retentionData.returning++;
      else retentionData.frequent++;
    });

    const retentionChart = [
      { category: 'One-time', count: retentionData.oneTime },
      { category: 'Returning', count: retentionData.returning },
      { category: 'Frequent', count: retentionData.frequent }
    ];

    // Average appointments per day
    const totalDays = Math.max(1, new Date().getDate());
    const avgAppointmentsPerDay = appointments.length / totalDays;

    return {
      doctorProductivity,
      peakHoursData,
      retentionChart,
      avgAppointmentsPerDay: avgAppointmentsPerDay.toFixed(1)
    };
  };

  const insights = calculateInsights();

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          Operational Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-indigo-600">Avg Daily Appointments</p>
            <p className="text-xl font-bold text-indigo-700">{insights.avgAppointmentsPerDay}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-green-600">Total Clients</p>
            <p className="text-xl font-bold text-green-700">{clients.length}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <Activity className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-purple-600">Total Appointments</p>
            <p className="text-xl font-bold text-purple-700">{appointments.length}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-blue-600">Peak Hour</p>
            <p className="text-xl font-bold text-blue-700">
              {insights.peakHoursData.length > 0 ? 
                insights.peakHoursData.reduce((max, hour) => 
                  hour.appointments > max.appointments ? hour : max
                ).hour : 'N/A'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Doctor Productivity */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Daily TenantAppointment Volume (Last 7 Days)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={insights.doctorProductivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="appointments" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Total"
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Hours */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">TenantAppointment Distribution by Hour</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={insights.peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="appointments" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Client Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Client Visit Patterns</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={insights.retentionChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}