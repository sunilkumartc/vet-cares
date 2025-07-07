import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, X } from "lucide-react";
import { format } from "date-fns";

const statuses = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "recalled", label: "Recalled" },
  { value: "depleted", label: "Depleted" }
];

export default function BatchForm({ batch, products, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    product_id: batch?.product_id || "",
    lot_number: batch?.lot_number || "",
    expiry_date: batch?.expiry_date ? new Date(batch.expiry_date) : null,
    received_date: batch?.received_date ? new Date(batch.received_date) : new Date(),
    quantity_received: batch?.quantity_received || "",
    quantity_on_hand: batch?.quantity_on_hand || "",
    cost_per_unit: batch?.cost_per_unit || "",
    status: batch?.status || "active",
    supplier_invoice: batch?.supplier_invoice || ""
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.product_id || !formData.expiry_date || !formData.quantity_received) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      ...formData,
      expiry_date: format(formData.expiry_date, 'yyyy-MM-dd'),
      received_date: format(formData.received_date, 'yyyy-MM-dd'),
      quantity_received: parseInt(formData.quantity_received) || 0,
      quantity_on_hand: parseInt(formData.quantity_on_hand) || parseInt(formData.quantity_received) || 0,
      cost_per_unit: parseFloat(formData.cost_per_unit) || 0
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="w-5 h-5" />
          {batch ? 'Edit Batch' : 'Add New Batch'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="product_id">TenantProduct *</Label>
            <Select onValueChange={(value) => handleChange('product_id', value)} value={formData.product_id}>
              <SelectTrigger id="product_id">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.filter(p => p.is_active).map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.product_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lot_number">Lot Number</Label>
              <Input
                id="lot_number"
                value={formData.lot_number}
                onChange={(e) => handleChange('lot_number', e.target.value)}
                placeholder="Manufacturer lot number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_invoice">Supplier TenantInvoice</Label>
              <Input
                id="supplier_invoice"
                value={formData.supplier_invoice}
                onChange={(e) => handleChange('supplier_invoice', e.target.value)}
                placeholder="TenantInvoice reference"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Received Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.received_date ? format(formData.received_date, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.received_date}
                    onSelect={(date) => handleChange('received_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Expiry Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiry_date ? format(formData.expiry_date, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expiry_date}
                    onSelect={(date) => handleChange('expiry_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_received">Quantity Received *</Label>
              <Input
                id="quantity_received"
                type="number"
                value={formData.quantity_received}
                onChange={(e) => handleChange('quantity_received', e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity_on_hand">Current Stock</Label>
              <Input
                id="quantity_on_hand"
                type="number"
                value={formData.quantity_on_hand}
                onChange={(e) => handleChange('quantity_on_hand', e.target.value)}
                placeholder="Auto-filled if empty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_per_unit">Cost per Unit (₹)</Label>
              <Input
                id="cost_per_unit"
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => handleChange('cost_per_unit', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(value) => handleChange('status', value)} value={formData.status}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {batch ? 'Update Batch' : 'Add Batch'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}