import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Save, X, Edit3 } from "lucide-react";
import ProductSearchCombobox from "./ProductSearchCombobox";
import { TenantProduct } from "@/api/tenant-entities";

export default function AddToBillForm({ client, pet, onSubmit, onCancel }) {
  const [item, setItem] = useState({
    service: "",
    description: "",
    quantity: 1,
    unit_price: 0,
    product_id: "",
    is_manual: false
  });
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productData = await TenantProduct.list();
      setProducts(productData.filter(p => p.is_active));
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setItem(prev => ({ ...prev, [field]: value }));
  };

  const handleProductSelect = (product) => {
    setItem(prev => ({
      ...prev,
      product_id: product.id,
      service: product.name,
      description: product.description || '',
      unit_price: product.selling_price || 0,
      is_manual: false
    }));
  };

  const handleManualToggle = () => {
    setItem(prev => ({
      ...prev,
      is_manual: !prev.is_manual,
      product_id: prev.is_manual ? prev.product_id : '' // Clear product when switching to manual
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!item.service || item.quantity <= 0) {
      alert("Please provide a service name and a valid quantity.");
      return;
    }
    
    const finalItem = {
      ...item,
      quantity: parseFloat(item.quantity) || 1,
      unit_price: parseFloat(item.unit_price) || 0
    };
    
    onSubmit(finalItem);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Add Billable Charge
          </CardTitle>
          <p className="text-sm text-gray-500">
            For: {pet?.name} (Owner: {client?.first_name} {client?.last_name})
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleManualToggle}
                className={`text-xs ${item.is_manual ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}
              >
                <Edit3 className="w-3 h-3 mr-1" />
                {item.is_manual ? 'Manual Entry' : 'TenantProduct Search'}
              </Button>
              <span className="text-sm text-gray-600">
                {item.is_manual ? 'Type custom service/item' : 'Search from product catalog'}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Service / Item Name *</Label>
              {item.is_manual ? (
                <Input
                  id="service"
                  value={item.service}
                  onChange={(e) => handleChange('service', e.target.value)}
                  placeholder="e.g., Consultation, Grooming, Emergency Fee"
                  required
                />
              ) : (
                <ProductSearchCombobox
                  products={products}
                  selectedProductId={item.product_id}
                  onProductSelect={handleProductSelect}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={item.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Additional details about this charge..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) => handleChange('unit_price', e.target.value)}
                  placeholder="0.00"
                  readOnly={!item.is_manual && !!item.product_id}
                  className={!item.is_manual && !!item.product_id ? 'bg-gray-100' : ''}
                  required
                />
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="text-lg font-bold text-green-600">
                  ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Add to Draft
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}