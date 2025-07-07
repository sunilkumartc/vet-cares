
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, PawPrint, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800"
};

export default function RecentAppointments({ appointments, pets, clients, loading, onViewAllClick }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Recent Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show only first 3 appointments
  const displayAppointments = appointments.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Recent Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No recent appointments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAppointments.map((appointment) => {
              const pet = pets.find(p => p.id === appointment.pet_id);
              const client = clients.find(c => c.id === appointment.client_id);
              
              return (
                <Link
                  key={appointment.id}
                  to={createPageUrl(`ClientManagement?clientId=${client?.id}`)}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <PawPrint className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-800 truncate">
                        {client ? `${client.first_name} ${client.last_name}` : 'Unknown TenantClient'}
                      </h4>
                      <Badge className={statusColors[appointment.status] || statusColors.scheduled}>
                        {appointment.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      <span className="font-medium">{pet?.name || 'Unknown TenantPet'}</span> - {appointment.reason || appointment.service_type}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {appointment.appointment_time}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
      {appointments.length > 3 && (
        <CardFooter className="flex justify-center py-3">
          <Button variant="link" onClick={onViewAllClick} className="text-blue-600">
            More appointments
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
