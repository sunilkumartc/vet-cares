import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { sendInvoiceViaWhatsApp } from '@/api/whatsapp';
import { useToast } from '@/components/ui/use-toast';

export default function WhatsAppInvoiceSender({ invoice, client }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const handleSendInvoice = async () => {
    if (!invoice || !client) {
      toast({
        title: 'Error',
        description: 'Invoice and client data are required',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // Mock PDF URL - in real implementation, this would be the actual S3 URL
      const pdfUrl = `https://vetinvoice.s3.eu-north-1.amazonaws.com/invoice/${invoice.invoice_number || 'INV-001'}.pdf`;
      
      const result = await sendInvoiceViaWhatsApp(invoice, client, pdfUrl);
      
      setResult(result);
      
      toast({
        title: 'Success',
        description: 'Invoice sent successfully via WhatsApp',
      });
      
    } catch (error) {
      console.error('Error sending invoice:', error);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invoice via WhatsApp',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  if (!invoice || !client) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Invoice Sender
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Please select an invoice and client to send via WhatsApp
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Send Invoice via WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Invoice Number</Label>
            <Input 
              value={invoice.invoice_number || 'N/A'} 
              readOnly 
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>Amount</Label>
            <Input 
              value={`₹${invoice.total_amount?.toFixed(2) || '0.00'}`} 
              readOnly 
              className="bg-gray-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Client Name</Label>
            <Input 
              value={`${client.first_name} ${client.last_name}`} 
              readOnly 
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input 
              value={client.phone || 'N/A'} 
              readOnly 
              className="bg-gray-50"
            />
          </div>
        </div>

        {/* Send Button */}
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleSendInvoice}
            disabled={sending || !client.phone}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send via WhatsApp
              </>
            )}
          </Button>
        </div>

        {/* Result Display */}
        {result && (
          <div className="mt-6 p-4 border rounded-lg bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Message Sent Successfully</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Message ID:</span> {result.messageId}
              </div>
              <div>
                <span className="font-medium">PDF URL:</span> 
                <a 
                  href={result.pdf_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1"
                >
                  {result.pdf_url}
                </a>
              </div>
              <div>
                <span className="font-medium">Status:</span> {result.message}
              </div>
            </div>

            {result.apiResponse && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  API Response Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(result.apiResponse, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">How it works:</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Creates a short URL for the invoice PDF</li>
            <li>2. Sends formatted message via WhatsApp API</li>
            <li>3. Tracks message delivery and URL access</li>
            <li>4. Stores message history in database</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
} 