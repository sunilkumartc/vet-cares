
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Fixed syntax error: changed '=>' to 'from'
import { ChevronLeft, ChevronRight, Calendar, Clock, PawPrint, User } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const statusColors = {
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500", 
  in_progress: "bg-yellow-500",
  completed: "bg-gray-500",
  cancelled: "bg-red-500"
};

const AppointmentCalendar = ({ appointments, pets, clients }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDate = (date) => {
    if (!date) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.appointment_date === dateStr);
  };

  const getAppointmentDetails = (appointment) => {
    const pet = pets.find(p => p.id === appointment.pet_id);
    const client = clients.find(c => c.id === appointment.client_id);
    return { pet, client };
  };

  const selectedDateAppointments = getAppointmentsForDate(selectedDate);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Appointments Calendar
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-lg font-semibold min-w-[150px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map(day => {
            const dayAppointments = getAppointmentsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            
            return (
              <div
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  p-2 min-h-[80px] border rounded cursor-pointer transition-all hover:shadow-md
                  ${isSameMonth(day, currentDate) ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                  ${isTodayDate ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                  ${isSelected ? 'border-purple-500 bg-purple-50 shadow-md' : ''}
                `}
              >
                <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-blue-600' : ''}`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayAppointments.slice(0, 2).map((apt, idx) => {
                    const { pet } = getAppointmentDetails(apt);
                    return (
                      <div
                        key={idx}
                        className={`
                          text-xs px-1 py-0.5 rounded text-white truncate
                          ${statusColors[apt.status] || statusColors.scheduled}
                        `}
                        title={`${apt.appointment_time} - ${pet?.name || 'Unknown Pet Name'}`}
                      >
                        {apt.appointment_time} - {pet?.name || 'Pet Name'}
                      </div>
                    );
                  })}
                  {dayAppointments.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayAppointments.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Date Dialog */}
        <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Appointments for {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </DialogTitle>
              <DialogDescription>
                A list of all appointments scheduled for this day.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              {selectedDateAppointments.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No appointments scheduled for this date.</p>
              ) : (
                <div className="space-y-3 py-4">
                  {selectedDateAppointments.map(apt => {
                    const { pet, client } = getAppointmentDetails(apt);
                    return (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-4 w-full">
                           <div className="text-center w-20 flex-shrink-0">
                                <p className="font-bold text-xl text-gray-800">{apt.appointment_time.slice(0,5)}</p>
                                <Badge className={`mt-1 capitalize ${
                                    apt.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                    apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    apt.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                    apt.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                    apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                   {apt.status?.replace('_', ' ')}
                                </Badge>
                           </div>
                           <div className="border-l pl-4 flex-1">
                                <p className="font-semibold text-base flex items-center gap-2">
                                    <PawPrint className="w-4 h-4 text-blue-500" />
                                    <span>{pet?.name || 'Unknown Pet Name'}</span>
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                    <User className="w-4 h-4 text-green-500" />
                                    <span>{client ? `${client.first_name} ${client.last_name}` : 'Unknown Client Name'}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-2 italic">{apt.reason || apt.service_type}</p>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AppointmentCalendar;
