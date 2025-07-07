import React, { useState, useEffect } from "react";
import { FileText, PawPrint, Calendar, Stethoscope, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, TenantClient, TenantPet, TenantMedicalRecord } from "@/api/tenant-entities";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function MedicalHistory() {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedicalData();
  }, []);

  const loadMedicalData = async () => {
    try {
      const user = await User.me();
      const clients = await TenantClient.list();
      const myClient = clients.find(c => c.email === user.email);

      if (myClient) {
        const myPets = await TenantPet.filter({ client_id: myClient.id });
        setPets(myPets);

        if (myPets.length > 0) {
          const petIds = myPets.map(p => p.id);
          const records = await TenantMedicalRecord.list();
          const myRecords = records
            .filter(r => petIds.includes(r.pet_id))
            .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
          setMedicalRecords(myRecords);
        }
      }
    } catch (error) {
      console.error("Failed to load medical history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPetInfo = (petId) => pets.find(p => p.id === petId);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-500" />
            Medical History
          </h1>
          <p className="text-gray-600 mt-1">A complete record of all visits and treatments for your pets.</p>
        </div>

        {medicalRecords.length === 0 ? (
          <Card className="text-center py-16 bg-white/80 backdrop-blur-sm">
            <CardContent>
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800">No Medical Records Found</h3>
              <p className="text-gray-600">Your pets' medical history will appear here after their visits.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {medicalRecords.map(record => {
              const pet = getPetInfo(record.pet_id);
              return (
                <Card key={record.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 mb-1">
                        <PawPrint className="w-5 h-5 text-blue-600" />
                        <span>{pet?.name}</span>
                      </CardTitle>
                      <span className="text-sm text-gray-600">{record.chief_complaint}</span>
                    </div>
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1.5" />
                      {format(new Date(record.visit_date), "dd MMM yyyy")}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {record.diagnosis && (
                       <div className="flex items-start gap-3">
                          <Stethoscope className="w-4 h-4 mt-1 text-gray-500"/>
                          <div>
                            <p className="font-semibold text-sm">Diagnosis</p>
                            <p className="text-gray-700 text-sm">{record.diagnosis}</p>
                          </div>
                       </div>
                    )}
                     {record.treatment && (
                       <div className="flex items-start gap-3">
                          <Pill className="w-4 h-4 mt-1 text-gray-500"/>
                          <div>
                            <p className="font-semibold text-sm">Treatment</p>
                            <p className="text-gray-700 text-sm">{record.treatment}</p>
                          </div>
                       </div>
                    )}
                    {record.notes && (
                      <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-600">
                          <strong>Notes from Dr. {record.veterinarian || 'Vet'}:</strong> {record.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}