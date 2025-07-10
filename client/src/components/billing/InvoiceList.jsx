
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, PawPrint, User, Edit, Eye, FileText, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { sendInvoice, canSendInvoice } from "@/services/invoiceService";
import { useToast } from "@/components/ui/use-toast";

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-orange-100 text-orange-800"
};

export default function InvoiceList({ invoices, pets, clients, loading, onEdit }) {
  const [sendingInvoices, setSendingInvoices] = useState(new Set());
  const { toast } = useToast();
  
  const getPetInfo = (petId) => pets.find(p => (p._id || p.id) === petId);
  const getClientInfo = (clientId) => clients.find(c => (c._id || c.id) === clientId);

  const handleSendInvoice = async (invoiceId) => {
    setSendingInvoices(prev => new Set(prev).add(invoiceId));
    
    try {
      const result = await sendInvoice(invoiceId);
      
      toast({
        title: "Invoice Sent Successfully!",
        description: result.message,
        variant: "default",
      });
      
      // Refresh the page to show updated status
      window.location.reload();
      
    } catch (error) {
      console.error('Error sending invoice:', error);
      
      toast({
        title: "Failed to Send Invoice",
        description: error.message || "An error occurred while sending the invoice",
        variant: "destructive",
      });
    } finally {
      setSendingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
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

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices Found</h3>
          <p className="text-gray-600">Create your first invoice to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => {
        const pet = getPetInfo(invoice.pet_id);
        const client = getClientInfo(invoice.client_id);
        
        return (
          <Card key={invoice._id || invoice.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Invoice #{invoice.invoice_number}
                    </h3>
                    <Badge className={statusColors[invoice.status] || statusColors.draft}>
                      {invoice.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <PawPrint className="w-4 h-4 text-blue-500" />
                      <span>{pet?.name || 'General Services'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-500" />
                      <span>{client ? `${client.first_name} ${client.last_name}` : 'Walk-in'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span>{format(new Date(invoice.invoice_date), 'dd-MM-yyyy')}</span>
                    </div>
                  </div>

                  <div className="text-xl font-bold text-gray-900">
                    ₹{invoice.total_amount?.toFixed(2)}
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto">
                  <Link to={createPageUrl(`InvoiceDetails?id=${invoice._id || invoice.id}`)} className="flex-1 lg:flex-none">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  </Link>
                  
                  {canSendInvoice(invoice) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSendInvoice(invoice._id || invoice.id)}
                      disabled={sendingInvoices.has(invoice._id || invoice.id)}
                      className="flex-1 lg:flex-none gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    >
                      {sendingInvoices.has(invoice._id || invoice.id) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Invoice
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(invoice)}
                    className="flex-1 lg:flex-none gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
