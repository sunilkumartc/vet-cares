
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, DollarSign, ShoppingCart, Users, Download, RefreshCw, Printer } from "lucide-react";
import { TenantSale, TenantProduct, TenantClient } from "@/api/tenant-entities";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SalesReports() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [reportType, setReportType] = useState("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesData, productData, clientData] = await Promise.all([
        TenantSale.list('-sale_date'),
        TenantProduct.list(),
        TenantClient.list()
      ]);
      setSales(salesData);
      setProducts(productData);
      setClients(clientData);
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSales = () => {
    return sales.filter(sale => {
      const saleDate = parseISO(sale.sale_date);
      return isWithinInterval(saleDate, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      });
    });
  };

  const generateOverviewData = () => {
    const filtered = getFilteredSales();
    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const uniqueCustomers = new Set(filtered.map(sale => sale.client_id).filter(Boolean)).size;

    // Daily sales trend
    const salesByDay = {};
    filtered.forEach(sale => {
      const day = format(parseISO(sale.sale_date), 'MMM dd');
      if (!salesByDay[day]) {
        salesByDay[day] = { date: day, sales: 0, revenue: 0 };
      }
      salesByDay[day].sales += 1;
      salesByDay[day].revenue += sale.total_amount || 0;
    });

    const dailyTrend = Object.values(salesByDay).sort((a, b) =>
      new Date(a.date + ', 2024') - new Date(b.date + ', 2024') // Appending year for reliable date parsing
    );

    // Top products
    const productSales = {};
    filtered.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const product = products.find(p => p.id === item.product_id);
          const productName = product?.name || 'Unknown Product';
          if (!productSales[productName]) {
            productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity || 0;
          productSales[productName].revenue += item.total_price || 0;
        });
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      summary: {
        totalSales,
        totalRevenue,
        averageOrderValue,
        uniqueCustomers
      },
      dailyTrend,
      topProducts
    };
  };

  const generateProductData = () => {
    const filtered = getFilteredSales();
    const productStats = {};

    filtered.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const product = products.find(p => p.id === item.product_id);
          const productName = product?.name || 'Unknown Product';
          if (!productStats[productName]) {
            productStats[productName] = {
              name: productName,
              category: product?.category || 'Unknown',
              unitsSold: 0,
              revenue: 0,
              averagePrice: 0
            };
          }
          productStats[productName].unitsSold += item.quantity || 0;
          productStats[productName].revenue += item.total_price || 0;
        });
      }
    });

    // Calculate average price
    Object.values(productStats).forEach(stat => {
      stat.averagePrice = stat.unitsSold > 0 ? stat.revenue / stat.unitsSold : 0;
    });

    return Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
  };

  const setQuickDateRange = (type) => {
    const now = new Date();
    switch (type) {
      case 'today':
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'week':
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      default:
        break;
    }
  };

  const overviewData = generateOverviewData();
  const productData = generateProductData();

  const reportData = reportType === 'overview' ? overviewData : (reportType === 'products' ? productData : null);

  const exportReport = () => {
    if (!reportData) return;

    const exportContent = {
        reportType: reportType,
        dateRange: {
            from: dateRange.from,
            to: dateRange.to
        },
        data: reportData
    }

    const reportContent = JSON.stringify(exportContent, null, 2);
    const blob = new Blob([reportContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Report - ${reportType}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .summary-card { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
            .summary-card h3 { margin: 0; font-size: 2em; color: #0066cc; }
            .summary-card p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>Dr. Ravi TenantPet Portal - Sales Report</h1>
          <p><strong>Report Type:</strong> ${reportType === 'overview' ? 'Overview' : reportType === 'products' ? 'Product Analysis' : 'Customer Insights'}</p>
          <p><strong>Date Range:</strong> ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}</p>
          <p><strong>Generated:</strong> ${format(new Date(), 'PPP')}</p>

          ${reportType === 'overview' && overviewData.summary ? `
            <div class="summary-section">
              <div class="summary-card">
                <h3>${overviewData.summary.totalSales}</h3>
                <p>Total Sales</p>
              </div>
              <div class="summary-card">
                <h3>₹${overviewData.summary.totalRevenue.toFixed(0)}</h3>
                <p>Total Revenue</p>
              </div>
              <div class="summary-card">
                <h3>₹${overviewData.summary.averageOrderValue.toFixed(0)}</h3>
                <p>Avg Order Value</p>
              </div>
              <div class="summary-card">
                <h3>${overviewData.summary.uniqueCustomers}</h3>
                <p>Unique Customers</p>
              </div>
            </div>

            ${overviewData.topProducts && overviewData.topProducts.length > 0 ? `
              <h2>Top Products by Revenue</h2>
              <table>
                <thead>
                  <tr><th>Rank</th><th>Product</th><th>Units Sold</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  ${overviewData.topProducts.map((product, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${product.name}</td>
                      <td>${product.quantity}</td>
                      <td>₹${product.revenue.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          ` : ''}

          ${reportType === 'products' && productData.length > 0 ? `
            <h2>Product Performance</h2>
            <table>
              <thead>
                <tr><th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th><th>Avg Price</th></tr>
              </thead>
              <tbody>
                ${productData.map(product => `
                  <tr>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${product.unitsSold}</td>
                    <td>₹${product.revenue.toFixed(2)}</td>
                    <td>₹${product.averagePrice.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()">Print This Report</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading sales data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Reports</h2>
          <p className="text-gray-600">Analyze your sales performance and trends</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={printReport} variant="outline" disabled={!reportData}>
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
          <Button onClick={exportReport} variant="outline" disabled={!reportData}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button onClick={loadData} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('today')}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('week')}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('month')}>
                This Month
              </Button>
            </div>

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">From Date</h4>
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">To Date</h4>
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Product Analysis</TabsTrigger>
          <TabsTrigger value="customers">Customer Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{overviewData.summary.totalSales}</p>
                    <p className="text-sm text-gray-600">Total Sales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₹{overviewData.summary.totalRevenue.toFixed(0)}</p>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₹{overviewData.summary.averageOrderValue.toFixed(0)}</p>
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{overviewData.summary.uniqueCustomers}</p>
                    <p className="text-sm text-gray-600">Unique Customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Sales Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {overviewData.dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={overviewData.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#8884d8" name="Sales Count" /> {/* Changed Line to Bar here for sales count as per original logic */}
                    <Line type="monotone" dataKey="revenue" stroke="#82ca9d" name="Revenue" yAxisId="right" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8">No sales data for the selected period</p>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {overviewData.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {overviewData.topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.quantity} units sold</p>
                        </div>
                      </div>
                      <p className="font-semibold text-green-600">₹{product.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No product sales data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {productData.length > 0 ? (
                <div className="space-y-4">
                  {productData.map((product, index) => (
                    <div key={product.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{product.category}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold">{product.unitsSold}</p>
                          <p className="text-xs text-gray-500">Units Sold</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">₹{product.revenue.toFixed(0)}</p>
                          <p className="text-xs text-gray-500">Revenue</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">₹{product.averagePrice.toFixed(0)}</p>
                          <p className="text-xs text-gray-500">Avg Price</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No product data available for the selected period</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">Customer analysis features coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
