import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package, FileSpreadsheet, TrendingDown, AlertTriangle, BarChart3, Upload, Truck } from "lucide-react";

import ProductCatalog from "../components/inventory/ProductCatalog";
import BatchManagement from "../components/inventory/BatchManagement";
import StockLevels from "../components/inventory/StockLevels";
import ExpiryAlerts from "../components/inventory/ExpiryAlerts";
import InventoryReports from "../components/inventory/InventoryReports";
import BulkImport from "../components/inventory/BulkImport";
import ReceiveShipment from "../components/inventory/ReceiveShipment";

const inventoryViews = [
  { value: "catalog", label: "TenantProduct Catalog", icon: Package, component: <ProductCatalog /> },
  { value: "batches", label: "Batch Management", icon: FileSpreadsheet, component: <BatchManagement /> },
  { value: "stock-levels", label: "Stock Levels", icon: TrendingDown, component: <StockLevels /> },
  { value: "expiry-alerts", label: "Expiry Alerts", icon: AlertTriangle, component: <ExpiryAlerts /> },
  { value: "receive-shipment", label: "Receive Shipment", icon: Truck, component: <ReceiveShipment /> },
  { value: "bulk-import", label: "Bulk Import", icon: Upload, component: <BulkImport /> },
  { value: "reports", label: "Reports", icon: BarChart3, component: <InventoryReports /> },
];

export default function InventoryManagement() {
  const [activeView, setActiveView] = useState("catalog");

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Comprehensive inventory control with batch tracking and automated alerts</p>
        </div>
      </div>

      <div className="bg-white p-2 rounded-lg shadow-sm border flex flex-wrap gap-2">
        {inventoryViews.map((view) => (
          <Button
            key={view.value}
            variant={activeView === view.value ? "default" : "ghost"}
            onClick={() => setActiveView(view.value)}
            className={`flex items-center gap-2 ${activeView === view.value ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-700'}`}
          >
            <view.icon className="w-4 h-4" />
            {view.label}
          </Button>
        ))}
      </div>
      
      <div className="mt-6">
        {inventoryViews.find(v => v.value === activeView)?.component}
      </div>
    </div>
  );
}