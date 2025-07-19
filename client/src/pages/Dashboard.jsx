import React, { useState, useEffect } from "react";
import { Calendar, Users, PawPrint, DollarSign, TrendingUp, Plus, Syringe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isAfter, subDays, addDays, isWithinInterval } from "date-fns";
import { TenantAppointment, TenantClient, TenantPet, TenantInvoice, TenantVaccination } from "@/api/tenant-entities";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import StatsCard from "../components/dashboard/StatsCard";
import RecentAppointments from "../components/dashboard/RecentAppointments";
import UpcomingVaccinations from "../components/dashboard/UpcomingVaccinations";
import AppointmentCalendar from "../components/dashboard/AppointmentCalendar";
import VideoConsultation from '../components/appointments/VideoConsultation';
import ClientSessionManager from '../lib/clientSession';

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalClients: 0,
    totalPets: 0,
    monthlyRevenue: 0,
    overdueVaccinations: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [upcomingVaccinations, setUpcomingVaccinations] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allPets, setAllPets] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [appointments, clients, pets, invoices, allVaccinations] = await Promise.all([
        TenantAppointment.list('-appointment_date', 200),
        TenantClient.list('-created_date', 1000),
        TenantPet.list('-created_date', 1000),
        TenantInvoice.list('-created_date', 100),
        TenantVaccination.list('next_due_date', 200)
      ]);

      const today = new Date();
      const twoDaysAgo = subDays(today, 2);
      const sixDaysFromNow = addDays(today, 6);

      const todayStr = format(today, 'yyyy-MM-dd');
      const todayAppointments = appointments.filter(apt => apt.appointment_date === todayStr);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const monthlyRevenue = invoices
        .filter(inv => inv.status === 'paid' && new Date(inv.payment_date) > oneMonthAgo)
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      const recentApts = appointments.filter(apt =>
        isWithinInterval(new Date(apt.appointment_date), { start: twoDaysAgo, end: today })
      );

      const upcomingVaccs = allVaccinations.filter(v =>
        isWithinInterval(new Date(v.next_due_date), { start: today, end: sixDaysFromNow })
      );

      const overdueVaccs = allVaccinations.filter(v =>
        new Date(v.next_due_date) < today && !isAfter(today, addDays(new Date(v.next_due_date), 365))
      );

      setStats({
        todayAppointments: todayAppointments.length,
        totalClients: clients.length,
        totalPets: pets.length,
        monthlyRevenue: monthlyRevenue,
        overdueVaccinations: overdueVaccs.length,
      });

      setAllClients(clients);
      setAllPets(pets);
      setAllAppointments(appointments);
      setRecentAppointments(recentApts);
      setUpcomingVaccinations(upcomingVaccs);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get current session info
  const session = ClientSessionManager.getCurrentSession();
  const tenant_id = session?.tenant_id || ClientSessionManager.getTenantId();
  const staff_id = session?.staff_id || session?.id || ClientSessionManager.getStaffId();
  const user_name = session?.full_name || session?.first_name || session?.email;

  return (
    <div className="p-4 md:p-8 space-y-8">
      
      <Dialog open={showCalendarModal} onOpenChange={setShowCalendarModal}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] p-0">
          <AppointmentCalendar
            appointments={allAppointments}
            pets={allPets}
            clients={allClients}
          />
        </DialogContent>
      </Dialog>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening at your clinic today.</p>
        </div>
        <div className="flex gap-3">
            <Link to={createPageUrl("Appointments")}>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus className="w-4 h-4" />
                New Appointment
              </Button>
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon={Calendar}
          color="blue"
          loading={loading}
        />
        <StatsCard
          title="Total Clients"
          value={stats.totalClients}
          icon={Users}
          color="green"
          loading={loading}
        />
        <StatsCard
          title="Registered Pets"
          value={stats.totalPets}
          icon={PawPrint}
          color="purple"
          loading={loading}
        />
        <StatsCard
          title="Monthly Revenue"
          value={`₹${stats.monthlyRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="orange"
          loading={loading}
        />
        <StatsCard
          title="Overdue Vaccinations"
          value={stats.overdueVaccinations}
          icon={Syringe}
          color="red"
          loading={loading}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentAppointments
            appointments={recentAppointments}
            pets={allPets}
            clients={allClients}
            loading={loading}
            onViewAllClick={() => setShowCalendarModal(true)}
          />
          
        </div>
        <div>
          <UpcomingVaccinations
            vaccinations={upcomingVaccinations}
            pets={allPets}
            clients={allClients}
            loading={loading}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to={createPageUrl("Clients")}>
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                <Users className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Add New Client</div>
                  <div className="text-sm text-gray-500">Register a new pet owner</div>
                </div>
              </Button>
            </Link>
            <Link to={createPageUrl("Pets")}>
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                <PawPrint className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Register Pet</div>
                  <div className="text-sm text-gray-500">Add a new pet profile</div>
                </div>
              </Button>
            </Link>
            <Link to={createPageUrl("Billing")}>
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                <DollarSign className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Create Invoice</div>
                  <div className="text-sm text-gray-500">Generate a new bill</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Online Consultation Dashboard */}
      <VideoConsultation tenantId={tenant_id} staffId={staff_id} />
    </div>
  );
}
