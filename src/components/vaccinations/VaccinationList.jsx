import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PawPrint, User, Calendar, AlertTriangle, CheckCircle, Clock, Edit, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { sendWhatsAppReminder } from "@/api/functions";

export default function VaccinationList({ vaccinations, pets, clients, loading, onEdit, onDelete }) {
  const [sendingReminderId, setSendingReminderId] = useState(null);

  const getPetInfo = (petId) => pets.find(p => p.id === petId);
  const getClientInfo = (clientId) => clients.find(c => c.id === clientId);

  const getStatus = (dueDateStr) => {
    const now = new Date();
    const dueDate = new Date(dueDateStr);
    if (isBefore(dueDate, now)) return { label: "Overdue", color: "red", icon: AlertTriangle };
    if (isAfter(dueDate, now) && isBefore(dueDate, addDays(now, 30))) return { label: "Due Soon", color: "yellow", icon: Clock };
    return { label: "Up to Date", color: "green", icon: CheckCircle };
  };

  const handleSendReminder = async (vaccinationId) => {
    setSendingReminderId(vaccinationId);
    try {
        const { data } = await sendWhatsAppReminder({ vaccinationId });
        if (data.success) {
            alert('WhatsApp reminder sent successfully!');
        } else {
            throw new Error(data.error || 'Failed to send reminder');
        }
    } catch (error) {
        console.error('Error sending reminder:', error);
        alert(`Failed to send reminder: ${error.message}`);
    } finally {
        setSendingReminderId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vaccinations.map((vaccination) => {
        const pet = getPetInfo(vaccination.pet_id);
        const client = pet ? getClientInfo(pet.client_id) : null;
        const status = getStatus(vaccination.next_due_date);
        const isSending = sendingReminderId === vaccination.id;

        return (
          <Card key={vaccination.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${status.color}-100`}>
                    <status.icon className={`w-5 h-5 text-${status.color}-600`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{vaccination.vaccine_name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      {pet && <span className="flex items-center gap-1"><PawPrint className="w-4 h-4" />{pet.name}</span>}
                      {client && <span className="flex items-center gap-1"><User className="w-4 h-4" />{client.first_name} {client.last_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 md:pl-14">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due: <strong>{format(new Date(vaccination.next_due_date), "dd-MMM-yyyy")}</strong>
                  </span>
                  <Badge className={`bg-${status.color}-100 text-${status.color}-800`}>{status.label}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendReminder(vaccination.id)}
                    disabled={isSending}
                    className="gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                    {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <MessageSquare className="w-4 h-4" />
                    )}
                    <span>{isSending ? 'Sending...' : 'Remind'}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(vaccination)} className="gap-1">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(vaccination)} className="gap-1">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}