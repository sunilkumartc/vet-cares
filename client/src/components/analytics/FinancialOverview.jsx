import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, eachDayOfInterval } from "date-fns";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function FinancialOverview({ invoices, dateRange }) {
  const calculateFinancialMetrics = () => {
    const today = new Date();
    // Default to last 30 days if dateRange is not provided or incomplete
    const startDate = dateRange?.from || startOfDay(subDays(today, 30));
    const endDate = dateRange?.to || endOfDay(today);

    const periodInvoices = invoices.filter(inv => {
      if (!inv.invoice_date) return false;
      try {
        return isWithinInterval(parseISO(inv.invoice_date), { start: startDate, end: endDate });
      } catch (error) {
        console.warn('Invalid invoice_date in FinancialOverview:', inv.invoice_date);
        return false;
      }
    });

    const totalRevenue = periodInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const outstandingPayments = periodInvoices
      .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const overduePayments = periodInvoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    // Revenue by service type
    const serviceRevenue = {};
    periodInvoices
      .filter(inv => inv.status === 'paid')
      .forEach(inv => {
        inv.items?.forEach(item => {
          const service = item.service || 'Other Services';
          serviceRevenue[service] = (serviceRevenue[service] || 0) + (item.total || 0);
        });
      });

    const revenueByService = Object.entries(serviceRevenue)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value); // Sort by revenue descending

    // Daily revenue trend for the selected period
    const dailyRevenue = [];
    const intervalDays = eachDayOfInterval({ start: startDate, end: endDate });
    intervalDays.forEach(date => {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const dayRevenue = invoices
            .filter(inv => {
              if (!inv.invoice_date || inv.status !== 'paid') return false;
              try {
                return isWithinInterval(parseISO(inv.invoice_date), { start: dayStart, end: dayEnd });
              } catch (error) {
                console.warn('Invalid invoice_date in daily revenue calculation:', inv.invoice_date);
                return false;
              }
            })
            .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        
        dailyRevenue.push({
            date: format(date, 'MMM dd'),
            revenue: dayRevenue
        });
    });

    return {
      totalRevenue,
      outstandingPayments,
      overduePayments,
      revenueByService,
      dailyRevenue
    };
  };

  const metrics = calculateFinancialMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Financial Overview
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700">₹{metrics.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">Outstanding</p>
            <p className="text-2xl font-bold text-yellow-700">₹{metrics.outstandingPayments.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Overdue</p>
            <p className="text-2xl font-bold text-red-700">₹{metrics.overduePayments.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          {/* Revenue Trend */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">Revenue Trend for Period</h4>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={metrics.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Service - Scrollable Table */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">Revenue by Service Type</h4>
            {metrics.revenueByService.length > 0 ? (
              <div className="h-[250px] overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Service</th>
                      <th className="text-right p-3 font-medium text-gray-600">Revenue</th>
                      <th className="text-right p-3 font-medium text-gray-600">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.revenueByService.map((service, index) => {
                      const percentage = ((service.value / metrics.totalRevenue) * 100).toFixed(1);
                      return (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{service.name}</td>
                          <td className="p-3 text-right font-semibold text-green-600">
                            ₹{service.value.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-gray-500">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500 border rounded-lg">
                    No service revenue in this period.
                </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}