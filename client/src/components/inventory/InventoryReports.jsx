
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, Download, CalendarIcon, TrendingUp, Package, AlertTriangle, DollarSign } from "lucide-react";
import { TenantProduct, TenantProductBatch, TenantSale, TenantStockMovement } from "@/api/tenant-entities";
import { format, subDays, subMonths, isWithinInterval, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function InventoryReports() {
  const [reportType, setReportType] = useState("stock_summary");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { value: "stock_summary", label: "Stock Summary" },
    { value: "low_stock", label: "Low Stock Report" },
    { value: "expiry_report", label: "Expiry Analysis" },
    { value: "category_analysis", label: "Category Analysis" },
    { value: "stock_movement", label: "Stock Movement" },
    { value: "valuation", label: "Inventory Valuation" }
  ];

  useEffect(() => {
    generateReport();
  }, [reportType, dateRange]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const [products, batches, sales] = await Promise.all([
        TenantProduct.list(),
        TenantProductBatch.list(),
        TenantSale.list()
      ]);

      let data = {};

      switch (reportType) {
        case "stock_summary":
          data = generateStockSummary(products, batches);
          break;
        case "low_stock":
          data = generateLowStockReport(products);
          break;
        case "expiry_report":
          data = generateExpiryReport(batches, products);
          break;
        case "category_analysis":
          data = generateCategoryAnalysis(products, batches);
          break;
        case "stock_movement":
          data = generateStockMovementReport(sales, products);
          break;
        case "valuation":
          data = generateValuationReport(products, batches);
          break;
        default:
          data = {};
      }

      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStockSummary = (products, batches) => {
    const activeProducts = products.filter(p => p.is_active);
    const activeBatches = batches.filter(b => b.status === 'active');
    
    const totalProducts = activeProducts.length;
    const inStockProducts = activeProducts.filter(p => p.total_stock > 0).length;
    const outOfStockProducts = activeProducts.filter(p => p.total_stock === 0).length;
    const lowStockProducts = activeProducts.filter(p => p.total_stock > 0 && p.total_stock <= p.reorder_point).length;

    const categoryBreakdown = activeProducts.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});

    return {
      summary: {
        totalProducts,
        inStockProducts,
        outOfStockProducts,
        lowStockProducts,
        totalBatches: activeBatches.length
      },
      categoryChart: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }))
    };
  };

  const generateLowStockReport = (products) => {
    const lowStockProducts = products
      .filter(p => p.is_active && p.total_stock <= p.reorder_point)
      .map(p => ({
        name: p.name,
        currentStock: p.total_stock,
        reorderPoint: p.reorder_point,
        category: p.category,
        unit: p.unit
      }))
      .sort((a, b) => a.currentStock - b.currentStock);

    return { products: lowStockProducts };
  };

  const generateExpiryReport = (batches, products) => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiredBatches = batches.filter(b => new Date(b.expiry_date) < today);
    const expiringSoon = batches.filter(b => {
      const expiryDate = new Date(b.expiry_date);
      return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
    });

    const expiryData = expiringSoon.map(batch => {
      const product = products.find(p => p.id === batch.product_id);
      const daysToExpiry = Math.ceil((new Date(batch.expiry_date) - today) / (1000 * 60 * 60 * 24));
      return {
        productName: product?.name || 'Unknown',
        batchId: batch.batch_id,
        expiryDate: batch.expiry_date,
        daysToExpiry,
        quantity: batch.quantity_on_hand,
        unit: product?.unit || 'units'
      };
    });

    return {
      summary: {
        expired: expiredBatches.length,
        expiringSoon: expiringSoon.length
      },
      expiringBatches: expiryData.sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    };
  };

  const generateCategoryAnalysis = (products, batches) => {
    const categories = {};
    
    products.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = {
          name: product.category,
          productCount: 0,
          totalStock: 0,
          totalValue: 0
        };
      }
      
      categories[product.category].productCount++;
      categories[product.category].totalStock += product.total_stock || 0;
      categories[product.category].totalValue += (product.total_stock || 0) * product.selling_price;
    });

    return {
      categories: Object.values(categories),
      chart: Object.values(categories).map(cat => ({
        name: cat.name,
        value: cat.totalValue
      }))
    };
  };

  const generateStockMovementReport = (sales, products) => {
    const filteredSales = sales.filter(sale => {
      const saleDate = parseISO(sale.sale_date);
      return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to });
    });

    const dailyMovement = {};
    filteredSales.forEach(sale => {
      const date = format(parseISO(sale.sale_date), 'yyyy-MM-dd');
      if (!dailyMovement[date]) {
        dailyMovement[date] = { date, sales: 0, revenue: 0 };
      }
      dailyMovement[date].sales += sale.items?.length || 0;
      dailyMovement[date].revenue += sale.total_amount || 0;
    });

    return {
      dailyData: Object.values(dailyMovement).sort((a, b) => new Date(a.date) - new Date(b.date))
    };
  };

  const generateValuationReport = (products, batches) => {
    let totalInventoryValue = 0;
    let totalCostValue = 0;

    const valuationByCategory = {};

    products.forEach(product => {
      const productBatches = batches.filter(b => b.product_id === product.id && b.status === 'active');
      const totalStock = productBatches.reduce((sum, batch) => sum + batch.quantity_on_hand, 0);
      const avgCost = totalStock > 0 
        ? productBatches.reduce((sum, batch) => sum + (batch.cost_per_unit * batch.quantity_on_hand), 0) / totalStock
        : 0;

      const sellingValue = totalStock * product.selling_price;
      const costValue = totalStock * avgCost;

      totalInventoryValue += sellingValue;
      totalCostValue += costValue;

      if (!valuationByCategory[product.category]) {
        valuationByCategory[product.category] = { selling: 0, cost: 0 };
      }
      valuationByCategory[product.category].selling += sellingValue;
      valuationByCategory[product.category].cost += costValue;
    });

    return {
      summary: {
        totalInventoryValue,
        totalCostValue,
        potentialProfit: totalInventoryValue - totalCostValue
      },
      categoryValuation: Object.entries(valuationByCategory).map(([category, values]) => ({
        category,
        sellingValue: values.selling,
        costValue: values.cost
      }))
    };
  };

  const exportReport = () => {
    if (!reportData) return;

    const reportContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([reportContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_report_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const renderReport = () => {
    if (!reportData) return null;

    switch (reportType) {
      case "stock_summary":
        if (!reportData.summary || !reportData.categoryChart) return null;
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{reportData.summary.totalProducts || 0}</p>
                  <p className="text-sm text-gray-600">Total Products</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{reportData.summary.inStockProducts || 0}</p>
                  <p className="text-sm text-gray-600">In Stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 mx-auto mb-2 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-600">{reportData.summary.outOfStockProducts || 0}</p>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 mx-auto mb-2 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{reportData.summary.lowStockProducts || 0}</p>
                  <p className="text-sm text-gray-600">Low Stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold">{reportData.summary.totalBatches || 0}</p>
                  <p className="text-sm text-gray-600">Active Batches</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Products by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.categoryChart && reportData.categoryChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.categoryChart}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {reportData.categoryChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8">No category data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "low_stock":
        if (!reportData.products) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Low Stock Products ({reportData.products.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!reportData.products || reportData.products.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No low stock products found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-2 text-left">Product</th>
                        <th className="border border-gray-200 p-2 text-left">Category</th>
                        <th className="border border-gray-200 p-2 text-left">Current Stock</th>
                        <th className="border border-gray-200 p-2 text-left">Reorder Point</th>
                        <th className="border border-gray-200 p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.products.map((product, index) => (
                        <tr key={index}>
                          <td className="border border-gray-200 p-2">{product.name || 'N/A'}</td>
                          <td className="border border-gray-200 p-2">{product.category || 'N/A'}</td>
                          <td className="border border-gray-200 p-2">
                            {product.currentStock || 0} {product.unit || 'units'}
                          </td>
                          <td className="border border-gray-200 p-2">
                            {product.reorderPoint || 0} {product.unit || 'units'}
                          </td>
                          <td className="border border-gray-200 p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              (product.currentStock || 0) === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {(product.currentStock || 0) === 0 ? 'Out of Stock' : 'Low Stock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "expiry_report":
        if (!reportData.summary || !reportData.expiringBatches) return null;
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <p className="text-2xl font-bold text-red-600">{reportData.summary.expired || 0}</p>
                  <p className="text-sm text-gray-600">Expired Batches</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-2xl font-bold text-yellow-600">{reportData.summary.expiringSoon || 0}</p>
                  <p className="text-sm text-gray-600">Expiring in 30 Days</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Batches Expiring Soon</CardTitle>
              </CardHeader>
              <CardContent>
                {!reportData.expiringBatches || reportData.expiringBatches.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No batches expiring soon</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 p-2 text-left">Product</th>
                          <th className="border border-gray-200 p-2 text-left">Batch ID</th>
                          <th className="border border-gray-200 p-2 text-left">Expiry Date</th>
                          <th className="border border-gray-200 p-2 text-left">Days to Expiry</th>
                          <th className="border border-gray-200 p-2 text-left">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.expiringBatches.map((batch, index) => (
                          <tr key={index}>
                            <td className="border border-gray-200 p-2">{batch.productName || 'N/A'}</td>
                            <td className="border border-gray-200 p-2">{batch.batchId || 'N/A'}</td>
                            <td className="border border-gray-200 p-2">
                              {batch.expiryDate ? format(new Date(batch.expiryDate), 'PPP') : 'N/A'}
                            </td>
                            <td className="border border-gray-200 p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                (batch.daysToExpiry || 0) <= 7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {batch.daysToExpiry || 0} days
                              </span>
                            </td>
                            <td className="border border-gray-200 p-2">
                              {batch.quantity || 0} {batch.unit || 'units'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "category_analysis":
        if (!reportData.categories) return null;
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {!reportData.categories || reportData.categories.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No category data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 p-2 text-left">Category</th>
                          <th className="border border-gray-200 p-2 text-left">Product Count</th>
                          <th className="border border-gray-200 p-2 text-left">Total Stock</th>
                          <th className="border border-gray-200 p-2 text-left">Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.categories.map((category, index) => (
                          <tr key={index}>
                            <td className="border border-gray-200 p-2 font-medium">{category.name || 'N/A'}</td>
                            <td className="border border-gray-200 p-2">{category.productCount || 0}</td>
                            <td className="border border-gray-200 p-2">{category.totalStock || 0}</td>
                            <td className="border border-gray-200 p-2">₹{(category.totalValue || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Value Distribution by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.categories && reportData.categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.categories}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Total Value']} />
                      <Bar dataKey="totalValue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8">No category data available for chart</p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "stock_movement":
        if (!reportData.dailyData) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {!reportData.dailyData || reportData.dailyData.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No stock movement data available for selected period</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={reportData.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="sales" fill="#8884d8" name="Sales Count" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#ff7300" name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        );

      case "valuation":
        if (!reportData.summary || !reportData.categoryValuation) return null;
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">
                    ₹{(reportData.summary.totalInventoryValue || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Inventory Value (Selling)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{(reportData.summary.totalCostValue || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Cost Value</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold text-purple-600">
                    ₹{(reportData.summary.potentialProfit || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Potential Profit</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Valuation by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.categoryValuation && reportData.categoryValuation.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.categoryValuation}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                      <Bar dataKey="sellingValue" fill="#8884d8" name="Selling Value" />
                      <Bar dataKey="costValue" fill="#82ca9d" name="Cost Value" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8">No valuation data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Select a report type to view data</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Reports</h2>
          <p className="text-gray-600">Comprehensive inventory analysis and insights</p>
        </div>
        <Button onClick={exportReport} variant="outline" disabled={!reportData}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            {reportTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(reportType === "stock_movement") && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-64 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Pick a date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: subDays(new Date(), 7),
                        to: new Date()
                      })}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: subDays(new Date(), 30),
                        to: new Date()
                      })}
                    >
                      Last 30 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: subMonths(new Date(), 3),
                        to: new Date()
                      })}
                    >
                      Last 3 months
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: subMonths(new Date(), 6),
                        to: new Date()
                      })}
                    >
                      Last 6 months
                    </Button>
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Generating report...</p>
        </div>
      ) : (
        <div>
          {renderReport()}
        </div>
      )}
    </div>
  );
}
