
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Syringe, Eye } from "lucide-react";
import MedicalRecordViewer from './MedicalRecordViewer';

const eventConfig = {
  appointment: {
    icon: Calendar,
    color: 'blue',
    title: 'TenantAppointment Scheduled'
  },
  medical: {
    icon: FileText,
    color: 'green',
    title: 'Medical Visit'
  },
  vaccination: {
    icon: Syringe,
    color: 'purple',
    title: 'TenantVaccination Administered'
  }
};

const TimelineItem = ({ event, pet, onViewRecord }) => {
  const { icon: Icon, color, title: defaultTitle } = eventConfig[event.type];
  const itemColor = {
    border: `border-${color}-500`,
    bg: `bg-${color}-50`,
    icon: `text-${color}-600`,
    iconBg: `bg-${color}-100`
  };

  const renderContent = () => {
    switch (event.type) {
      case 'appointment':
        return (
          <div>
            <p className="font-medium capitalize">{event.data.service_type.replace('_', ' ')}</p>
            {event.data.reason && <p className="text-sm text-gray-600">Reason: {event.data.reason}</p>}
            <div className="mt-2">
              <Badge className={`bg-${color}-100 text-${color}-800`}>
                Status: {event.data.status}
              </Badge>
            </div>
          </div>
        );
      case 'medical':
        return (
          <div>
            <p className="font-medium">Reason for Visit</p>
            <p className="text-sm text-gray-600 mb-3">{event.data.subjective}</p>
            <p className="font-medium">Diagnosis</p>
            <p className="text-sm text-gray-600 mb-3">{event.data.assessment}</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => onViewRecord(event.data)}>
              <Eye className="w-4 h-4" /> View Full Record
            </Button>
          </div>
        );
      case 'vaccination':
        return (
          <div>
            <p className="font-medium">{event.data.vaccine_name}</p>
            <p className="text-sm text-gray-600">
              Next due on: {format(new Date(event.data.next_due_date), 'MMM d, yyyy')}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-0 flex flex-col items-center h-full">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${itemColor.iconBg}`}>
          <Icon className={`w-5 h-5 ${itemColor.icon}`} />
        </div>
        <div className="w-px flex-1 bg-gray-200"></div>
      </div>
      <div className="ml-6 pb-8">
        <p className="text-sm text-gray-500 mb-1">
          {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
        </p>
        <Card className={`bg-white border-l-4 ${itemColor.border}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800">
              {defaultTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function PetTimeline({ history, pet }) {
  const [viewingRecord, setViewingRecord] = useState(null);

  if (!history || history.length === 0) {
    return (
      <Card className="text-center py-12 bg-white/60 backdrop-blur-sm border-pink-100">
        <CardContent>
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-pink-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No History Found</h3>
          <p className="text-gray-600">{pet.name}'s health records and appointments will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="relative">
        {history.map((event, index) => (
          <TimelineItem key={`${event.type}-${event.id}-${index}`} event={event} pet={pet} onViewRecord={setViewingRecord} />
        ))}
      </div>
      <MedicalRecordViewer record={viewingRecord} onClose={() => setViewingRecord(null)} />
    </>
  );
}
