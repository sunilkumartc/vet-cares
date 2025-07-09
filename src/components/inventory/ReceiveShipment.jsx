
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Truck, Plus, Save, CalendarIcon, Package, X } from "lucide-react";
import { TenantProduct, TenantProductBatch } from "@/api/tenant-entities";
import { format } from "date-fns";

export default function ReceiveShipment() {
  const [products, setProducts] = useState([]);
  const [shipmentItems, setShipmentItems] = useState([]);
  const [shipmentData, setShipmentData] = useState({
    supplier_name: "",
    supplier_invoice: "",
    received_date: new Date()
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productData = await TenantProduct.list();
      setProducts(productData.filter(p => p.is_active));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addShipmentItem = () => {
    setShipmentItems([...shipmentItems, {
      id: Date.now().toString(),
      product_id: "",
      lot_number: "",
      quantity_received: "",
      cost_per_unit: "",
      expiry_date: null
    }]);
  };

  const removeShipmentItem = (itemId) => {
    setShipmentItems(shipmentItems.filter(item => item.id !== itemId));
  };

  const updateShipmentItem = (itemId, field, value) => {
    setShipmentItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleShipmentDataChange = (field, value) => {
    setShipmentData(prev => ({ ...prev, [field]: value }));
  };

  const processShipment = async () => {
    if (shipmentItems.length === 0) {
      alert('Please add at least one item to the shipment');
      return;
    }

    const invalidItems = shipmentItems.filter(item =>
      !item.product_id || !item.quantity_received || !item.expiry_date
    );

    if (invalidItems.length > 0) {
      alert('Please fill in all required fields for all items');
      return;
    }

    setProcessing(true);
    try {
      // Fetch the latest product data to ensure accurate total_stock calculation
      const allProducts = await TenantProduct.list();

      for (const item of shipmentItems) {
        const batchId = `BATCH-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(-4)}`;
        
        await TenantProductBatch.create({
          product_id: item.product_id,
          batch_id: batchId,
          lot_number: item.lot_number || batchId,
          expiry_date: format(item.expiry_date, 'yyyy-MM-dd'),
          received_date: format(shipmentData.received_date, 'yyyy-MM-dd'),
          quantity_received: parseInt(item.quantity_received),
          quantity_on_hand: parseInt(item.quantity_received),
          cost_per_unit: parseFloat(item.cost_per_unit) || 0,
          status: 'active',
          supplier_invoice: shipmentData.supplier_invoice
        });

        // Find the product from the freshly fetched list and update its total stock
        const productToUpdate = allProducts.find(p => p.id === item.product_id);
        if (productToUpdate) {
          const newTotalStock = (productToUpdate.total_stock || 0) + parseInt(item.quantity_received);
          await TenantProduct.update(productToUpdate.id, {
            total_stock: newTotalStock
          });
        }
      }

      alert('Shipment received successfully and inventory updated!');
      // Reset form and reload products to reflect new stock counts
      setShipmentItems([]);
      setShipmentData({
        supplier_name: "",
        supplier_invoice: "",
        received_date: new Date()
      });
      loadProducts(); // Reload products to get updated stock counts for the component's state
      
    } catch (error) {
      console.error('Error processing shipment:', error);
      alert('Failed to process shipment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getTotalValue = () => {
    return shipmentItems.reduce((sum, item) => {
      const quantity = parseInt(item.quantity_received) || 0;
      const cost = parseFloat(item.cost_per_unit) || 0;
      return sum + (quantity * cost);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Receive Shipment</h2>
          <p className="text-gray-600">Record incoming inventory with batch tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shipment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Shipment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input
                value={shipmentData.supplier_name}
                onChange={(e) => handleShipmentDataChange('supplier_name', e.target.value)}
                placeholder="Enter supplier name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input
                value={shipmentData.supplier_invoice}
                onChange={(e) => handleShipmentDataChange('supplier_invoice', e.target.value)}
                placeholder="Enter invoice number"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Received Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(shipmentData.received_date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={shipmentData.received_date}
                    onSelect={(date) => handleShipmentDataChange('received_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Total Items:</span>
                <span>{shipmentItems.length}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Value:</span>
                <span>₹{getTotalValue().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipment Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Shipment Items
                </CardTitle>
                <Button onClick={addShipmentItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {shipmentItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No items added yet</p>
                  <Button onClick={addShipmentItem} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {shipmentItems.map((item, index) => (
                    <Card key={item.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-medium">Item #{index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeShipmentItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>TenantProduct *</Label>
                            <Select
                              onValueChange={(value) => updateShipmentItem(item.id, 'product_id', value)}
                              value={item.product_id}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.product_id})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Lot Number</Label>
                            <Input
                              value={item.lot_number}
                              onChange={(e) => updateShipmentItem(item.id, 'lot_number', e.target.value)}
                              placeholder="Manufacturer lot number"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Quantity Received *</Label>
                            <Input
                              type="number"
                              value={item.quantity_received}
                              onChange={(e) => updateShipmentItem(item.id, 'quantity_received', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Cost per Unit (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.cost_per_unit}
                              onChange={(e) => updateShipmentItem(item.id, 'cost_per_unit', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label>Expiry Date *</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {item.expiry_date ? format(item.expiry_date, 'PPP') : 'Select expiry date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={item.expiry_date}
                                  onSelect={(date) => updateShipmentItem(item.id, 'expiry_date', date)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        
                        {item.quantity_received && item.cost_per_unit && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between text-sm">
                              <span>Line Total:</span>
                              <span className="font-semibold">
                                ₹{(parseInt(item.quantity_received) * parseFloat(item.cost_per_unit)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  <div className="flex justify-end gap-4 pt-4">
                    <Button
                      onClick={processShipment}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Receive Shipment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
