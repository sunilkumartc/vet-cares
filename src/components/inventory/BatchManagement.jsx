import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Package, AlertTriangle, Calendar, Edit, Trash2 } from "lucide-react";
import { TenantProductBatch, TenantProduct } from "@/api/tenant-entities";
import { format, isAfter, parseISO, differenceInDays } from "date-fns";

import BatchForm from "./BatchForm";

export default function BatchManagement() {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBatches();
  }, [batches, products, searchTerm, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchData, productData] = await Promise.all([
        TenantProductBatch.list('-received_date'),
        TenantProduct.list()
      ]);
      setBatches(batchData);
      setProducts(productData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBatches = () => {
    let filtered = batches;

    // Filter by tab
    if (activeTab === "active") {
      filtered = filtered.filter(batch => batch.status === 'active' && batch.quantity_on_hand > 0);
    } else if (activeTab === "expired") {
      filtered = filtered.filter(batch => batch.status === 'expired' || isAfter(new Date(), parseISO(batch.expiry_date)));
    } else if (activeTab === "depleted") {
      filtered = filtered.filter(batch => batch.quantity_on_hand === 0);
    } else if (activeTab === "expiring") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      filtered = filtered.filter(batch => {
        const expiryDate = parseISO(batch.expiry_date);
        return isAfter(expiryDate, new Date()) && isAfter(thirtyDaysFromNow, expiryDate);
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(batch => {
        const product = products.find(p => p.id === batch.product_id);
        return (
          batch.batch_id.toLowerCase().includes(term) ||
          batch.lot_number?.toLowerCase().includes(term) ||
          product?.name.toLowerCase().includes(term) ||
          product?.product_id?.toLowerCase().includes(term)
        );
      });
    }

    setFilteredBatches(filtered);
  };

  const handleSubmit = async (batchData) => {
    try {
      if (editingBatch) {
        await TenantProductBatch.update(editingBatch.id, batchData);
      } else {
        // Generate batch ID
        const batchId = `BATCH-${Date.now().toString().slice(-6)}`;
        await TenantProductBatch.create({ ...batchData, batch_id: batchId });
      }
      setShowForm(false);
      setEditingBatch(null);
      loadData();
    } catch (error) {
      console.error('Error saving batch:', error);
      alert('Failed to save batch. Please try again.');
    }
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setShowForm(true);
  };

  const handleDelete = async (batch) => {
    if (confirm(`Are you sure you want to delete batch ${batch.batch_id}?`)) {
      try {
        await TenantProductBatch.update(batch.id, { status: 'recalled' });
        loadData();
      } catch (error) {
        console.error('Error deleting batch:', error);
        alert('Failed to delete batch. Please try again.');
      }
    }
  };

  const getBatchStatus = (batch) => {
    const today = new Date();
    const expiryDate = parseISO(batch.expiry_date);
    const daysToExpiry = differenceInDays(expiryDate, today);

    if (batch.quantity_on_hand === 0) {
      return { label: "Depleted", color: "bg-gray-100 text-gray-800", icon: Package };
    } else if (isAfter(today, expiryDate)) {
      return { label: "Expired", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    } else if (daysToExpiry <= 30) {
      return { label: `Expires in ${daysToExpiry} days`, color: "bg-yellow-100 text-yellow-800", icon: Calendar };
    } else {
      return { label: "Active", color: "bg-green-100 text-green-800", icon: Package };
    }
  };

  const getTabCounts = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return {
      all: batches.length,
      active: batches.filter(b => b.status === 'active' && b.quantity_on_hand > 0).length,
      expired: batches.filter(b => b.status === 'expired' || isAfter(today, parseISO(b.expiry_date))).length,
      depleted: batches.filter(b => b.quantity_on_hand === 0).length,
      expiring: batches.filter(b => {
        const expiryDate = parseISO(b.expiry_date);
        return isAfter(expiryDate, today) && isAfter(thirtyDaysFromNow, expiryDate);
      }).length
    };
  };

  if (showForm) {
    return (
      <BatchForm
        batch={editingBatch}
        products={products}
        onSubmit={handleSubmit}
        onCancel={() => { setShowForm(false); setEditingBatch(null); }}
      />
    );
  }

  const tabCounts = getTabCounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Batch Management</h2>
          <p className="text-gray-600">Track product batches, expiry dates, and stock levels</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Batch
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search by batch ID, lot number, or product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({tabCounts.all})</TabsTrigger>
          <TabsTrigger value="active">Active ({tabCounts.active})</TabsTrigger>
          <TabsTrigger value="expiring" className="relative">
            Expiring Soon ({tabCounts.expiring})
            {tabCounts.expiring > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expired" className="relative">
            Expired ({tabCounts.expired})
            {tabCounts.expired > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="depleted">Depleted ({tabCounts.depleted})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading batches...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No batches found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first batch"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Batch
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBatches.map(batch => {
                const product = products.find(p => p.id === batch.product_id);
                const status = getBatchStatus(batch);
                const StatusIcon = status.icon;

                return (
                  <Card key={batch.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${status.color}`}>
                            <StatusIcon className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-lg">{product?.name || 'Unknown TenantProduct'}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Batch: {batch.batch_id}</span>
                              {batch.lot_number && <span>Lot: {batch.lot_number}</span>}
                              <span>Received: {format(parseISO(batch.received_date), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium">Stock: {batch.quantity_on_hand} / {batch.quantity_received} {product?.unit}</span>
                              <span className="text-gray-600">Expires: {format(parseISO(batch.expiry_date), 'MMM d, yyyy')}</span>
                            </div>
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(batch)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(batch)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
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