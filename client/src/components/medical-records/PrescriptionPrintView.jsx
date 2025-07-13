import React, { forwardRef, useRef } from "react";

const PrescriptionPrintView = forwardRef(({ clinic, owner, pet, medicalRecord, doctor }, ref) => {
  const pdfRef = useRef();

  const handleDownloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = pdfRef.current;
    html2pdf()
      .from(element)
      .set({
        margin: 0.5,
        filename: `Prescription-${pet?.name || 'pet'}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      })
      .save();
  };

  // Helper for safe field access
  const safe = (val) => val || "-";
  return (
    <div>
      <div ref={pdfRef} className="bg-white text-black p-6 w-full max-w-2xl mx-auto print:p-0 print:w-full print:max-w-full">
        <style>{`
          @media print {
            .presc-table, .presc-table th, .presc-table td {
              border: 2px solid #000 !important;
            }
          }
          .presc-table, .presc-table th, .presc-table td {
            border: 2px solid #000;
          }
          .presc-table th, .presc-label {
            font-weight: bold;
          }
        `}</style>
        <div className="flex flex-col items-center mb-4">
          {clinic?.logo && (
            <img src={clinic.logo} alt="Clinic Logo" className="h-16 mb-2 object-contain" style={{ maxWidth: '120px' }} />
          )}
          <h2 className="text-2xl font-bold mb-1">{safe(clinic?.name)}</h2>
          <div className="text-sm">{safe(clinic?.address)}</div>
          <div className="text-sm">{safe(clinic?.phone)}</div>
        </div>
        <table className="presc-table w-full text-xs mb-2" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td className="p-1 presc-label">Case No</td>
              <td className="p-1">{safe(medicalRecord?.caseNumber)}</td>
              <td className="p-1 presc-label">Date</td>
              <td className="p-1">{safe(medicalRecord?.date)}</td>
            </tr>
            <tr>
              <td className="p-1 presc-label">Owner's Name</td>
              <td className="p-1">{safe(owner?.name)}</td>
              <td className="p-1 presc-label">Mobile</td>
              <td className="p-1">{safe(owner?.phone)}</td>
            </tr>
            <tr>
              <td className="p-1 presc-label">Pet's Name</td>
              <td className="p-1">{safe(pet?.name)}</td>
              <td className="p-1 presc-label">Family</td>
              <td className="p-1">{safe(pet?.species)}</td>
            </tr>
            <tr>
              <td className="p-1 presc-label">Pet Animal</td>
              <td className="p-1">{safe(pet?.type)}</td>
              <td className="p-1 presc-label">Age</td>
              <td className="p-1">{safe(pet?.age)}</td>
            </tr>
            <tr>
              <td className="p-1 presc-label">Breed</td>
              <td className="p-1">{safe(pet?.breed)}</td>
              <td className="p-1 presc-label">Gender</td>
              <td className="p-1">{safe(pet?.gender)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mb-2">
          <span className="presc-label">Owner's Complaint:</span> {safe(medicalRecord?.complaint)}
        </div>
        <table className="presc-table w-full text-xs mb-2" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td className="p-1 presc-label">Body Weight</td>
              <td className="p-1">{safe(medicalRecord?.weight)}</td>
              <td className="p-1 presc-label">Temperature</td>
              <td className="p-1">{safe(medicalRecord?.temperature)}</td>
              <td className="p-1 presc-label">Heart Rate</td>
              <td className="p-1">{safe(medicalRecord?.heartRate)}</td>
            </tr>
            <tr>
              <td className="p-1 presc-label">Respiratory Rate</td>
              <td className="p-1">{safe(medicalRecord?.respiratoryRate)}</td>
              <td className="p-1 presc-label">Dehydration</td>
              <td className="p-1">{safe(medicalRecord?.dehydration)}</td>
              <td className="p-1 presc-label">Pulse Rate</td>
              <td className="p-1">{safe(medicalRecord?.pulseRate)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mb-2">
          <span className="presc-label">Clinical Observation:</span> {safe(medicalRecord?.observation)}
        </div>
        <div className="mb-2">
          <span className="presc-label">Clinical Examination:</span> {safe(medicalRecord?.examination)}
        </div>
        <div className="mb-2">
          <span className="presc-label">Diagnostic Procedure:</span> {safe(medicalRecord?.diagnosticProcedure)}
        </div>
        <div className="mb-2">
          <span className="presc-label">Tentative Diagnosis:</span> {safe(medicalRecord?.diagnosis)}
        </div>
        <div className="mb-2">
          <span className="presc-label">Treatment:</span>
          <ul className="list-disc ml-6">
            {(medicalRecord?.treatmentList || []).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="mb-2">
          <span className="presc-label">Advise:</span> {safe(medicalRecord?.advise)}
        </div>
        <div className="flex justify-between items-end mt-8">
          <div className="text-xs">
            <div>Date: {safe(medicalRecord?.date)}</div>
            <div>Place: {safe(clinic?.place)}</div>
          </div>
          <div className="text-xs text-right">
            <div>Dr. {safe(doctor?.name)}</div>
            <div>Signature</div>
          </div>
        </div>
        <div className="text-center text-xs mt-4">*Thank you for Choosing {safe(clinic?.name)}*</div>
      </div>
      <div className="flex justify-center mt-4 print:hidden gap-2">
        <button
          onClick={handleDownloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Download PDF
        </button>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Print Prescription
        </button>
      </div>
    </div>
  );
});

export default PrescriptionPrintView; 