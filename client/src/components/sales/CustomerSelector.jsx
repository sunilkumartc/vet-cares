import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, PawPrint, Search, Plus, Phone, Mail, MapPin, Calendar } from "lucide-react";
import { TenantClient, TenantPet } from "@/api/tenant-entities";
import { format } from "date-fns";

export default function CustomerSelector({ selectedCustomer, selectedPet, onCustomerSelect, onPetSelect }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [pets, setPets] = useState([]);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInData, setWalkInData] = useState({ name: "", phone: "", email: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchCustomers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (selectedCustomer && !selectedCustomer.isWalkIn) {
      loadCustomerPets();
      onPetSelect(null); // Reset pet selection when customer changes
    } else {
      setPets([]);
    }
  }, [selectedCustomer]);

  const searchCustomers = async () => {
    setLoading(true);
    try {
      const clients = await TenantClient.list();
      const filtered = clients.filter(client =>
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8);
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerPets = async () => {
    try {
      const allPets = await TenantPet.list();
      const customerPets = allPets.filter(pet => pet.client_id === selectedCustomer.id);
      setPets(customerPets);
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const handleCustomerSelect = (customer) => {
    onCustomerSelect(customer);
    setSearchTerm("");
    setSearchResults([]);
    setShowWalkIn(false);
  };

  const handleWalkInSale = () => {
    if (!walkInData.name.trim()) {
      alert('Please enter customer name for walk-in sale');
      return;
    }
    
    const walkInCustomer = {
      id: `walk-in-${Date.now()}`,
      first_name: walkInData.name.trim(),
      last_name: "",
      phone: walkInData.phone.trim(),
      email: walkInData.email.trim(),
      isWalkIn: true
    };
    
    onCustomerSelect(walkInCustomer);
    setShowWalkIn(false);
    setWalkInData({ name: "", phone: "", email: "" });
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Unknown';
    const today = new Date();
    const birth = new Date(birthDate);
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    
    if (years > 0) {
      return `${years}y ${months >= 0 ? months : 12 + months}m`;
    } else {
      return `${months >= 0 ? months : 12 + months}m`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Customer Selection
          {selectedCustomer && (
            <Badge variant="secondary" className="ml-auto">
              {selectedCustomer.isWalkIn ? 'Walk-in' : 'Registered'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedCustomer ? (
          <>
            {/* Customer Search */}
            <div className="relative">
              <Input
                placeholder="Search customer by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm text-gray-600 font-medium">Select Customer:</p>
                {searchResults.map(customer => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Walk-in Customer Option */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setShowWalkIn(!showWalkIn)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Walk-in Customer
              </Button>

              {showWalkIn && (
                <div className="mt-4 space-y-3 p-4 border rounded-lg bg-gray-50">
                  <div className="space-y-2">
                    <Input
                      placeholder="Customer Name *"
                      value={walkInData.name}
                      onChange={(e) => setWalkInData(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Phone Number"
                      value={walkInData.phone}
                      onChange={(e) => setWalkInData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                    <Input
                      placeholder="Email (Optional)"
                      value={walkInData.email}
                      onChange={(e) => setWalkInData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleWalkInSale} className="flex-1" size="sm">
                      Proceed with Walk-in
                    </Button>
                    <Button variant="outline" onClick={() => setShowWalkIn(false)} size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Selected Customer Display */
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="flex items-start justify-between p-4 bg-blue-50 rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <p className="font-semibold text-blue-900">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </p>
                  {selectedCustomer.isWalkIn && (
                    <Badge variant="secondary">Walk-in</Badge>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-blue-700">
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onCustomerSelect(null);
                  onPetSelect(null);
                  setPets([]);
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Change
              </Button>
            </div>

            {/* TenantPet Selection */}
            {!selectedCustomer.isWalkIn && pets.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <PawPrint className="w-4 h-4" />
                  Select Pet (Optional)
                </h4>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {pets.map(pet => (
                    <div
                      key={pet.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPet?.id === pet.id 
                          ? 'bg-green-50 border-green-300 text-green-900' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => onPetSelect(selectedPet?.id === pet.id ? null : pet)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <PawPrint className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-sm text-gray-600 capitalize">
                            {pet.species} • {pet.breed} • {calculateAge(pet.birth_date)}
                          </p>
                          {pet.weight && (
                            <p className="text-xs text-gray-500">{pet.weight}kg</p>
                          )}
                        </div>
                      </div>
                      {selectedPet?.id === pet.id && (
                        <Badge variant="default" className="bg-green-600">
                          Selected
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!selectedCustomer.isWalkIn && pets.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <PawPrint className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No pets registered for this customer</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}