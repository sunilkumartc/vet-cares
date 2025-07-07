import React, { useState, useEffect } from "react";
import { CreditCard, PawPrint, Calendar, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, TenantClient, TenantPet, TenantInvoice } from "@/api/tenant-entities";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  paid: "bg-green-100 text-green-800",
  sent: "bg-blue-100 text-blue-800",
  overdue: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-800",
  cancelled: "bg-orange-100 text-orange-800"
};

export default function MyInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoiceData();
  }, []);

  const loadInvoiceData = async () => {
    try {
      // Check for client session first
      const clientSessionData = localStorage.getItem('clientSession');
      let myClient = null;

      if (clientSessionData) {
        myClient = JSON.parse(clientSessionData);
      } else {
        // Fallback to user authentication
        const user = await User.me();
        const clients = await TenantClient.list();
        myClient = clients.find(c => c.email === user.email);
      }

      if (myClient) {
        const myPets = await TenantPet.filter({ client_id: myClient.id });
        setPets(myPets);
        
        const allInvoices = await TenantInvoice.filter({ client_id: myClient.id });
        setInvoices(allInvoices.sort((a,b) => new Date(b.invoice_date) - new Date(a.invoice_date)));
      }
    } catch (error) {
      console.error("Failed to load invoice data:", error);
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
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-yellow-500" />
            Billing & Invoices
          </h1>
          <p className="text-gray-600 mt-1">Your payment history with {window?.portalName || 'the portal'}.</p>
        </div>

        {invoices.length === 0 ? (
          <Card className="text-center py-16 bg-white/80 backdrop-blur-sm">
            <CardContent>
              <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800">No Invoices Found</h3>
              <p className="text-gray-600">Your invoices will appear here after services are rendered.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {invoices.map(invoice => {
                  const pet = getPetInfo(invoice.pet_id);
                  return (
                    <div key={invoice.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-lg text-gray-800">TenantInvoice #{invoice.invoice_number}</p>
                          <p className="text-gray-600 text-sm">
                            For {pet?.name || 'General Services'} on {format(new Date(invoice.invoice_date), "dd-MM-yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                           <p className="text-xl font-bold text-gray-900">₹{invoice.total_amount.toFixed(2)}</p>
                           <Badge className={statusColors[invoice.status] || statusColors.draft}>{invoice.status}</Badge>
                           <Link to={createPageUrl(`InvoiceDetails?id=${invoice.id}`)}>
                             <Button variant="outline" size="sm">
                               <FileText className="w-4 h-4 mr-2" />
                               View
                             </Button>
                           </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}