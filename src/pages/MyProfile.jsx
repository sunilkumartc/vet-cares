import React, { useState, useEffect } from "react";
import { TenantClient } from "@/api/tenant-entities";
import ClientProfileForm from "../components/customer/ClientProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";

export default function MyProfile() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClientData = async () => {
      try {
        const clientSessionData = localStorage.getItem('clientSession');
        if (clientSessionData) {
          const session = JSON.parse(clientSessionData);
          const clients = await TenantClient.filter({ id: session.id });
          if(clients.length > 0) {
              setClient(clients[0]);
          }
        }
      } catch (error) {
        console.error("Error loading client profile:", error);
      } finally {
        setLoading(false);
      }
    };
    loadClientData();
  }, []);

  const handleProfileUpdate = async (updatedData) => {
    if (!client) return;
    try {
      const updatedClient = await TenantClient.update(client.id, updatedData);
      
      const newSessionData = {
        ...JSON.parse(localStorage.getItem('clientSession')),
        full_name: `${updatedClient.first_name} ${updatedClient.last_name}`,
      };
      localStorage.setItem('clientSession', JSON.stringify(newSessionData));
      
      setClient(updatedClient);
      alert("Profile updated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  if (loading) {
    return (
        <div className="p-8">
            <Skeleton className="h-10 w-1/3 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-8" />
            <div className="space-y-6">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        </div>
    );
  }

  if (!client) {
    return (
        <div className="p-8 text-center text-red-600">
            Could not load your profile information. Please try logging in again.
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
        <Card className="border-0 shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                    <User className="w-6 h-6 text-blue-600"/>
                    My Profile
                </CardTitle>
                <p className="text-gray-600">Update your contact information and details.</p>
            </CardHeader>
            <CardContent>
                <ClientProfileForm client={client} onSubmit={handleProfileUpdate} />
            </CardContent>
        </Card>
    </div>
  );
}