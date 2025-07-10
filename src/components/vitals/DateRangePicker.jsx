import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, subMonths, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { cn } from '../../lib/utils';

export default function DateRangePicker({ 
  dateRange = { from: null, to: null }, 
  onDateRangeChange, 
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const quickRanges = [
    {
      label: 'Last 7 days',
      value: {
        from: startOfDay(subWeeks(new Date(), 1)),
        to: endOfDay(new Date())
      }
    },
    {
      label: 'Last 30 days',
      value: {
        from: startOfDay(subWeeks(new Date(), 4)),
        to: endOfDay(new Date())
      }
    },
    {
      label: 'Last 3 months',
      value: {
        from: startOfDay(subMonths(new Date(), 3)),
        to: endOfDay(new Date())
      }
    },
    {
      label: 'Last 6 months',
      value: {
        from: startOfDay(subMonths(new Date(), 6)),
        to: endOfDay(new Date())
      }
    },
    {
      label: 'Last year',
      value: {
        from: startOfDay(subMonths(new Date(), 12)),
        to: endOfDay(new Date())
      }
    }
  ];

  const handleQuickRangeSelect = (range) => {
    onDateRangeChange(range);
    setIsOpen(false);
  };

  const handleDateSelect = (date) => {
    if (!dateRange?.from || (dateRange?.from && dateRange?.to)) {
      // Start new range
      onDateRangeChange({
        from: startOfDay(date),
        to: null
      });
    } else {
      // Complete the range
      const from = dateRange.from;
      const to = endOfDay(date);
      
      // Ensure from is before to
      if (from > to) {
        onDateRangeChange({
          from: startOfDay(date),
          to: endOfDay(from)
        });
      } else {
        onDateRangeChange({
          from,
          to
        });
      }
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) {
      return 'Select date range';
    }
    
    if (!dateRange?.to) {
      return `${format(dateRange.from, 'MMM d, yyyy')} - Select end date`;
    }
    
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !dateRange?.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-3">
              <h4 className="font-medium text-sm mb-2">Quick Ranges</h4>
              <div className="space-y-1">
                {quickRanges.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handleQuickRangeSelect(range.value)}
                    className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3">
              <Calendar
                mode="range"
                selected={{
                  from: dateRange?.from,
                  to: dateRange?.to
                }}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                disabled={(date) => date > new Date()}
                className="rounded-md border-0"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {dateRange?.from && dateRange?.to && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDateRangeChange({ from: null, to: null })}
          className="text-gray-500 hover:text-gray-700"
        >
          Clear
        </Button>
      )}
    </div>
  );
} 