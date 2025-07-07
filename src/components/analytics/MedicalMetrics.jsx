
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Syringe, Activity } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";

export default function MedicalMetrics({ medicalRecords, vaccinations, diagnosticReports, dateRange }) {
  const calculateMetrics = () => {
    const today = new Date();
    // Use dateRange from props, fallback to today if not provided
    const startDate = dateRange?.from || startOfDay(today);
    const endDate = dateRange?.to || endOfDay(today);

    // Medical Records
    const periodRecords = medicalRecords.filter(record =>
      isWithinInterval(parseISO(record.visit_date), { start: startDate, end: endDate })
    ).length;

    // Vaccinations
    const periodVaccinations = vaccinations.filter(vacc =>
      isWithinInterval(parseISO(vacc.date_administered), { start: startDate, end: endDate })
    ).length;

    const dueVaccinations = vaccinations.filter(vacc => {
      const dueDate = parseISO(vacc.next_due_date);
      return isWithinInterval(dueDate, { start: startDate, end: endDate });
    }).length;

    // Diagnostic Reports
    const periodReports = diagnosticReports.filter(report =>
      isWithinInterval(parseISO(report.report_date), { start: startDate, end: endDate })
    ).length;

    // Common diagnoses (from assessment field)
    const diagnoses = {};
    medicalRecords.forEach(record => {
      if (record.assessment) {
        const assessment = record.assessment.toLowerCase();
        // Simple keyword extraction
        const keywords = ['infection', 'injury', 'vaccination', 'checkup', 'dental', 'skin', 'digestive'];
        keywords.forEach(keyword => {
          if (assessment.includes(keyword)) {
            diagnoses[keyword] = (diagnoses[keyword] || 0) + 1;
          }
        });
      }
    });

    const commonDiagnoses = Object.entries(diagnoses)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([diagnosis, count]) => ({
        diagnosis: diagnosis.charAt(0).toUpperCase() + diagnosis.slice(1),
        count
      }));

    return {
      periodRecords,
      periodVaccinations,
      dueVaccinations,
      periodReports,
      commonDiagnoses
    };
  };

  const metrics = calculateMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          Medical & Lab Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Activity in Period */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <FileText className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-green-600">Records in Period</p>
            <p className="text-xl font-bold text-green-700">{metrics.periodRecords}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Syringe className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-blue-600">Vaccinations</p>
            <p className="text-xl font-bold text-blue-700">{metrics.periodVaccinations}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <FileText className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-purple-600">Lab Reports</p>
            <p className="text-xl font-bold text-purple-700">{metrics.periodReports}</p>
          </div>
        </div>

        {/* TenantVaccination Alerts */}
        {metrics.dueVaccinations > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Syringe className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {metrics.dueVaccinations} vaccination(s) due in period
              </span>
            </div>
          </div>
        )}

        {/* Common Diagnoses */}
        {metrics.commonDiagnoses.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Most Common Diagnoses</h4>
            <div className="space-y-2">
              {metrics.commonDiagnoses.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.diagnosis}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(item.count / Math.max(...metrics.commonDiagnoses.map(d => d.count))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-800 w-6">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
