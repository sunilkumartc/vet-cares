import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, PawPrint, User, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800"
};

export default function AppointmentList({ appointments, pets, clients, loading, onEdit, onDelete, isReadOnly = false }) {
  const getPetName = (petId) => pets.find(p => p.id === petId)?.name || 'Unknown Pet';
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-48" />
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

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments Found</h3>
          <p className="text-gray-600">
            {isReadOnly ? 'No appointments available to view.' : 'Schedule a new appointment to get started.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((apt) => (
        <Card key={apt.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {apt.reason || apt.service_type?.replace('_', ' ')}
                  </h3>
                  <Badge className={`${statusColors[apt.status] || statusColors.scheduled} capitalize`}>
                    {apt.status?.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <PawPrint className="w-4 h-4 text-blue-500" />
                    <span>{getPetName(apt.pet_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-green-500" />
                    <span>{getClientName(apt.client_id)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>{format(new Date(apt.appointment_date), 'dd-MM-yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>{apt.appointment_time} ({apt.duration_minutes} min)</span>
                  </div>
                </div>
                {apt.notes && (
                   <p className="text-sm text-gray-500 pt-2 italic">Notes: {apt.notes}</p>
                )}
              </div>
              {!isReadOnly && (
                <div className="mt-4 md:mt-0 md:ml-6 flex items-center gap-2">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(apt)}
                      className="gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(apt)}
                      className="gap-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
