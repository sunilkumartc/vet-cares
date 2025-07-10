import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Package, History, TrendingUp } from "lucide-react";

import SalesCounter from "../components/sales/SalesCounter";
import ProductQuickAdd from "../components/sales/ProductQuickAdd";
import MissedSalesManager from "../components/sales/MissedSalesManager";
import SalesReports from "../components/sales/SalesReports";

export default function SalesDispense() {
  const [activeTab, setActiveTab] = useState("counter");

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales & Dispense</h1>
          <p className="text-gray-600 mt-1">Point of sale system for product dispensing and customer transactions</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="counter" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Sales Counter
          </TabsTrigger>
          <TabsTrigger value="quick-add" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Quick Add TenantProduct
          </TabsTrigger>
          <TabsTrigger value="missed-sales" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Missed Sales
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="counter" className="mt-6">
          <SalesCounter />
        </TabsContent>

        <TabsContent value="quick-add" className="mt-6">
          <ProductQuickAdd />
        </TabsContent>

        <TabsContent value="missed-sales" className="mt-6">
          <MissedSalesManager />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <SalesReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}