import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { 
  ArrowLeft, 
  PawPrint, 
  Calendar, 
  FileText, 
  Heart, 
  Weight, 
  Thermometer,
  Activity,
  Pill,
  Stethoscope
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { TenantPet, TenantClient, TenantMedicalRecord, TenantVaccination } from '../api/tenant-entities';
import { createPageUrl } from '../utils';
import VitalTrendChart from '../components/vitals/VitalTrendChart';
import DateRangePicker from '../components/vitals/DateRangePicker';
import { subMonths, startOfDay, endOfDay } from 'date-fns';

export default function PetProfile() {
  const [searchParams] = useSearchParams();
  const petId = searchParams.get('id');
  
  const [pet, setPet] = useState(null);
  const [client, setClient] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subMonths(new Date(), 6)),
    to: endOfDay(new Date())
  });

  useEffect(() => {
    if (petId) {
      loadPetData();
    }
  }, [petId]);

  const loadPetData = async () => {
    try {
      const [petData, allRecords, allVaccinations] = await Promise.all([
        TenantPet.list(),
        TenantMedicalRecord.list(),
        TenantVaccination.list()
      ]);

      const currentPet = petData.find(p => p.id === petId);
      if (currentPet) {
        setPet(currentPet);
        
        // Get client data
        const allClients = await TenantClient.list();
        const petOwner = allClients.find(c => c.id === currentPet.client_id);
        setClient(petOwner);

        // Get medical records
        const petRecords = allRecords
          .filter(r => r.pet_id === petId)
          .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
        setMedicalRecords(petRecords);

        // Get vaccinations
        const petVaccinations = allVaccinations
          .filter(v => v.pet_id === petId)
          .sort((a, b) => new Date(b.date_administered) - new Date(a.date_administered));
        setVaccinations(petVaccinations);
      }
    } catch (error) {
      console.error('Error loading pet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAge = (birthDate) => {
    if (!birthDate) return 'Unknown age';
    
    const birth = new Date(birthDate);
    const years = differenceInYears(new Date(), birth);
    const months = differenceInMonths(new Date(), birth) % 12;
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''} old`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''} old`;
    } else {
      return `${years}y ${months}m old`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white rounded w-64"></div>
            <div className="h-48 bg-white rounded-2xl"></div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-64 bg-white rounded-2xl"></div>
              <div className="h-64 bg-white rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="text-center py-12">
              <PawPrint className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pet not found</h3>
              <p>The pet you are looking for does not exist.</p>
              <Link to={createPageUrl("Pets")}>
                <Button variant="outline" className="mt-4">Go Back</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Back Button */}
        <Link to={createPageUrl("Pets")}>
          <Button variant="outline" className="gap-2 mb-4 hover:bg-pink-50">
            <ArrowLeft className="w-4 h-4" />
            Back to Pets
          </Button>
        </Link>

        {/* Pet Profile Header */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-pink-400 to-purple-500 relative">
            {pet.photo_url && (
              <img 
                src={pet.photo_url} 
                alt={pet.name}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/20" />
          </div>
          
          <CardContent className="p-6 -mt-8 relative">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                {pet.photo_url ? (
                  <img 
                    src={pet.photo_url} 
                    alt={pet.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <PawPrint className="w-12 h-12 text-pink-400" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{pet.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-pink-100 text-pink-800 capitalize">
                        {pet.species} {pet.breed && `• ${pet.breed}`}
                      </Badge>
                      {pet.gender && (
                        <Badge variant="outline" className="capitalize">
                          {pet.gender}
                        </Badge>
                      )}
                    </div>
                    {pet.birth_date && (
                      <p className="text-gray-600 mt-1 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {getAge(pet.birth_date)}
                      </p>
                    )}
                  </div>
                  
                  {pet.pet_id && (
                    <div className="text-center bg-gray-100 rounded-lg p-3">
                      <div className="text-sm text-gray-500">Pet ID</div>
                      <div className="font-mono font-bold text-lg text-gray-900">{pet.pet_id}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="vitals" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vitals" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Vitals
            </TabsTrigger>
            <TabsTrigger value="medications" className="flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Medications
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Vitals Tab */}
          <TabsContent value="vitals" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Vital Trends</h2>
              <DateRangePicker 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VitalTrendChart
                metric="weight"
                unitLabel="kg"
                color="#3B82F6"
                petId={petId}
                title="Weight"
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg"
              />
              
              <VitalTrendChart
                metric="temp"
                unitLabel="°C"
                color="#EF4444"
                petId={petId}
                title="Temperature"
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg"
              />
              
              <VitalTrendChart
                metric="hr"
                unitLabel="bpm"
                color="#10B981"
                petId={petId}
                title="Heart Rate"
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg"
              />
              
              <VitalTrendChart
                metric="bp_sys"
                unitLabel="mmHg"
                color="#8B5CF6"
                petId={petId}
                title="Blood Pressure (Systolic)"
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg"
              />
            </div>
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="medications" className="mt-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-blue-500" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Pill className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No medications recorded yet.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  Clinical Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No clinical notes recorded yet.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6 space-y-6">
            {/* Recent Medical Records */}
            {medicalRecords.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-purple-500" />
                    Recent Medical Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {medicalRecords.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{record.diagnosis || 'General Checkup'}</div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(record.visit_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">
                        {record.status || 'Completed'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent Vaccinations */}
            {vaccinations.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-green-500" />
                    Recent Vaccinations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vaccinations.slice(0, 5).map((vaccination) => (
                    <div key={vaccination.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{vaccination.vaccine_name}</div>
                        <div className="text-sm text-gray-600">
                          Given on {format(new Date(vaccination.date_administered), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        {vaccination.vaccine_type?.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 