
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Syringe, AlertTriangle, ChevronRight } from "lucide-react";
import { format, isAfter } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UpcomingVaccinations({ vaccinations, pets, clients, loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="w-5 h-5 text-green-600" />
            Upcoming Vaccinations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Syringe className="w-5 h-5 text-green-600" />
          Upcoming Vaccinations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {vaccinations.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Syringe className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No upcoming vaccinations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vaccinations.map((vaccination) => {
              const pet = pets.find(p => p.id === vaccination.pet_id);
              const client = pet ? clients.find(c => c.id === pet.client_id) : null;
              const dueDate = new Date(vaccination.next_due_date);
              const isOverdue = isAfter(new Date(), dueDate);
              
              return (
                <Link
                  key={vaccination.id}
                  to={createPageUrl('ClientManagement', { clientId: client?.id })}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isOverdue ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {isOverdue ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Syringe className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{client ? `${client.first_name} ${client.last_name}` : 'Unknown Client'}</p>
                    <p className="text-xs text-gray-600 truncate">
                      <span className="font-medium">{pet?.name || 'Unknown Pet'}</span> - {vaccination.vaccine_name}
                    </p>
                    <p className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      Due: {format(dueDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
