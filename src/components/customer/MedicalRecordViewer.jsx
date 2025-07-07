
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { FileText, Stethoscope, Pill, HeartPulse, X, Droplets, PawPrint, Thermometer, Wind, Calendar } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const VitalsDisplay = ({ vitals }) => {
    if(!vitals) return null;
    const convertToFahrenheit = (celsius) => celsius ? (celsius * 9/5 + 32).toFixed(1) : null;
    
    const vitalItems = [
        {label: "Weight", value: vitals.weight_kg, unit:"kg", icon: PawPrint},
        {label: "Temp", value: convertToFahrenheit(vitals.temperature_c), unit:"°F", icon: Thermometer},
        {label: "Heart Rate", value: vitals.heart_rate_bpm, unit:"bpm", icon: HeartPulse},
        {label: "Resp. Rate", value: vitals.respiratory_rate_rpm, unit:"rpm", icon: Wind},
        {label: "Blood Pressure", value: vitals.blood_pressure, unit: "", icon: Droplets},
    ].filter(item => item.value);

    if (vitalItems.length === 0) return null;

    return (
        <div className="mt-4">
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {vitalItems.map(item => (
                    <div key={item.label} className="bg-gray-100 rounded p-3 text-center">
                        <item.icon className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                        <div className="font-semibold text-gray-900">{item.value} <span className="text-xs">{item.unit}</span></div>
                        <div className="text-xs text-gray-600">{item.label}</div>
                    </div>
                ))}
             </div>
        </div>
    );
};

const Section = ({ title, icon: Icon, children }) => (
    <div>
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-500" />
            {title}
        </h4>
        <div className="pl-7 text-gray-700 text-sm">
            {children}
        </div>
    </div>
);

export default function MedicalRecordViewer({ record, onClose }) {
  if (!record) return null;

  return (
    <Dialog open={!!record} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Medical Record - {format(new Date(record.visit_date), 'MMMM d, yyyy')}
          </DialogTitle>
          <DialogDescription>
            Detailed report of your pet's visit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-4 custom-scrollbar">
            <Section title="Reason for Visit (Subjective)" icon={Stethoscope}>
              <p>{record.subjective || 'No information provided.'}</p>
            </Section>

            <Separator />
            
            <Section title="Veterinarian's Findings (Objective)" icon={FileText}>
              <p>{record.objective || 'No information provided.'}</p>
              <VitalsDisplay vitals={record.vitals} />
            </Section>

            <Separator />
            
            <Section title="Diagnosis / Assessment" icon={HeartPulse}>
              <p>{record.assessment || 'No information provided.'}</p>
            </Section>
            
            <Separator />

            {record.medications && record.medications.length > 0 && (
                <>
                    <Section title="Medications Prescribed" icon={Pill}>
                        <ul className="space-y-2">
                            {record.medications.map((med, i) => (
                                <li key={i} className="p-3 bg-blue-50 rounded-lg">
                                    <p className="font-semibold">{med.name}</p>
                                    <p><strong>Instructions:</strong> {med.frequency} for {med.duration}</p>
                                    {med.notes && <p className="text-xs text-gray-600 mt-1"><strong>Notes:</strong> {med.notes}</p>}
                                </li>
                            ))}
                        </ul>
                    </Section>
                    <Separator />
                </>
            )}

            <Section title="Treatment Plan" icon={FileText}>
                <p>{record.plan || 'No specific plan provided.'}</p>
            </Section>
            
            {record.follow_up_date && (
                <>
                    <Separator />
                    <Section title="Follow-up" icon={Calendar}>
                        <p>A follow-up is recommended on or around <strong>{format(new Date(record.follow_up_date), 'MMMM d, yyyy')}</strong>.</p>
                    </Section>
                </>
            )}
        </div>
        <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
