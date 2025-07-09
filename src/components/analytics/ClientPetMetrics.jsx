
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PawPrint, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";

export default function ClientPetMetrics({ clients, pets, dateRange }) {
  const calculateMetrics = () => {
    const today = new Date();
    // Use dateRange from props, with fallbacks for default period
    const startDate = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(subDays(today, 30)); // Default to 30 days ago
    const endDate = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(today); // Default to today

    // TenantClient metrics
    const totalClients = clients.length;
    const newClientsInPeriod = clients.filter(client =>
      isWithinInterval(parseISO(client.created_date), { start: startDate, end: endDate })
    ).length;

    // TenantPet metrics
    const totalPets = pets.length;
    const newPetsInPeriod = pets.filter(pet =>
      isWithinInterval(parseISO(pet.created_date), { start: startDate, end: endDate })
    ).length;

    // Species breakdown
    const speciesCount = {};
    pets.forEach(pet => {
      speciesCount[pet.species] = (speciesCount[pet.species] || 0) + 1;
    });

    const speciesData = Object.entries(speciesCount).map(([species, count]) => ({
      species: species.charAt(0).toUpperCase() + species.slice(1),
      count
    }));

    // TenantClient registration trend (last 7 days)
    // This trend calculation is independent of the selectedPeriod for the summary stats,
    // and always shows the last 7 days as per original spec.
    const clientTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const newClients = clients.filter(client =>
        isWithinInterval(parseISO(client.created_date), { start: dayStart, end: dayEnd })
      ).length;

      clientTrend.push({
        date: format(date, 'MMM dd'),
        clients: newClients
      });
    }

    return {
      totalClients,
      newClientsInPeriod,
      totalPets,
      newPetsInPeriod,
      speciesData,
      clientTrend
    };
  };

  const metrics = calculateMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Client & Pet Base
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Registration Trend */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">New Client Registrations (Last 7 Days)</h4>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={metrics.clientTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="clients" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Species Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Pet Species Distribution</h4>
            <div className="space-y-2">
              {metrics.speciesData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.species}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${(item.count / metrics.totalPets) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-800 w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
