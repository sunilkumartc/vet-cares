
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TenantInvoice, TenantClient, TenantPet } from '@/api/tenant-entities';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer, Download, Share2, Heart, Mail, Phone, PawPrint, Building, User as UserIcon } from "lucide-react";
import { format } from 'date-fns';

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-orange-100 text-orange-800"
};

export default function InvoiceDetails() {
  const [invoice, setInvoice] = useState(null);
  const [client, setClient] = useState(null);
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    // Check if a staff session exists in localStorage to determine user role
    const staffSessionData = localStorage.getItem('staffSession');
    if (staffSessionData) {
      setIsStaff(true);
    }

    const loadInvoiceDetails = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const invoiceData = await TenantInvoice.get(id);
        if (invoiceData) {
          setInvoice(invoiceData);
          // Fetch client and pet details concurrently
          const [clientData, petData] = await Promise.all([
            invoiceData.client_id ? TenantClient.get(invoiceData.client_id) : Promise.resolve(null),
            invoiceData.pet_id ? TenantPet.get(invoiceData.pet_id) : Promise.resolve(null)
          ]);
          setClient(clientData);
          setPet(petData);
        }
      } catch (error) {
        console.error("Failed to load invoice details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceDetails();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">TenantInvoice not found</h2>
        <p>The invoice you are looking for does not exist.</p>
        <Link to={createPageUrl(isStaff ? "Billing" : "MyInvoices")}>
          <Button variant="outline" className="mt-4">Go Back</Button>
        </Link>
      </div>
    );
  }
  
  // Determine the correct back URL based on user role
  const backUrl = createPageUrl(isStaff ? 'Billing' : 'MyInvoices');

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link to={backUrl}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Billing
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print / PDF
            </Button>
          </div>
        </div>

        <Card className="border-t-4 border-blue-600 shadow-lg print:shadow-none print:border-0">
          <CardHeader className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Heart className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dr. Ravi TenantPet Portal</h2>
                    <p className="text-gray-500">No. 32, 4th temple Street road, Malleshwaram, Bengaluru</p>
                  </div>
                </div>
              </div>
              <div className="text-left md:text-right">
                <h1 className="text-3xl font-bold tracking-tight text-gray-800">INVOICE</h1>
                <p className="text-gray-600">#{invoice.invoice_number}</p>
                <Badge className={`${statusColors[invoice.status]} mt-2 text-base`}>
                  {invoice.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-y py-6">
              <div>
                <h3 className="font-semibold text-gray-500 uppercase tracking-wider text-sm mb-2">Bill To</h3>
                {client ? (
                  <>
                    <p className="font-bold text-lg text-gray-800">{client.first_name} {client.last_name}</p>
                    <p className="text-gray-600 flex items-center gap-2 mt-1"><Mail className="w-4 h-4" /> {client.email}</p>
                    <p className="text-gray-600 flex items-center gap-2 mt-1"><Phone className="w-4 h-4" /> {client.phone}</p>
                    <p className="text-gray-600 mt-1">{client.address}</p>
                  </>
                ) : <p>TenantClient not found</p>}
              </div>
              <div className="text-left md:text-right">
                 <h3 className="font-semibold text-gray-500 uppercase tracking-wider text-sm mb-2">Patient</h3>
                 {pet ? (
                    <p className="font-bold text-lg text-gray-800 flex items-center gap-2 justify-start md:justify-end"><PawPrint className="w-5 h-5" />{pet.name}</p>
                 ) : <p>TenantPet not found</p>}
                 <p className="mt-2"><strong>TenantInvoice Date:</strong> {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</p>
                 <p><strong>Due Date:</strong> {format(new Date(invoice.due_date), 'dd MMM yyyy')}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="font-semibold text-gray-600 py-2">Service</th>
                    <th className="font-semibold text-gray-600 py-2 text-right">Qty</th>
                    <th className="font-semibold text-gray-600 py-2 text-right">Price</th>
                    <th className="font-semibold text-gray-600 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3">
                        <p className="font-medium text-gray-800">{item.service}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right">₹{item.unit_price?.toFixed(2)}</td>
                      <td className="py-3 text-right">₹{item.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{invoice.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (8%):</span>
                  <span className="font-medium">₹{invoice.tax_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>₹{invoice.total_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-6 md:p-8 bg-gray-50 print:bg-white">
            <div className="w-full">
              <h4 className="font-semibold mb-2">Notes</h4>
              <p className="text-sm text-gray-600">{invoice.notes || "Thank you for trusting us with your pet's care!"}</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
