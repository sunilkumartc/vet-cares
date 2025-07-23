import React, { useState, useEffect } from "react";
import { FileText, PawPrint, Calendar, Stethoscope, Pill, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TenantClient, TenantPet, TenantMedicalRecord } from "@/api/tenant-entities";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import ClientAuthGuard from "@/components/ClientAuthGuard";
import ClientSessionManager from "@/lib/clientSession";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

export default function MedicalHistory() {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  // Follow-up modal state
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [activeRecordId, setActiveRecordId] = useState(null);
  const [followupDate, setFollowupDate] = useState("");
  const [followupNotes, setFollowupNotes] = useState("");

  useEffect(() => {
    loadMedicalData();
  }, []);

  const loadMedicalData = async () => {
    try {
      // Get authenticated client session
      const session = ClientSessionManager.getCurrentSession();
      if (!session || !session.authenticated) {
        throw new Error('Client not authenticated');
      }

      const clientId = ClientSessionManager.getClientId();
      // Load client-specific data
      const myPets = await TenantPet.filter({ client_id: clientId });
      setPets(myPets);
      if (myPets.length > 0) {
        const petIds = myPets.map(p => p.id);
        const records = await TenantMedicalRecord.list();
        const myRecords = records
          .filter(r => petIds.includes(r.pet_id))
          .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
        setMedicalRecords(myRecords);
      }
    } catch (error) {
      console.error("Failed to load medical history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPetInfo = (petId) => pets.find(p => p.id === petId);

  // --- Follow-up logic ---
  const openFollowupModal = (recordId) => {
    setActiveRecordId(recordId);
    setFollowupDate("");
    setFollowupNotes("");
    setShowFollowupModal(true);
  };
  const closeFollowupModal = () => {
    setShowFollowupModal(false);
    setActiveRecordId(null);
    setFollowupDate("");
    setFollowupNotes("");
  };
  const handleFollowupSubmit = (e) => {
    e.preventDefault();
    if (!followupDate) return;
    setMedicalRecords(prev => prev.map(r => {
      if (r.id === activeRecordId) {
        const followups = Array.isArray(r.followups) ? r.followups : [];
        return {
          ...r,
          followups: [
            ...followups,
            {
              id: `fu_${Date.now()}`,
              date: followupDate,
              notes: followupNotes,
            }
          ]
        };
      }
      return r;
    }));
    closeFollowupModal();
  };

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
    <ClientAuthGuard>
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
                    {/* Add Follow-up Button */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => openFollowupModal(record.id)}>
                        <PlusCircle className="w-4 h-4 mr-1" /> Add Follow-up
                      </Button>
                    </div>
                    {/* Show follow-ups if any */}
                    {Array.isArray(record.followups) && record.followups.length > 0 && (
                      <div className="pl-4 mt-2 border-l-2 border-blue-200 space-y-2">
                        {record.followups.map(fu => (
                          <div key={fu.id} className="bg-blue-50 rounded p-3">
                            <div className="flex items-center gap-2 text-blue-700 font-semibold">
                              <Calendar className="w-3 h-3" /> {format(new Date(fu.date), "dd MMM yyyy")}
                            </div>
                            <div className="text-sm text-gray-700 mt-1">{fu.notes}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Follow-up Modal */}
      <Dialog open={showFollowupModal} onOpenChange={setShowFollowupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFollowupSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Follow-up Date *</label>
              <CalendarPicker
                mode="single"
                selected={followupDate ? new Date(followupDate) : undefined}
                onSelect={date => setFollowupDate(date ? date.toISOString().split('T')[0] : "")}
                initialFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea value={followupNotes} onChange={e => setFollowupNotes(e.target.value)} rows={3} placeholder="Enter follow-up notes..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeFollowupModal}>Cancel</Button>
              <Button type="submit" disabled={!followupDate}>Save Follow-up</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </ClientAuthGuard>
  );
}