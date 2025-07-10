
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PawPrint, Edit, Cake, Weight, Hash, Siren, Info, Calendar } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { intervalToDuration } from 'date-fns';

const getPreciseAge = (birthDate) => {
  if (!birthDate) return 'Unknown age';
  try {
    const duration = intervalToDuration({ start: new Date(birthDate), end: new Date() });
    const parts = [];
    if (duration.years > 0) parts.push(`${duration.years}y`);
    if (duration.months > 0) parts.push(`${duration.months}m`);
    if (duration.days > 0 && duration.years === 0) parts.push(`${duration.days}d`);
    return parts.length > 0 ? parts.join(' ') : 'Newborn';
  } catch (e) {
    return 'Invalid date';
  }
};

export default function PetDetailsCard({ pet, onEdit, onBookAppointment }) {
  const age = getPreciseAge(pet.birth_date);

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/3 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
          <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-lg">
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <PawPrint className="w-16 h-16 text-gray-400" />
            )}
          </div>
        </div>

        <div className="md:w-2/3 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{pet.name}</h2>
              <p className="text-gray-600 capitalize">{pet.breed || 'Unknown Breed'}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onEdit(pet)} className="flex-shrink-0">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button onClick={() => onBookAppointment(pet)} className="flex-shrink-0 bg-pink-500 hover:bg-pink-600 text-white">
                <Calendar className="w-4 h-4 mr-2" />
                Book TenantAppointment
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-500" />
              <div>
                <p className="font-semibold">Age</p>
                <p className="text-gray-600">{age}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-semibold">Gender</p>
                <p className="text-gray-600 capitalize">{pet.gender || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Weight className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-semibold">Weight</p>
                <p className="text-gray-600">{pet.weight ? `${pet.weight} kg` : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-semibold">Microchip</p>
                <p className="text-gray-600">{pet.microchip_id || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          {(pet.allergies || pet.special_notes) && (
            <div className="mt-6 space-y-3">
              {pet.allergies && (
                <div className="flex items-start gap-2 text-sm">
                  <Siren className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-700">Allergies</p>
                    <p className="text-gray-600">{pet.allergies}</p>
                  </div>
                </div>
              )}
              {pet.special_notes && (
                <div className="flex items-start gap-2 text-sm">
                  <Info className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-indigo-700">Special Notes</p>
                    <p className="text-gray-600">{pet.special_notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
