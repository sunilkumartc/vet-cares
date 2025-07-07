import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Package, Search, RefreshCw, TrendingDown, Plus } from "lucide-react";
import { TenantProduct, TenantProductBatch } from "@/api/tenant-entities";

export default function StockLevels() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, activeTab]);

  const loadStockData = async () => {
    setLoading(true);
    try {
      const [productData, batchData] = await Promise.all([
        TenantProduct.list('-created_date'),
        TenantProductBatch.list()
      ]);

      // Calculate total stock for each product
      const productsWithStock = productData.map(product => {
        const productBatches = batchData.filter(batch => 
          batch.product_id === product.id && batch.status === 'active'
        );
        const totalStock = productBatches.reduce((sum, batch) => sum + batch.quantity_on_hand, 0);
        
        return {
          ...product,
          total_stock: totalStock,
          batches: productBatches
        };
      });

      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error loading stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products.filter(p => p.is_active);

    // Filter by tab
    if (activeTab === "out_of_stock") {
      filtered = filtered.filter(p => p.total_stock === 0);
    } else if (activeTab === "low_stock") {
      filtered = filtered.filter(p => p.total_stock > 0 && p.total_stock <= p.reorder_point);
    } else if (activeTab === "in_stock") {
      filtered = filtered.filter(p => p.total_stock > p.reorder_point);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.product_id?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term)
      );
    }

    setFilteredProducts(filtered);
  };

  const getStockStatus = (product) => {
    if (product.total_stock === 0) {
      return { 
        label: "Out of Stock", 
        color: "bg-red-100 text-red-800",
        urgency: "critical"
      };
    } else if (product.total_stock <= product.reorder_point) {
      return { 
        label: "Low Stock", 
        color: "bg-yellow-100 text-yellow-800",
        urgency: "warning"
      };
    } else {
      return { 
        label: "In Stock", 
        color: "bg-green-100 text-green-800",
        urgency: "good"
      };
    }
  };

  const getTabCounts = () => {
    return {
      all: products.length,
      out_of_stock: products.filter(p => p.total_stock === 0).length,
      low_stock: products.filter(p => p.total_stock > 0 && p.total_stock <= p.reorder_point).length,
      in_stock: products.filter(p => p.total_stock > p.reorder_point).length
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stock Levels</h2>
          <p className="text-gray-600">Monitor inventory levels and stock alerts</p>
        </div>
        <Button onClick={loadStockData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stock
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search products by name, ID, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({tabCounts.all})</TabsTrigger>
          <TabsTrigger value="out_of_stock" className="relative">
            Out of Stock ({tabCounts.out_of_stock})
            {tabCounts.out_of_stock > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="low_stock" className="relative">
            Low Stock ({tabCounts.low_stock})
            {tabCounts.low_stock > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_stock">In Stock ({tabCounts.in_stock})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading stock levels...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map(product => {
                const status = getStockStatus(product);
                return (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            status.urgency === 'critical' ? 'bg-red-100' : 
                            status.urgency === 'warning' ? 'bg-yellow-100' : 'bg-green-100'
                          }`}>
                            {status.urgency === 'critical' ? (
                              <AlertTriangle className="w-6 h-6 text-red-600" />
                            ) : (
                              <Package className="w-6 h-6 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <p className="text-sm text-gray-600">
                              {product.product_id} • {product.category} • ₹{product.selling_price}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-right">
                              <p className="text-2xl font-bold">{product.total_stock}</p>
                              <p className="text-sm text-gray-500">{product.unit}</p>
                            </div>
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Reorder at: {product.reorder_point} {product.unit}
                          </p>
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