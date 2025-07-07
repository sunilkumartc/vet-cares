
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Phone, Mail, MapPin, Edit, PawPrint, Eye, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientList({ clients, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="grid gap-4">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
          <p className="text-gray-600">Start by adding your first client to the system.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {clients.map((client) => (
        <Card key={client.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {client.first_name} {client.last_name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {client.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {client.phone}
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {client.address}
                      </div>
                    )}
                  </div>
                  {client.emergency_contact && (
                    <div className="text-sm text-gray-600">
                      <strong>Emergency:</strong> {client.emergency_contact}
                    </div>
                  )}
                  {client.notes && (
                    <div className="text-sm text-gray-600 bg-gray-50 rounded p-2 max-w-lg">
                      {client.notes}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={createPageUrl(`ClientDetails?id=${client.id}`)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(client)}
                  className="gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(client)}
                  className="gap-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
