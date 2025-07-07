import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Calendar, Search, RefreshCw, Clock, Archive } from "lucide-react";
import { TenantProduct, TenantProductBatch } from "@/api/tenant-entities";
import { format, isAfter, parseISO, differenceInDays, isPast } from "date-fns";

export default function ExpiryAlerts() {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("expiring_soon");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpiryData();
  }, []);

  useEffect(() => {
    filterBatches();
  }, [batches, products, searchTerm, activeTab]);

  const loadExpiryData = async () => {
    setLoading(true);
    try {
      const [batchData, productData] = await Promise.all([
        TenantProductBatch.list('expiry_date'),
        TenantProduct.list()
      ]);
      setBatches(batchData.filter(b => b.status === 'active'));
      setProducts(productData);
    } catch (error) {
      console.error('Error loading expiry data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBatches = () => {
    let filtered = batches;
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    // Filter by tab
    if (activeTab === "expired") {
      filtered = filtered.filter(batch => isPast(parseISO(batch.expiry_date)));
    } else if (activeTab === "expiring_soon") {
      filtered = filtered.filter(batch => {
        const expiryDate = parseISO(batch.expiry_date);
        return isAfter(expiryDate, today) && isAfter(thirtyDaysFromNow, expiryDate);
      });
    } else if (activeTab === "expiring_3_months") {
      filtered = filtered.filter(batch => {
        const expiryDate = parseISO(batch.expiry_date);
        return isAfter(expiryDate, thirtyDaysFromNow) && isAfter(ninetyDaysFromNow, expiryDate);
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
          product?.name.toLowerCase().includes(term)
        );
      });
    }

    setFilteredBatches(filtered);
  };

  const getExpiryStatus = (batch) => {
    const today = new Date();
    const expiryDate = parseISO(batch.expiry_date);
    const daysToExpiry = differenceInDays(expiryDate, today);

    if (isPast(expiryDate)) {
      return {
        label: "Expired",
        color: "bg-red-100 text-red-800",
        urgency: "critical",
        daysText: `Expired ${Math.abs(daysToExpiry)} days ago`
      };
    } else if (daysToExpiry <= 7) {
      return {
        label: "Expires This Week",
        color: "bg-red-100 text-red-800",
        urgency: "critical",
        daysText: `Expires in ${daysToExpiry} days`
      };
    } else if (daysToExpiry <= 30) {
      return {
        label: "Expires Soon",
        color: "bg-yellow-100 text-yellow-800",
        urgency: "warning",
        daysText: `Expires in ${daysToExpiry} days`
      };
    } else {
      return {
        label: "Expires Later",
        color: "bg-blue-100 text-blue-800",
        urgency: "info",
        daysText: `Expires in ${daysToExpiry} days`
      };
    }
  };

  const handleMarkExpired = async (batch) => {
    if (confirm(`Mark batch ${batch.batch_id} as expired?`)) {
      try {
        await TenantProductBatch.update(batch.id, { status: 'expired' });
        loadExpiryData();
      } catch (error) {
        console.error('Error marking batch as expired:', error);
      }
    }
  };

  const getTabCounts = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    return {
      expired: batches.filter(b => isPast(parseISO(b.expiry_date))).length,
      expiring_soon: batches.filter(b => {
        const expiryDate = parseISO(b.expiry_date);
        return isAfter(expiryDate, today) && isAfter(thirtyDaysFromNow, expiryDate);
      }).length,
      expiring_3_months: batches.filter(b => {
        const expiryDate = parseISO(b.expiry_date);
        return isAfter(expiryDate, thirtyDaysFromNow) && isAfter(ninetyDaysFromNow, expiryDate);
      }).length
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expiry Alerts</h2>
          <p className="text-gray-600">Monitor product expiration dates and prevent waste</p>
        </div>
        <Button onClick={loadExpiryData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Alerts
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search by batch ID, lot number, or product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expired" className="relative">
            Expired ({tabCounts.expired})
            {tabCounts.expired > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiring_soon" className="relative">
            Expiring Soon ({tabCounts.expiring_soon})
            {tabCounts.expiring_soon > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiring_3_months">
            Next 3 Months ({tabCounts.expiring_3_months})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading expiry alerts...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expiry alerts</h3>
              <p className="text-gray-500">No batches match the current filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBatches.map(batch => {
                const product = products.find(p => p.id === batch.product_id);
                const status = getExpiryStatus(batch);
                return (
                  <Card key={batch.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            status.urgency === 'critical' ? 'bg-red-100' : 
                            status.urgency === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                          }`}>
                            {status.urgency === 'critical' ? (
                              <AlertTriangle className="w-6 h-6 text-red-600" />
                            ) : (
                              <Clock className="w-6 h-6 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{product?.name || 'Unknown TenantProduct'}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span>Batch: {batch.batch_id}</span>
                              {batch.lot_number && <span>Lot: {batch.lot_number}</span>}
                              <span>Stock: {batch.quantity_on_hand} {product?.unit}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Expires: {format(parseISO(batch.expiry_date), 'PPP')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={status.color + " mb-2"}>
                            {status.label}
                          </Badge>
                          <p className="text-sm font-medium text-gray-700">
                            {status.daysText}
                          </p>
                          {activeTab === "expired" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkExpired(batch)}
                              className="mt-2 border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <Archive className="w-3 h-3 mr-1" />
                              Mark Expired
                            </Button>
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