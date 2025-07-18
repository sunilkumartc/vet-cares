
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProductSearchCombobox from "./ProductSearchCombobox";
import { FileText, Save, X, Plus, Trash2, Calendar as CalendarIcon, Edit3,ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function InvoiceForm({ invoice, pets, clients, products, onSubmit, onCancel }) {
  const generateInvoiceNumber = () => {
    return `INV-${Date.now()}`;
  };

  const getInitialFormData = () => ({
    invoice_number: invoice?.invoice_number || generateInvoiceNumber(),
    client_id: invoice?.client_id || "",
    pet_id: invoice?.pet_id || "",
    invoice_date: invoice?.invoice_date || new Date().toISOString().split('T')[0], // Stored as YYYY-MM-DD string
    items: invoice?.items || [{ product_id: '', service: '', description: '', quantity: 1, unit_price: 0, total: 0, is_manual: false }], // Added is_manual
    subtotal: invoice?.subtotal || 0,
    tax_rate: invoice?.tax_rate || 8, // Default 8% tax rate, now display-only in UI
    tax_amount: invoice?.tax_amount || 0,
    total_amount: invoice?.total_amount || 0,
    status: invoice?.status || "draft",
    payment_method: invoice?.payment_method || "",
    payment_date: invoice?.payment_date || "",
    notes: invoice?.notes || ""
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [availablePets, setAvailablePets] = useState([]);

  useEffect(() => {
    // Reset form data if invoice prop changes (e.g., editing a different invoice)
    setFormData(getInitialFormData());
  }, [invoice, pets]);

  useEffect(() => {
    // Filter pets based on selected client
    if (formData.client_id) {
      setAvailablePets(pets.filter(p => (p.client_id || p._id) === formData.client_id));
    } else {
      setAvailablePets([]); // No client selected, no pets to show
    }
    // Clear pet selection if current pet is not available for the selected client
    if (formData.client_id && formData.pet_id && !pets.some(p => (p._id || p.id) === formData.pet_id && (p.client_id || p._id) === formData.client_id)) {
      setFormData(prev => ({ ...prev, pet_id: "" }));
    }
  }, [formData.client_id, pets]);

  useEffect(() => {
    // Recalculate totals whenever items or tax rate change
    calculateTotals();
  }, [formData.items, formData.tax_rate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientChange = (clientId) => {
    // When client changes, clear pet selection and then set the new client ID
    setFormData(prev => ({ ...prev, client_id: clientId, pet_id: "" }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    let currentItem = newItems[index];

    if (field === 'product_id') {
      const product = products.find(p => (p._id || p.id) === value);
      if (product) {
        // If a product is selected, populate fields from product
        currentItem = {
          ...currentItem,
          product_id: value,
          service: product.name,
          description: product.description || '',
          unit_price: product.selling_price || 0,
          is_manual: false // Ensure it's not manual when a product is selected
        };
      } else {
        // TenantProduct ID was cleared or not found, clear related product fields
        currentItem = { ...currentItem, product_id: '', service: '', description: '', unit_price: 0, is_manual: false };
      }
    } else if (field === 'service') {
      // If a custom service is entered, clear product_id and set to manual
      currentItem = { ...currentItem, service: value, product_id: '', is_manual: true };
    } else if (field === 'is_manual') {
      if (value) { // Switching to manual mode
        currentItem = { ...currentItem, is_manual: true, product_id: '' }; // Clear product selection
      } else { // Switching to product search mode
        currentItem = { ...currentItem, is_manual: false, service: '', description: '', unit_price: 0 }; // Clear manual fields
      }
    } else if (field === 'quantity' || field === 'unit_price') {
      currentItem[field] = parseFloat(value) || 0;
    } else {
      currentItem[field] = value;
    }

    // Recalculate item total
    currentItem.total = (currentItem.quantity || 0) * (currentItem.unit_price || 0);
    newItems[index] = currentItem;
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', service: '', description: '', quantity: 1, unit_price: 0, total: 0, is_manual: false }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    const totalAmount = subtotal + taxAmount;

    setFormData(prev => ({
      ...prev,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full max-w-6xl mx-auto bg-white">
      <CardHeader className="sticky top-0 bg-white z-10 border-b">
      <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="absolute top-2 left-2 p-0 w-16 h-16 hover:bg-transparent flex items-center justify-center" // Positioned top-left, sized for visibility
          aria-label="Go back"
        >
          <ArrowLeft className="w-12 h-12 text-gray-600 hover:text-blue-800" /> {/* Large icon */}
        </Button>
        <CardTitle className="flex items-center justify-center gap-2 text-center">
          <FileText className="w-5 h-5" />
          {invoice ? 'Edit Invoice' : 'Create Invoice'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information - Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice Number</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => handleChange('invoice_number', e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={handleClientChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client._id || client.id} value={client._id || client.id}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pet_id">Pet *</Label>
              <Select
                value={formData.pet_id}
                onValueChange={(value) => handleChange('pet_id', value)}
                disabled={!formData.client_id || availablePets.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.client_id ? "Select a client first" : "Select a pet"} />
                </SelectTrigger>
                <SelectContent>
                  {availablePets.map((pet) => (
                    <SelectItem key={pet._id || pet.id} value={pet._id || pet.id}>
                      {pet.name} ({pet.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoice Date Only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.invoice_date ? format(new Date(formData.invoice_date), 'dd-MM-yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.invoice_date ? new Date(formData.invoice_date) : undefined}
                    onSelect={(date) => handleChange('invoice_date', date ? format(date, 'yyyy-MM-dd') : '')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Invoice Items - Responsive */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-semibold">Invoice Items</h3>
              <Button type="button" onClick={addItem} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>

            {formData.items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  {/* Toggle between Product Search and Manual Entry */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateItem(index, 'is_manual', !item.is_manual)}
                      className={`text-xs px-3 py-1 rounded-full ${
                        item.is_manual 
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      {item.is_manual ? 'Manual Entry' : 'Product Search'}
                    </Button>
                    <span className="text-sm text-gray-600">
                      {item.is_manual ? 'Type custom service/item' : 'Search from product catalog'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
                    {/* Product/Service Name */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label>Service / Product Name *</Label>
                      {item.is_manual ? (
                        <Input
                          placeholder="e.g., Consultation, Emergency Fee, Grooming"
                          value={item.service}
                          onChange={(e) => updateItem(index, 'service', e.target.value)}
                          required
                          className="border-orange-200 focus:border-orange-500"
                        />
                      ) : (
                        <ProductSearchCombobox
                          products={products || []}
                          selectedProductId={item.product_id}
                          onProductSelect={(product) => updateItem(index, 'product_id', product?.id || '')}
                          onCustomValue={(value) => updateItem(index, 'service', value)}
                          allowCustom={true} // Keep allowCustom true as ProductSearchCombobox should handle custom value fallback
                          initialValue={item.service} // Pass initial service name for display
                        />
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Additional details..."
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        required
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="space-y-2">
                      <Label>Unit Price (₹) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        readOnly={!item.is_manual && !!item.product_id} // Read-only if it's from a product and not manual
                        className={!item.is_manual && !!item.product_id ? 'bg-gray-100' : ''}
                        required
                      />
                    </div>

                    {/* Total and Remove Button */}
                    <div className="flex flex-col justify-end gap-2">
                      <div className="text-sm text-gray-600 mb-0">
                        Total: <span className="font-semibold text-green-600">₹{(item.total || 0).toFixed(2)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Invoice Totals & Other Details - Responsive */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => handleChange('payment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.status === 'paid' && (
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.payment_date ? format(new Date(formData.payment_date), 'dd-MM-yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.payment_date ? new Date(formData.payment_date) : undefined}
                        onSelect={(date) => handleChange('payment_date', date ? format(date, 'yyyy-MM-dd') : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Additional notes for this invoice..."
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Card className="p-4 bg-gray-50">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{formData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tax:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.tax_rate}
                        onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-sm text-right"
                      />
                      <span className="text-sm">%</span>
                      <span className="min-w-[60px] text-right">₹{formData.tax_amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <hr className="my-2 border-gray-300" />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>₹{formData.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Action Buttons - Responsive */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {invoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
