import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TimelineEvent({ date, icon: Icon, color, title, children, badgeText }) {
  const colorClasses = {
    blue: 'border-blue-500 bg-blue-50',
    green: 'border-green-500 bg-green-50',
    purple: 'border-purple-500 bg-purple-50',
    red: 'border-red-500 bg-red-50',
    orange: 'border-orange-500 bg-orange-50',
    gray: 'border-gray-500 bg-gray-50',
    yellow: 'border-yellow-500 bg-yellow-50',
    cyan: 'border-cyan-500 bg-cyan-50',
  };

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
    gray: 'text-gray-600',
    yellow: 'text-yellow-600',
    cyan: 'text-cyan-600',
  };

  return (
    <div className="relative pl-8">
      {/* Timeline Line and Icon */}
      <div className="absolute left-0 top-0 flex flex-col items-center h-full">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className={`w-5 h-5 ${iconColorClasses[color]}`} />
        </div>
        <div className="w-px h-full bg-gray-200"></div>
      </div>
      
      {/* Content */}
      <div className="ml-6 pb-8">
        <div className="flex items-center gap-4 mb-2">
          <p className="font-semibold text-lg text-gray-900">{title}</p>
          {badgeText && (
            <Badge variant={badgeText === 'URGENT' ? 'destructive' : 'outline'}>
              {badgeText}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-3">
          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
        </p>
        <Card className="bg-white">
          <CardContent className="p-4">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}