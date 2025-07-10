import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Brush
} from 'recharts';
import { format, parseISO, subMonths } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';

const formatValue = (value, metric, unitLabel) => {
  if (metric === 'temp') {
    // Convert Celsius to Fahrenheit for display
    const fahrenheit = (value * 9/5) + 32;
    return `${fahrenheit.toFixed(1)}°F`;
  }
  if (metric === 'weight') {
    return `${value.toFixed(1)} kg`;
  }
  if (metric === 'hr') {
    return `${Math.round(value)} bpm`;
  }
  if (metric === 'bp_sys' || metric === 'bp_dia') {
    return `${Math.round(value)} mmHg`;
  }
  return `${value.toFixed(1)} ${unitLabel}`;
};

const getMetricRange = (metric) => {
  switch (metric) {
    case 'weight':
      return { min: 0, max: 100 };
    case 'temp':
      return { min: 35, max: 42 }; // Celsius range
    case 'hr':
      return { min: 40, max: 200 };
    case 'bp_sys':
      return { min: 80, max: 200 };
    case 'bp_dia':
      return { min: 40, max: 120 };
    default:
      return { min: 0, max: 100 };
  }
};

const CustomTooltip = ({ active, payload, label, metric }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    // Safely format the date
    let formattedDate = label;
    if (data.t) {
      try {
        formattedDate = format(parseISO(data.t), 'MMM d, yyyy');
      } catch (error) {
        console.warn('Invalid date format in tooltip:', data.t);
        formattedDate = label;
      }
    }
    
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">
          {formattedDate}
        </p>
        <p className="text-sm text-gray-600">
          Value: {formatValue(data.v, metric, '')}
        </p>
        {data.min !== undefined && data.max !== undefined && (
          <p className="text-xs text-gray-500">
            Range: {formatValue(data.min, metric, '')} - {formatValue(data.max, metric, '')}
          </p>
        )}
        {data.count !== undefined && (
          <p className="text-xs text-gray-500">
            Readings: {data.count}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const calculateChange = (data) => {
  if (data.length < 2) {
    return { change: 0, percentage: 0, trend: 'stable' };
  }
  
  const latest = data[data.length - 1].v;
  const previous = data[data.length - 2].v;
  const change = latest - previous;
  const percentage = previous !== 0 ? (change / previous) * 100 : 0;
  
  let trend = 'stable';
  if (Math.abs(percentage) > 1) { // 1% threshold
    trend = percentage > 0 ? 'up' : 'down';
  }
  
  return { change, percentage, trend };
};

export default function VitalTrendChart({ 
  metric, 
  unitLabel, 
  color, 
  petId, 
  title,
  className = '',
  dateRange: externalDateRange,
  resolution = 'day'
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use external dateRange if provided, otherwise use internal state
  const [internalDateRange, setInternalDateRange] = useState({
    from: subMonths(new Date(), 6).toISOString(),
    to: new Date().toISOString()
  });
  
  const dateRange = externalDateRange || internalDateRange;

  useEffect(() => {
    fetchVitalData();
  }, [petId, metric, dateRange, resolution]);

  const fetchVitalData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        metric,
        from: dateRange.from,
        to: dateRange.to,
        resolution
      });
      
      const response = await fetch(`/api/pets/${petId}/vitals?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch vital data');
      }
      
      setData(result.data || []);
    } catch (err) {
      console.error('Error fetching vital data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const { change, percentage, trend } = calculateChange(data);
  const latestValue = data.length > 0 ? data[data.length - 1].v : null;
  const { min: rangeMin, max: rangeMax } = getMetricRange(metric);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-red-500">
            <p>Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(point => {
    let formattedDate = 'Unknown';
    if (point.t) {
      try {
        formattedDate = format(parseISO(point.t), 'MMM d');
      } catch (error) {
        console.warn('Invalid date format in chart data:', point.t);
        formattedDate = 'Invalid Date';
      }
    }
    
    return {
      ...point,
      date: formattedDate,
      value: point.v
    };
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {latestValue && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" style={{ color }}>
                {formatValue(latestValue, metric, unitLabel)}
              </span>
              {trend !== 'stable' && (
                <Badge 
                  variant={trend === 'up' ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  {trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(percentage).toFixed(1)}%
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              domain={[rangeMin, rangeMax]}
              tickFormatter={(value) => formatValue(value, metric, unitLabel)}
            />
            <Tooltip 
              content={<CustomTooltip metric={metric} />}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              name={title}
            />
            <Brush 
              dataKey="date" 
              height={30} 
              stroke={color}
              fill="rgba(0,0,0,0.05)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 