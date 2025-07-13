import React from "react";
import PrescriptionPrintView from "../components/medical-records/PrescriptionPrintView";

const sampleClinic = {
  name: "Pet Planet Hospital, Bangalore",
  address: "123 Main Road, Bangalore",
  phone: "9876543210",
  place: "Bangalore"
};

const sampleOwner = {
  name: "Shiva",
  phone: "100"
};

const samplePet = {
  name: "Kitty",
  species: "Canine",
  type: "Dog",
  age: "5 Months",
  breed: "Golden Retriever",
  gender: "Male"
};

const sampleMedicalRecord = {
  caseNumber: "0024",
  date: "20/01/2025",
  complaint: "Wound on the left leg",
  weight: "3 Kgs",
  temperature: "101 F",
  heartRate: "57/Min",
  respiratoryRate: "7 Kgs",
  dehydration: "Dehydration",
  pulseRate: "57/Min",
  observation: "Alert, Active, Pain on palpation of abdomen, WOUND ON THE LEFT LEG",
  examination: "OMM: Pale, CRT: 5 Seconds, CMM: Pale, PLN: Enlarged",
  diagnosticProcedure: "CBC, USG, SB, Radiography",
  diagnosis: "Anal Fistula",
  treatmentList: [
    "Tablet ZEDOX 200 mg Oral Route (1-0-1) for 20 days, Tablets After Food",
    "Tablet Clindamycin 300 mg Oral Route (1-0-1) for 5 days, Tablets After Food",
    "Tablet Metronidazole 400 mg Oral Route (1-0-1) for 10 days, Tablets After Food",
    "Spray Mycosan 200 ml External Apply (1-0-1) for 10 days, Bottle",
    "Shampoo Kezopet 200 ml Bathing Weekly Twice, 3 Months"
  ],
  advise: "Review after 10 days along with the Pet for blood test. Advised Deworming & Vaccination Scheduled for Dogs and Cats."
};

const sampleDoctor = {
  name: "Sagar R. S."
};

export default function PrescriptionPrintPreview() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <h1 className="text-center text-2xl font-bold mb-6">Prescription Print Preview</h1>
      <PrescriptionPrintView
        clinic={sampleClinic}
        owner={sampleOwner}
        pet={samplePet}
        medicalRecord={sampleMedicalRecord}
        doctor={sampleDoctor}
      />
    </div>
  );
} 