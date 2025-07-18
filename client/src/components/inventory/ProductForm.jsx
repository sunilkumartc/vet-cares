import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X, Upload, PackagePlus, Calendar as CalendarIcon, Package, ArrowLeft } from "lucide-react"; // Added ArrowLeft
import { UploadFile } from "@/api/integrations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

const categories = [
  { value: "medicine", label: "Medicine" },
  { value: "food", label: "Food" },
  { value: "accessories", label: "Accessories" },
  { value: "supplies", label: "Supplies" },
  { value: "equipment", label: "Equipment" },
  { value: "supplements", label: "Supplements" },
  { value: "toys", label: "Toys" }
];

const units = [
  { value: "piece", label: "Piece" },
  { value: "bottle", label: "Bottle" },
  { value: "box", label: "Box" },
  { value: "bag", label: "Bag" },
  { value: "kg", label: "Kilogram" },
  { value: "ml", label: "Milliliter" },
  { value: "tablet", label: "Tablet" },
  { value: "capsule", label: "Capsule" }
];

export default function ProductForm({ product, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    category: product?.category || "",
    unit: product?.unit || "",
    selling_price: product?.selling_price || "",
    cost_price: product?.cost_price || "",
    reorder_point: product?.reorder_point || 10,
    description: product?.description || "",
    manufacturer: product?.manufacturer || "",
    supplier_name: product?.supplier_name || "",
    supplier_contact: product?.supplier_contact || "",
    barcode: product?.barcode || "",
    image_url: product?.image_url || "",
    is_prescription_required: product?.is_prescription_required || false,
    is_active: product?.is_active !== undefined ? product.is_active : true
  });

  const [initialBatchData, setInitialBatchData] = useState({
    quantity: "",
    expiry_date: null
  });

  const [uploading, setUploading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleBatchChange = (field, value) => {
    setInitialBatchData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.category || !formData.unit || !formData.selling_price) {
      alert('Please fill in all required fields (Name, Category, Unit, Selling Price)');
      return;
    }

    if (!product && initialBatchData.quantity && !initialBatchData.expiry_date) {
      alert('Please provide an expiry date for the initial stock.');
      return;
    }

    const finalProductData = {
      ...formData,
      selling_price: parseFloat(formData.selling_price) || 0,
      cost_price: parseFloat(formData.cost_price) || 0,
      reorder_point: parseInt(formData.reorder_point) || 10,
    };
    
    if (!product) {
        finalProductData.initial_batch = {
            quantity_received: parseInt(initialBatchData.quantity) || 0,
            cost_per_unit: parseFloat(formData.cost_price) || 0,
            expiry_date: initialBatchData.expiry_date
        }
    }
    
    onSubmit(finalProductData);
  };

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader className="relative"> {/* Relative for positioning back button */}
        {/* Back Arrow Button */}
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
          <Package className="w-5 h-5" />
          {product ? 'Edit Product' : 'Add New Product'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select onValueChange={(value) => handleChange('category', value)} value={formData.category}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Select onValueChange={(value) => handleChange('unit', value)} value={formData.unit}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price (₹) *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => handleChange('selling_price', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price (₹)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => handleChange('cost_price', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorder_point">Reorder Point</Label>
                <Input
                  id="reorder_point"
                  type="number"
                  value={formData.reorder_point}
                  onChange={(e) => handleChange('reorder_point', e.target.value)}
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Product barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode || ''}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  placeholder="Product barcode"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  placeholder="Manufacturer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_name">Supplier Name</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => handleChange('supplier_name', e.target.value)}
                  placeholder="Primary supplier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_contact">Supplier Contact</Label>
                <Input
                  id="supplier_contact"
                  value={formData.supplier_contact}
                  onChange={(e) => handleChange('supplier_contact', e.target.value)}
                  placeholder="Phone, email, or address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Product Image</Label>
                <div className="space-y-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                  />
                  {formData.image_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.image_url} 
                        alt="Product preview"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active Product</Label>
              </div>
            </div>
          </div>

          {!product && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-green-600" />
                Initial Stock Details (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="initial_quantity">Initial Quantity</Label>
                  <Input
                    id="initial_quantity"
                    type="number"
                    value={initialBatchData.quantity}
                    onChange={(e) => handleBatchChange('quantity', e.target.value)}
                    placeholder="e.g., 100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price_batch">Cost Price (₹)</Label>
                  <Input
                    id="cost_price_batch"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => handleChange('cost_price', e.target.value)}
                    placeholder="Cost per unit for this batch"
                  />
                  <p className="text-xs text-gray-500">Cost price will apply to this initial batch.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date *</Label>
                   <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {initialBatchData.expiry_date ? format(initialBatchData.expiry_date, 'PPP') : 'Select expiry date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={initialBatchData.expiry_date}
                          onSelect={(date) => handleBatchChange('expiry_date', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Product description and details"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {product ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
