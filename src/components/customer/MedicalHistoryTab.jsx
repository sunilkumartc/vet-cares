import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { FileText, Stethoscope, Pill, HeartPulse } from "lucide-react";

const VitalsDisplay = ({ vitals }) => {
    if(!vitals) return null;
    const convertToFahrenheit = (celsius) => celsius ? (celsius * 9/5 + 32).toFixed(1) : null;
    const vitalItems = [
        {label: "Weight", value: vitals.weight_kg, unit:"kg"},
        {label: "Temp", value: convertToFahrenheit(vitals.temperature_c), unit:"°F"},
        {label: "Heart Rate", value: vitals.heart_rate_bpm, unit:"bpm"},
        {label: "Resp. Rate", value: vitals.respiratory_rate_rpm, unit:"rpm"},
    ].filter(item => item.value);

    if (vitalItems.length === 0) return null;

    return (
        <div className="mt-4">
             <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2"><HeartPulse className="w-4 h-4 text-red-500" />Vitals</h4>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {vitalItems.map(item => (
                    <div key={item.label} className="bg-gray-100 rounded p-2 text-center">
                        <div className="font-semibold text-gray-900">{item.value} {item.unit}</div>
                        <div className="text-xs text-gray-600">{item.label}</div>
                    </div>
                ))}
             </div>
        </div>
    )
}

const RecordItem = ({ record }) => {
  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="text-lg text-gray-800">Visit on {format(new Date(record.visit_date), 'MMMM d, yyyy')}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Stethoscope className="w-5 h-5 text-blue-500" />Reason & Assessment</h4>
            <p className="text-gray-600 text-sm"><strong>Complaint:</strong> {record.subjective || 'N/A'}</p>
            <p className="text-gray-600 text-sm mt-1"><strong>Diagnosis:</strong> {record.assessment || 'N/A'}</p>
        </div>
        <VitalsDisplay vitals={record.vitals} />
         {record.medications && record.medications.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Pill className="w-5 h-5 text-green-500" />Medications Prescribed</h4>
              <ul className="pl-5 text-sm text-gray-600 list-disc space-y-1">
                {record.medications.map((med, i) => <li key={i}>{med.name} ({med.duration})</li>)}
              </ul>
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default function MedicalHistoryTab({ records }) {
  if (!records || records.length === 0) {
    return (
      <Card className="text-center py-12 bg-white/60 backdrop-blur-sm border-pink-100">
        <CardContent>
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-pink-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Medical History Found</h3>
          <p className="text-gray-600">Your pet's visit records will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {records.map(record => (
        <RecordItem key={record.id} record={record} />
      ))}
    </div>
  );
}