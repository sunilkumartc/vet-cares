import React, { useState, useEffect } from "react";
import { BarChart3, DollarSign, Users, PawPrint, Calendar as CalendarIcon, AlertTriangle, TrendingUp, FileText, Syringe, Package, Clock, Download, RefreshCw, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { TenantAppointment, TenantClient, TenantPet, TenantInvoice, TenantMedicalRecord, TenantVaccination, TenantProduct, TenantProductBatch, TenantDiagnosticReport } from "@/api/tenant-entities";

import FinancialOverview from "../components/analytics/FinancialOverview";
import ClientPetMetrics from "../components/analytics/ClientPetMetrics";
import AppointmentMetrics from "../components/analytics/AppointmentMetrics";
import MedicalMetrics from "../components/analytics/MedicalMetrics";
import InventoryAlerts from "../components/analytics/InventoryAlerts";
import OperationalInsights from "../components/analytics/OperationalInsights";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    financial: {},
    clients: [],
    pets: [],
    appointments: [],
    invoices: [],
    medicalRecords: [],
    vaccinations: [],
    products: [],
    batches: [],
    diagnosticReports: []
  });
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        appointments,
        clients,
        pets,
        invoices,
        medicalRecords,
        vaccinations,
        products,
        batches,
        diagnosticReports
      ] = await Promise.all([
        TenantAppointment.list('-appointment_date', 500),
        TenantClient.list('-created_date', 1000),
        TenantPet.list('-created_date', 1000),
        TenantInvoice.list('-invoice_date', 500),
        TenantMedicalRecord.list('-visit_date', 500),
        TenantVaccination.list('-date_administered', 500),
        TenantProduct.list(),
        TenantProductBatch.list(),
        TenantDiagnosticReport.list('-report_date', 200)
      ]);

      setDashboardData({
        appointments,
        clients,
        pets,
        invoices,
        medicalRecords,
        vaccinations,
        products,
        batches,
        diagnosticReports
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportDashboard = async () => {
    // Create comprehensive dashboard export
    const exportData = {
      generated_at: new Date().toISOString(),
      period: {
        from: dateRange.from ? dateRange.from.toISOString() : null,
        to: dateRange.to ? dateRange.to.toISOString() : null
      },
      summary: calculateSummaryMetrics(),
      detailed_data: dashboardData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinic_analytics_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const calculateSummaryMetrics = () => {
    const today = new Date();
    const startDate = dateRange.from || startOfDay(subDays(today, 30));
    const endDate = dateRange.to || endOfDay(today);

    // Ensure dashboardData has the required arrays
    const invoices = dashboardData.invoices || [];
    const clients = dashboardData.clients || [];
    const pets = dashboardData.pets || [];
    const appointments = dashboardData.appointments || [];

    const periodInvoices = invoices.filter(inv => {
      if (!inv.invoice_date) return false;
      try {
        return isWithinInterval(parseISO(inv.invoice_date), { start: startDate, end: endDate });
      } catch (error) {
        console.warn('Invalid invoice_date:', inv.invoice_date);
        return false;
      }
    });
    
    const periodRevenue = periodInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const periodClients = clients.filter(client => {
      if (!client.created_date) return false;
      try {
        return isWithinInterval(parseISO(client.created_date), { start: startDate, end: endDate });
      } catch (error) {
        console.warn('Invalid client created_date:', client.created_date);
        return false;
      }
    }).length;

    const periodPets = pets.filter(pet => {
      if (!pet.created_date) return false;
      try {
        return isWithinInterval(parseISO(pet.created_date), { start: startDate, end: endDate });
      } catch (error) {
        console.warn('Invalid pet created_date:', pet.created_date);
        return false;
      }
    }).length;

    const periodAppointments = appointments.filter(apt => {
      if (!apt.appointment_date) return false;
      try {
        return isWithinInterval(parseISO(apt.appointment_date), { start: startDate, end: endDate });
      } catch (error) {
        console.warn('Invalid appointment_date:', apt.appointment_date);
        return false;
      }
    });

    return {
      periodRevenue,
      periodClients,
      periodPets,
      periodAppointments: periodAppointments.length,
      completedAppointments: periodAppointments.filter(apt => apt.status === 'completed').length
    };
  };

  const summaryMetrics = calculateSummaryMetrics();

  const periodLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'LLL d')} - ${format(dateRange.to, 'LLL d, y')}`
    : 'Selected Period';

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive clinic performance overview • Last updated: {format(lastUpdated, 'PPp')}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[240px] justify-start">
                <CalendarIcon className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  "Pick a date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-2">
                 <h4 className="font-medium text-sm text-center">Select Date Range</h4>
                 <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                 />
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={loadDashboardData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportDashboard} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Revenue</p>
                <p className="text-2xl font-bold">
                  ₹{summaryMetrics.periodRevenue.toFixed(2)}
                </p>
                <p className="text-green-200 text-xs mt-1">{periodLabel}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Appointments</p>
                <p className="text-2xl font-bold">
                  {summaryMetrics.completedAppointments}/{summaryMetrics.periodAppointments}
                </p>
                 <p className="text-blue-200 text-xs mt-1">{periodLabel}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">New Clients</p>
                <p className="text-2xl font-bold">{summaryMetrics.periodClients}</p>
                 <p className="text-purple-200 text-xs mt-1">{periodLabel}</p>
              </div>
              <Users className="w-8 h-8 text-purple-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">New Pets</p>
                <p className="text-2xl font-bold">{summaryMetrics.periodPets}</p>
                <p className="text-orange-200 text-xs mt-1">{periodLabel}</p>
              </div>
              <PawPrint className="w-8 h-8 text-orange-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
            <FinancialOverview
              invoices={dashboardData.invoices || []}
              dateRange={dateRange}
            />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClientPetMetrics
          clients={dashboardData.clients || []}
          pets={dashboardData.pets || []}
          dateRange={dateRange}
        />

        <AppointmentMetrics
          appointments={dashboardData.appointments || []}
          dateRange={dateRange}
        />
      </div>

      {/* Medical & Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MedicalMetrics
          medicalRecords={dashboardData.medicalRecords || []}
          vaccinations={dashboardData.vaccinations || []}
          diagnosticReports={dashboardData.diagnosticReports || []}
          dateRange={dateRange}
        />

        <InventoryAlerts
          products={dashboardData.products || []}
          batches={dashboardData.batches || []}
        />
      </div>

      {/* Operational Insights */}
      <OperationalInsights
        appointments={dashboardData.appointments || []}
        clients={dashboardData.clients || []}
        pets={dashboardData.pets || []}
      />
    </div>
  );
}