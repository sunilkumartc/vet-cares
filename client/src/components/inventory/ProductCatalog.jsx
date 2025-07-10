
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Package, Edit, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { TenantProduct, TenantProductBatch } from "@/api/tenant-entities";
import { format } from "date-fns";

import ProductForm from "./ProductForm";

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const categories = [
    { value: "all", label: "All Products" },
    { value: "medicine", label: "Medicine" },
    { value: "food", label: "Food" },
    { value: "accessories", label: "Accessories" },
    { value: "supplies", label: "Supplies" },
    { value: "equipment", label: "Equipment" },
    { value: "supplements", label: "Supplements" },
    { value: "toys", label: "Toys" }
  ];

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, activeCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productData = await TenantProduct.list('-created_date');
      setProducts(productData);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products.filter(product => product.is_active);

    if (activeCategory !== "all") {
      filtered = filtered.filter(product => product.category === activeCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.product_id?.toLowerCase().includes(term) ||
        product.barcode?.includes(term) ||
        product.manufacturer?.toLowerCase().includes(term)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleSubmit = async (productData) => {
    try {
      if (editingProduct) {
        // For edits, we don't handle batch creation from this form
        await TenantProduct.update(editingProduct.id, productData);
      } else {
        // Handle new product creation with an optional initial batch
        const { initial_batch, ...newProductData } = productData;

        const productId = `PRD-${Date.now().toString().slice(-6)}`;
        
        // Set product's total_stock from the initial batch quantity
        const stockFromBatch = initial_batch?.quantity_received || 0;
        newProductData.total_stock = stockFromBatch;

        // Create the product record
        const newProduct = await TenantProduct.create({ ...newProductData, product_id: productId });

        // If an initial batch with quantity and expiry was provided, create it
        if (stockFromBatch > 0 && initial_batch.expiry_date) {
            const batchId = `BATCH-${Date.now().toString().slice(-6)}-INIT`;
            await TenantProductBatch.create({
                product_id: newProduct.id,
                batch_id: batchId,
                lot_number: "INITIAL",
                expiry_date: format(initial_batch.expiry_date, 'yyyy-MM-dd'),
                received_date: format(new Date(), 'yyyy-MM-dd'),
                quantity_received: stockFromBatch,
                quantity_on_hand: stockFromBatch,
                cost_per_unit: initial_batch.cost_per_unit || 0,
                status: 'active',
                supplier_invoice: 'INITIAL_STOCK'
            });
        }
      }
      setShowForm(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (product) => {
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      try {
        await TenantProduct.update(product.id, { is_active: false });
        loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const getStockStatus = (product) => {
    if (product.total_stock === 0) {
      return { label: "Out of Stock", color: "bg-red-100 text-red-800" };
    } else if (product.total_stock <= product.reorder_point) {
      return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { label: "In Stock", color: "bg-green-100 text-green-800" };
    }
  };

  if (showForm) {
    return (
      <ProductForm
        product={editingProduct}
        onSubmit={handleSubmit}
        onCancel={() => { setShowForm(false); setEditingProduct(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
          <p className="text-gray-600 mt-1">Manage your product inventory</p>
        </div>
        <Button 
          onClick={() => { setEditingProduct(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products by name, ID, barcode, or manufacturer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
          {categories.map(category => (
            <TabsTrigger key={category.value} value={category.value} className="text-xs">
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Add First Product</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first product"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First TenantProduct
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => {
                const stockStatus = getStockStatus(product);
                return (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold">{product.name}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            ID: {product.product_id} | {product.category}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-green-600">₹{product.selling_price}</span>
                          <Badge className={stockStatus.color}>
                            {stockStatus.label}
                          </Badge>
                        </div>

                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Stock:</span>
                            <span className="font-medium">{product.total_stock} {product.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Reorder Point:</span>
                            <span>{product.reorder_point} {product.unit}</span>
                          </div>
                          {product.manufacturer && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Manufacturer:</span>
                              <span>{product.manufacturer}</span>
                            </div>
                          )}
                          {product.is_prescription_required && (
                            <Badge variant="outline" className="mt-2">
                              Prescription Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
