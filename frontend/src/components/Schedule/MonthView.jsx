import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Building, Home, ArrowRightLeft } from 'lucide-react';

const MonthView = ({ schedule, onDateClick, exchangeRequests, onScheduleUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fixed to start week from Monday
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Fixed Monday calculation - convert Sunday=0 to Sunday=6, Monday=0
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = (startingDayOfWeek + 6) % 7; // Monday = 0

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getLocationIcon = (location) => {
    switch (location) {
      case 'office':
        return <Building className="h-3 w-3" />;
      case 'remote':
        return <Home className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getLocationColor = (location) => {
    switch (location) {
      case 'office':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'remote':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const hasExchangeRequest = (date) => {
    const dateStr = formatDate(date);
    return exchangeRequests.some(req => req.date === dateStr && req.status === 'pending');
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fixed week days starting with Monday
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            const prevMonth = new Date(currentDate);
            prevMonth.setMonth(prevMonth.getMonth() - 1);
            setCurrentDate(prevMonth);
          }}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <button
          onClick={() => {
            const nextMonth = new Date(currentDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            setCurrentDate(nextMonth);
          }}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers - Starting with Monday */}
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="p-2 h-24"></div>;
          }

          const dateStr = formatDate(date);
          const location = schedule[dateStr];
          const weekend = isWeekend(date);
          const today = isToday(date);
          const hasExchange = hasExchangeRequest(date);

          return (
            <div
              key={index}
              onClick={() => !weekend && onDateClick(date)}
              className={`p-2 h-24 border border-gray-200 cursor-pointer hover:bg-gray-50 relative ${
                today ? 'ring-2 ring-blue-500' : ''
              } ${weekend ? 'bg-gray-50 cursor-not-allowed' : ''} ${
                location === 'office' ? 'bg-blue-100 hover:bg-blue-200' : 
                location === 'remote' ? 'bg-green-100 hover:bg-green-200' : ''
              }`}
            >
              <div className="flex justify-between items-start h-full">
                <span className={`text-sm ${today ? 'font-bold text-blue-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </span>
                
                {hasExchange && (
                  <ArrowRightLeft className="h-3 w-3 text-orange-500" />
                )}
              </div>
              
              {!weekend && location && (
                <div className="absolute bottom-1 left-1 right-1">
                  <div className={`text-center text-xs font-medium py-1 rounded ${
                    location === 'office' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-green-600 text-white'
                  }`}>
                    {getLocationIcon(location)}
                    <span className="ml-1 capitalize">{location}</span>
                  </div>
                </div>
              )}
              
              {weekend && (
                <div className="absolute bottom-1 left-1 right-1 text-center text-xs text-gray-400">
                  Weekend
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
            <Building className="h-2 w-2 text-white" />
          </div>
          <span>Office</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center">
            <Home className="h-2 w-2 text-white" />
          </div>
          <span>Remote</span>
        </div>
        <div className="flex items-center space-x-2">
          <ArrowRightLeft className="h-4 w-4 text-orange-500" />
          <span>Exchange Request</span>
        </div>
      </div>
    </div>
  );
};

export default MonthView;
