
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const colorSchemes = {
  blue: {
    bg: "bg-blue-500",
    light: "bg-blue-50",
    text: "text-blue-600"
  },
  green: {
    bg: "bg-green-500", 
    light: "bg-green-50",
    text: "text-green-600"
  },
  purple: {
    bg: "bg-purple-500",
    light: "bg-purple-50", 
    text: "text-purple-600"
  },
  orange: {
    bg: "bg-orange-500",
    light: "bg-orange-50",
    text: "text-orange-600"
  },
  red: {
    bg: "bg-red-500",
    light: "bg-red-50",
    text: "text-red-600"
  }
};

export default function StatsCard({ title, value, icon: Icon, color, loading }) {
  const colors = colorSchemes[color] || colorSchemes.blue;

  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className={`absolute top-0 right-0 w-32 h-32 ${colors.light} rounded-full opacity-20 transform translate-x-8 -translate-y-8`} />
      <CardHeader className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${colors.light}`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
