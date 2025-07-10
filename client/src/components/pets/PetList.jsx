
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PawPrint, User, Calendar, Weight, Edit, Heart, FileText, Plus, Trash2 } from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const speciesColors = {
  dog: "bg-blue-100 text-blue-800",
  cat: "bg-purple-100 text-purple-800",
  bird: "bg-yellow-100 text-yellow-800",
  rabbit: "bg-green-100 text-green-800",
  hamster: "bg-orange-100 text-orange-800",
  fish: "bg-cyan-100 text-cyan-800",
  reptile: "bg-emerald-100 text-emerald-800",
  other: "bg-gray-100 text-gray-800"
};

export default function PetList({ pets, clients, loading, onEdit, onDelete }) {
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Owner';
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-32 w-full rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <PawPrint className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pets Registered</h3>
          <p className="text-gray-600">Start by registering your first pet in the system.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {pets.map((pet) => (
        <Card key={pet.id} className="hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardContent className="p-0">
            {/* TenantPet Photo or Placeholder */}
            <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
              {pet.photo_url ? (
                <img 
                  src={pet.photo_url} 
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PawPrint className="w-16 h-16 text-blue-300" />
                </div>
              )}
              <div className="absolute top-3 right-3">
                <Badge className={`${speciesColors[pet.species]} capitalize`}>
                  {pet.species}
                </Badge>
              </div>
              {pet.pet_id && (
                <div className="absolute top-3 left-3">
                  <Badge variant="outline" className="bg-white/90 font-mono text-xs">
                    {pet.pet_id}
                  </Badge>
                </div>
              )}
            </div>

            {/* TenantPet Information */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{pet.name}</h3>
                  {pet.pet_id && (
                    <p className="text-sm text-gray-500 font-mono">ID: {pet.pet_id}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(pet)}
                    className="gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(pet)}
                    className="gap-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4 text-green-500" />
                  <span>{getClientName(pet.client_id)}</span>
                </div>

                {pet.breed && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>{pet.breed}</span>
                  </div>
                )}

                {pet.birth_date && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>{getAge(pet.birth_date)}</span>
                  </div>
                )}

                {pet.weight && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Weight className="w-4 h-4 text-orange-500" />
                    <span>{pet.weight} kg</span>
                  </div>
                )}
              </div>

              {(pet.color || pet.gender) && (
                <div className="flex flex-wrap gap-2">
                  {pet.color && (
                    <Badge variant="outline" className="text-xs">
                      {pet.color}
                    </Badge>
                  )}
                  {pet.gender && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {pet.gender}
                    </Badge>
                  )}
                </div>
              )}

              {pet.allergies && pet.allergies !== 'None known' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Allergies:</strong> {pet.allergies}
                  </p>
                </div>
              )}

              {pet.special_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 line-clamp-2">
                    <strong>Notes:</strong> {pet.special_notes}
                  </p>
                </div>
              )}

              {pet.microchip_id && (
                <div className="text-xs text-gray-500 font-mono bg-gray-50 rounded p-2">
                  Microchip: {pet.microchip_id}
                </div>
              )}

              {/* Medical Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Link to={createPageUrl(`PetMedicalHistory?pet=${pet.id}`)} className="w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex-1 gap-1 text-xs"
                  >
                    <FileText className="w-3 h-3" />
                    Medical History
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
