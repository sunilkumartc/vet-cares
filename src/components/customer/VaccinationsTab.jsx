import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isBefore, isAfter, addDays } from "date-fns";
import { Syringe, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function VaccinationsTab({ vaccinations }) {
  const getStatus = (dueDateStr) => {
    const now = new Date();
    const dueDate = new Date(dueDateStr);
    if (isBefore(dueDate, now)) return { label: "Overdue", color: "red", icon: AlertTriangle };
    if (isAfter(dueDate, now) && isBefore(dueDate, addDays(now, 30))) return { label: "Due Soon", color: "yellow", icon: Clock };
    return { label: "Up to Date", color: "green", icon: CheckCircle };
  };

  if (!vaccinations || vaccinations.length === 0) {
    return (
      <Card className="text-center py-12 bg-white/60 backdrop-blur-sm border-purple-100">
        <CardContent>
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Syringe className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No TenantVaccination Records Found</h3>
          <p className="text-gray-600">Your pet's vaccination history will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {vaccinations.map(vaccine => {
        const status = getStatus(vaccine.next_due_date);
        return (
          <Card key={vaccine.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{vaccine.vaccine_name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                     <p><strong>Administered:</strong> {format(new Date(vaccine.date_administered), "MMM d, yyyy")}</p>
                     <p><strong>Next Due:</strong> {format(new Date(vaccine.next_due_date), "MMM d, yyyy")}</p>
                  </div>
                </div>
                <Badge className={`bg-${status.color}-100 text-${status.color}-800`}>
                  <status.icon className={`w-3.5 h-3.5 mr-1.5`} />
                  {status.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}