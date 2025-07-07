import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Syringe, AlertTriangle } from "lucide-react";
import { format, isAfter, isBefore, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export default function VaccinationSchedule({ vaccinations, pets, clients, loading }) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const getUpcomingVaccinations = () => {
    return vaccinations
      .filter(v => {
        const dueDate = new Date(v.next_due_date);
        return isAfter(dueDate, now) && isBefore(dueDate, addDays(now, 60));
      })
      .sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date));
  };

  const getOverdueVaccinations = () => {
    return vaccinations
      .filter(v => isBefore(new Date(v.next_due_date), now))
      .sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date));
  };

  const getPetInfo = (petId) => pets.find(p => p.id === petId);
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Owner';
  };

  const upcomingVaccinations = getUpcomingVaccinations();
  const overdueVaccinations = getOverdueVaccinations();

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Overdue Vaccinations ({overdueVaccinations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueVaccinations.length === 0 ? (
            <p className="text-gray-600">No overdue vaccinations - great job!</p>
          ) : (
            <div className="space-y-3">
              {overdueVaccinations.map((vaccination) => {
                const pet = getPetInfo(vaccination.pet_id);
                const clientName = pet ? getClientName(pet.client_id) : 'Unknown Owner';
                const daysPastDue = Math.floor((now - new Date(vaccination.next_due_date)) / (1000 * 60 * 60 * 24));

                return (
                  <div key={vaccination.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {pet?.name} - {vaccination.vaccine_name}
                      </h4>
                      <p className="text-sm text-gray-600">{clientName}</p>
                      <p className="text-sm text-red-600">
                        Due: {format(new Date(vaccination.next_due_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {daysPastDue} days overdue
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <Calendar className="w-5 h-5" />
            Due This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingVaccinations.filter(v => {
            const dueDate = new Date(v.next_due_date);
            return dueDate >= monthStart && dueDate <= monthEnd;
          }).length === 0 ? (
            <p className="text-gray-600">No vaccinations due this month.</p>
          ) : (
            <div className="space-y-3">
              {upcomingVaccinations
                .filter(v => {
                  const dueDate = new Date(v.next_due_date);
                  return dueDate >= monthStart && dueDate <= monthEnd;
                })
                .map((vaccination) => {
                  const pet = getPetInfo(vaccination.pet_id);
                  const clientName = pet ? getClientName(pet.client_id) : 'Unknown Owner';

                  return (
                    <div key={vaccination.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {pet?.name} - {vaccination.vaccine_name}
                        </h4>
                        <p className="text-sm text-gray-600">{clientName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(vaccination.next_due_date), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <Syringe className="w-5 h-5" />
            Upcoming (Next 2 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingVaccinations.filter(v => {
            const dueDate = new Date(v.next_due_date);
            return dueDate > monthEnd;
          }).length === 0 ? (
            <p className="text-gray-600">No upcoming vaccinations scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcomingVaccinations
                .filter(v => {
                  const dueDate = new Date(v.next_due_date);
                  return dueDate > monthEnd;
                })
                .slice(0, 5)
                .map((vaccination) => {
                  const pet = getPetInfo(vaccination.pet_id);
                  const clientName = pet ? getClientName(pet.client_id) : 'Unknown Owner';

                  return (
                    <div key={vaccination.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {pet?.name} - {vaccination.vaccine_name}
                        </h4>
                        <p className="text-sm text-gray-600">{clientName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(vaccination.next_due_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}