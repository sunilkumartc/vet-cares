
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Scan, Plus, Minus, Trash2, User, PawPrint, AlertTriangle, RefreshCw, Package } from "lucide-react";
import { TenantProduct, TenantProductBatch, TenantSale, TenantClient, TenantPet, TenantStockMovement } from "@/api/tenant-entities";

import CartItem from "./CartItem";
import CustomerSelector from "./CustomerSelector";
import CheckoutForm from "./CheckoutForm";

export default function SalesCounter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productBatches, setProductBatches] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchProducts();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const loadInitialData = async () => {
    try {
      const [productData, batchData] = await Promise.all([
        TenantProduct.list(),
        TenantProductBatch.list()
      ]);
      setProducts(productData);
      setProductBatches(batchData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const searchProducts = () => {
    setLoading(true);
    try {
      const filtered = products.filter(product => 
        product.is_active &&
        product.total_stock > 0 && // Only show products with stock
        (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         product.product_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         product.barcode?.includes(searchTerm) ||
         product.category?.toLowerCase().includes(searchTerm.toLowerCase()))
      ).slice(0, 8);
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableBatches = (productId) => {
    return productBatches
      .filter(batch => 
        batch.product_id === productId && 
        batch.status === 'active' && 
        batch.quantity_on_hand > 0
      )
      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)); // FEFO
  };

  const addToCart = async (product) => {
    try {
      const availableBatches = getAvailableBatches(product.id);
      
      if (availableBatches.length === 0) {
        alert('Product is out of stock');
        return;
      }

      const firstBatch = availableBatches[0];
      const existingItem = cart.find(item => 
        item.product.id === product.id && item.batch.id === firstBatch.id
      );

      if (existingItem) {
        if (existingItem.quantity >= firstBatch.quantity_on_hand) {
          alert('Cannot add more. Insufficient stock in batch.');
          return;
        }
        updateCartQuantity(existingItem.id, existingItem.quantity + 1);
      } else {
        const cartItem = {
          id: `${product.id}-${firstBatch.id}-${Date.now()}`,
          product: product,
          batch: firstBatch,
          quantity: 1,
          unitPrice: product.selling_price || 0,
          total: product.selling_price || 0
        };
        setCart([...cart, cartItem]);
      }
      
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Error adding product to cart. Please try again.');
    }
  };

  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(cart.map(item => {
      if (item.id === itemId) {
        if (newQuantity > item.batch.quantity_on_hand) {
          alert(`Cannot exceed available stock. Available: ${item.batch.quantity_on_hand}`);
          return item;
        }
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * item.unitPrice
        };
      }
      return item;
    }));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    setShowCheckout(true);
  };

  const processSale = async (saleData) => {
    try {
      const saleId = `SALE-${Date.now()}`;
      const subtotal = getCartTotal();
      const taxAmount = subtotal * 0.08; // 8% tax
      const finalTotal = subtotal + taxAmount;

      // Create sale record
      const sale = await TenantSale.create({
        sale_id: saleId,
        client_id: selectedCustomer?.id || null,
        pet_id: selectedPet?.id || null,
        staff_member: "Current Staff", // TODO: Replace with actual logged-in staff
        sale_date: new Date().toISOString(),
        items: cart.map(item => ({
          product_id: item.product.id,
          batch_id: item.batch.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.total
        })),
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: finalTotal,
        payment_method: saleData.payment_method,
        prescription_notes: saleData.prescription_notes || "",
        customer_name: saleData.customer_name || (selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : ""),
        customer_phone: saleData.customer_phone || selectedCustomer?.phone || ""
      });

      // Update inventory and create stock movements
      for (const item of cart) {
        const newBatchQuantity = item.batch.quantity_on_hand - item.quantity;
        const newProductStock = item.product.total_stock - item.quantity;

        // Update batch
        await TenantProductBatch.update(item.batch.id, {
          quantity_on_hand: newBatchQuantity,
          status: newBatchQuantity === 0 ? 'depleted' : 'active'
        });

        // Update product total stock
        await TenantProduct.update(item.product.id, {
          total_stock: newProductStock
        });

        // Create stock movement record
        await TenantStockMovement.create({
          product_id: item.product.id,
          batch_id: item.batch.id,
          movement_type: 'sale',
          quantity: -item.quantity,
          reference_id: sale.id,
          movement_date: new Date().toISOString(),
          staff_member: "Current Staff",
          notes: `TenantSale ${saleId}`,
          previous_stock: item.batch.quantity_on_hand,
          new_stock: newBatchQuantity
        });
      }

      // Clear cart and selections
      setCart([]);
      setSelectedCustomer(null);
      setSelectedPet(null);
      setShowCheckout(false);
      
      // Refresh data
      await loadInitialData();
      
      alert(`TenantSale completed successfully! TenantSale ID: ${saleId}`);
      
      return sale; // Return sale for printing
      
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Error processing sale. Please try again.');
      throw error;
    }
  };

  if (showCheckout) {
    return (
      <div className="p-4">
        <CheckoutForm
          cart={cart}
          customer={selectedCustomer}
          pet={selectedPet}
          total={getCartTotal()}
          onComplete={processSale}
          onCancel={() => setShowCheckout(false)}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Search and Customer Selection */}
      <div className="lg:col-span-2 space-y-6">
        {/* Product Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Product Search
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadInitialData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                placeholder="Scan barcode or search product by name, ID, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-lg pr-12"
                autoFocus
              />
              <Scan className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {searchResults.map(product => {
                  const availableBatches = getAvailableBatches(product.id);
                  const nearestExpiry = availableBatches[0];
                  
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => addToCart(product)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-gray-600">
                          {product.product_id} • {product.category}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Stock: {product.total_stock} {product.unit}
                          </Badge>
                          {nearestExpiry && (
                            <Badge variant="secondary" className="text-xs">
                              Exp: {new Date(nearestExpiry.expiry_date).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{(product.selling_price || 0).toFixed(2)}</p>
                        <Badge variant={product.total_stock > 0 ? "default" : "destructive"}>
                          {product.total_stock > 0 ? "Available" : "Out of Stock"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {searchTerm.length >= 2 && searchResults.length === 0 && !loading && (
              <div className="mt-4 text-center text-gray-500 py-8">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No products found matching "{searchTerm}"</p>
                <p className="text-sm">Try different keywords or check if the product is in stock</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Selection */}
        <CustomerSelector
          selectedCustomer={selectedCustomer}
          selectedPet={selectedPet}
          onCustomerSelect={setSelectedCustomer}
          onPetSelect={setSelectedPet}
        />
      </div>

      {/* Shopping Cart */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Shopping Cart
              </div>
              <Badge variant="secondary">
                {getCartItemCount()} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Cart is empty</p>
                <p className="text-sm">Search and add products to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map(item => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onUpdateQuantity={updateCartQuantity}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>
                
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{getCartTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (8%):</span>
                    <span>₹{(getCartTotal() * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">₹{(getCartTotal() * 1.08).toFixed(2)}</span>
                  </div>
                </div>
                
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {cart.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{cart.length}</p>
                  <p className="text-sm text-gray-600">Products</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{getCartItemCount()}</p>
                  <p className="text-sm text-gray-600">Total Qty</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
