
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Save, X, Printer, Receipt } from "lucide-react";
import { generateSalesReceipt } from "@/api/functions";

export default function CheckoutForm({ cart, customer, pet, total, onComplete, onCancel }) {
  const [paymentData, setPaymentData] = useState({
    payment_method: "cash",
    customer_name: customer ? `${customer.first_name} ${customer.last_name}` : "",
    customer_phone: customer?.phone || "",
    prescription_notes: "",
    print_receipt: true
  });
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  const handleChange = (field, value) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      const saleResult = await onComplete(paymentData);
      setCompletedSale(saleResult);
      
      // Auto-print receipt if enabled
      if (paymentData.print_receipt && saleResult) {
        await handlePrintReceipt(saleResult.id);
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Error processing sale. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReceipt = async (saleId) => {
    try {
      const response = await generateSalesReceipt({ saleId });
      
      if (response.status === 200) {
        // Open receipt in new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(response.data);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Error generating receipt. TenantSale completed successfully.');
    }
  };

  const subtotal = total;
  const taxAmount = subtotal * 0.08;
  const finalTotal = subtotal + taxAmount;

  if (completedSale) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-green-600">TenantSale Completed Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-2xl font-bold">TenantSale ID: {completedSale.sale_id}</div>
            <div className="text-lg">Total: ₹{finalTotal.toFixed(2)}</div>
            
            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => handlePrintReceipt(completedSale.id)}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
              <Button variant="outline" onClick={onCancel}>
                New TenantSale
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Checkout - Complete TenantSale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Summary</h3>
              
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                      </p>
                      {item.batch && (
                        <p className="text-xs text-gray-500">
                          Batch: {item.batch.batch_id} | Exp: {new Date(item.batch.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold">₹{item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-green-600">₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Customer Info */}
              {(customer || pet) && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Customer Information</h4>
                  {customer && (
                    <p className="text-sm">
                      <strong>Customer:</strong> {customer.first_name} {customer.last_name}
                      {customer.phone && <span> | {customer.phone}</span>}
                    </p>
                  )}
                  {pet && (
                    <p className="text-sm">
                      <strong>TenantPet:</strong> {pet.name} ({pet.species})
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Details</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select
                    value={paymentData.payment_method}
                    onValueChange={(value) => handleChange('payment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!customer && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="customer_name">Customer Name</Label>
                      <Input
                        id="customer_name"
                        value={paymentData.customer_name}
                        onChange={(e) => handleChange('customer_name', e.target.value)}
                        placeholder="Walk-in customer name (optional)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer_phone">Customer Phone</Label>
                      <Input
                        id="customer_phone"
                        value={paymentData.customer_phone}
                        onChange={(e) => handleChange('customer_phone', e.target.value)}
                        placeholder="Customer phone number (optional)"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="prescription_notes">Prescription/Usage Notes</Label>
                  <Textarea
                    id="prescription_notes"
                    value={paymentData.prescription_notes}
                    onChange={(e) => handleChange('prescription_notes', e.target.value)}
                    placeholder="Medicine instructions, usage notes, etc."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="print_receipt"
                    checked={paymentData.print_receipt}
                    onChange={(e) => handleChange('print_receipt', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="print_receipt" className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Print receipt after sale
                  </Label>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={processing}
                  >
                    {processing ? (
                      "Processing..."
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Complete TenantSale - ₹{finalTotal.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
