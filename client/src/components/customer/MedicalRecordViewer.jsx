
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { FileText, Stethoscope, Pill, HeartPulse, X, Droplets, PawPrint, Thermometer, Wind, Calendar, Printer } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PrescriptionPrintView from '../medical-records/PrescriptionPrintView';
import { TenantManager } from '../../lib/tenant';

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

export default function MedicalRecordViewer({ record, onClose, pets = [], clients = [], staff = [] }) {
  const [showPrintModal, setShowPrintModal] = useState(false);
  if (!record) return null;

  // Find pet, client, doctor
  const pet = pets.find(p => (p.id || p._id) === (record.pet_id || record.pet?._id));
  const client = clients.find(c => (c.id || c._id) === (pet?.client_id || record.client_id));
  const doctor = staff.find(s => s.id === record.veterinarian_id || s.name === record.veterinarian || s.name === record.doctor_name);
  // Get tenant/clinic info
  const clinic = TenantManager.getCurrentTenant() || {};

  // Prepare data for print view
  const printPet = pet ? {
    name: pet.name,
    species: pet.species,
    type: pet.type,
    age: pet.birth_date ? getPreciseAge(pet.birth_date) : '',
    breed: pet.breed,
    gender: pet.gender
  } : {};
  const printOwner = client ? {
    name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
    phone: client.phone
  } : {};
  const printDoctor = doctor ? {
    name: doctor.name
  } : { name: record.veterinarian || record.doctor_name || '' };
  const printMedicalRecord = {
    caseNumber: record.case_number || record.id || '',
    date: record.visit_date ? format(new Date(record.visit_date), 'dd/MM/yyyy') : '',
    complaint: record.subjective || '',
    weight: record.vitals?.weight_kg ? `${record.vitals.weight_kg} Kgs` : '',
    temperature: record.vitals?.temperature_c ? `${(record.vitals.temperature_c * 9/5 + 32).toFixed(1)} F` : '',
    heartRate: record.vitals?.heart_rate_bpm ? `${record.vitals.heart_rate_bpm}/Min` : '',
    respiratoryRate: record.vitals?.respiratory_rate_rpm ? `${record.vitals.respiratory_rate_rpm}` : '',
    dehydration: record.dehydration || '',
    pulseRate: record.vitals?.heart_rate_bpm ? `${record.vitals.heart_rate_bpm}/Min` : '',
    observation: record.objective || '',
    examination: record.examination || '',
    diagnosticProcedure: record.diagnostic_procedure || '',
    diagnosis: record.assessment || '',
    treatmentList: record.medications ? record.medications.map(med => `${med.name} ${med.dosage || ''} ${med.frequency || ''} for ${med.duration || ''} ${med.notes ? ', ' + med.notes : ''}`) : [],
    advise: record.plan || ''
  };

  function getPreciseAge(birthDate) {
    if (!birthDate) return '';
    try {
      const now = new Date();
      const dob = new Date(birthDate);
      let years = now.getFullYear() - dob.getFullYear();
      let months = now.getMonth() - dob.getMonth();
      let days = now.getDate() - dob.getDate();
      if (days < 0) {
        months--;
        days += 30;
      }
      if (months < 0) {
        years--;
        months += 12;
      }
      let result = [];
      if (years > 0) result.push(`${years}y`);
      if (months > 0) result.push(`${months}m`);
      if (days > 0) result.push(`${days}d`);
      return result.join(' ');
    } catch {
      return '';
    }
  }

  return (
    <>
      <Dialog open={!!record} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">
              Medical Record - {record.visit_date ? format(new Date(record.visit_date), 'MMMM d, yyyy') : ''}
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
          <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Button variant="outline" onClick={onClose}>
                  <X className="w-4 h-4 mr-2" />Close
              </Button>
              <Button variant="default" onClick={() => setShowPrintModal(true)}>
                  <Printer className="w-4 h-4 mr-2" />Print Prescription
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Print Prescription Modal */}
      {showPrintModal && (
        <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
          <DialogContent className="max-w-2xl p-0">
            <PrescriptionPrintView
              clinic={clinic}
              owner={printOwner}
              pet={printPet}
              medicalRecord={printMedicalRecord}
              doctor={printDoctor}
            />
            <DialogFooter className="border-t pt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowPrintModal(false)}>
                <X className="w-4 h-4 mr-2" />Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
