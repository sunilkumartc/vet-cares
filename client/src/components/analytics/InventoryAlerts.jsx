import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isPast, differenceInDays } from "date-fns";

export default function InventoryAlerts({ products, batches }) {
  const calculateAlerts = () => {
    const today = new Date();
    
    // Low stock alerts
    const lowStockProducts = products.filter(product => 
      product.is_active && product.total_stock <= product.reorder_point
    );

    // Out of stock
    const outOfStockProducts = products.filter(product =>
      product.is_active && product.total_stock === 0
    );

    // Expiring items (within 30 days)
    const expiringBatches = batches.filter(batch => {
      if (batch.status !== 'active') return false;
      const expiryDate = parseISO(batch.expiry_date);
      const daysToExpiry = differenceInDays(expiryDate, today);
      return daysToExpiry >= 0 && daysToExpiry <= 30;
    });

    // Expired items
    const expiredBatches = batches.filter(batch => {
      if (batch.status !== 'active') return false;
      return isPast(parseISO(batch.expiry_date));
    });

    // Calculate total inventory value
    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + ((product.total_stock || 0) * (product.selling_price || 0));
    }, 0);

    return {
      lowStockProducts,
      outOfStockProducts,
      expiringBatches,
      expiredBatches,
      totalInventoryValue
    };
  };

  const alerts = calculateAlerts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          Inventory Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <Package className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-orange-600">Inventory Value</p>
            <p className="text-lg font-bold text-orange-700">₹{alerts.totalInventoryValue.toFixed(2)}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-red-600">Critical Items</p>
            <p className="text-lg font-bold text-red-700">
              {alerts.outOfStockProducts.length + alerts.expiredBatches.length}
            </p>
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-3">
          {/* Out of Stock */}
          {alerts.outOfStockProducts.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Out of Stock</span>
                <Badge variant="destructive">{alerts.outOfStockProducts.length}</Badge>
              </div>
              <div className="space-y-1">
                {alerts.outOfStockProducts.slice(0, 3).map((product, index) => (
                  <p key={index} className="text-xs text-red-700">• {product.name}</p>
                ))}
                {alerts.outOfStockProducts.length > 3 && (
                  <p className="text-xs text-red-600">+{alerts.outOfStockProducts.length - 3} more items</p>
                )}
              </div>
            </div>
          )}

          {/* Low Stock */}
          {alerts.lowStockProducts.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Low Stock</span>
                <Badge variant="secondary">{alerts.lowStockProducts.length}</Badge>
              </div>
              <div className="space-y-1">
                {alerts.lowStockProducts.slice(0, 3).map((product, index) => (
                  <p key={index} className="text-xs text-yellow-700">
                    • {product.name} ({product.total_stock} left)
                  </p>
                ))}
                {alerts.lowStockProducts.length > 3 && (
                  <p className="text-xs text-yellow-600">+{alerts.lowStockProducts.length - 3} more items</p>
                )}
              </div>
            </div>
          )}

          {/* Expiring Soon */}
          {alerts.expiringBatches.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Expiring Soon</span>
                <Badge variant="secondary">{alerts.expiringBatches.length}</Badge>
              </div>
              <div className="space-y-1">
                {alerts.expiringBatches.slice(0, 3).map((batch, index) => {
                  const product = products.find(p => p.id === batch.product_id);
                  const daysToExpiry = differenceInDays(parseISO(batch.expiry_date), new Date());
                  return (
                    <p key={index} className="text-xs text-orange-700">
                      • {product?.name || 'Unknown'} - {daysToExpiry} days
                    </p>
                  );
                })}
                {alerts.expiringBatches.length > 3 && (
                  <p className="text-xs text-orange-600">+{alerts.expiringBatches.length - 3} more batches</p>
                )}
              </div>
            </div>
          )}

          {/* Expired Items */}
          {alerts.expiredBatches.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Expired Items</span>
                <Badge variant="destructive">{alerts.expiredBatches.length}</Badge>
              </div>
              <div className="space-y-1">
                {alerts.expiredBatches.slice(0, 2).map((batch, index) => {
                  const product = products.find(p => p.id === batch.product_id);
                  return (
                    <p key={index} className="text-xs text-red-700">
                      • {product?.name || 'Unknown'} - {format(parseISO(batch.expiry_date), 'MMM dd')}
                    </p>
                  );
                })}
                {alerts.expiredBatches.length > 2 && (
                  <p className="text-xs text-red-600">+{alerts.expiredBatches.length - 2} more batches</p>
                )}
              </div>
            </div>
          )}

          {alerts.outOfStockProducts.length === 0 && 
           alerts.lowStockProducts.length === 0 && 
           alerts.expiringBatches.length === 0 && 
           alerts.expiredBatches.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No inventory alerts</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}