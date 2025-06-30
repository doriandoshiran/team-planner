import React, { useState, useEffect } from 'react';
import { Calendar, Home, Building, Users, ArrowRightLeft, Grid, List } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ExchangeModal from './ExchangeModal';
import MonthView from './MonthView';

const WorkSchedule = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [schedule, setSchedule] = useState({});
  const [exchangeRequests, setExchangeRequests] = useState([]);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'

  // Generate week dates
  const getWeekDates = (date) => {
    const week = [];
    const startDate = new Date(date);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      week.push(currentDate);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeek);

  useEffect(() => {
    // Mock schedule data
    setSchedule({
      '2025-06-30': 'office',
      '2025-07-01': 'remote',
      '2025-07-02': 'office',
      '2025-07-03': 'remote',
      '2025-07-04': 'office',
      '2025-07-05': 'remote',
      '2025-07-07': 'office',
      '2025-07-08': 'remote',
      '2025-07-09': 'office',
      '2025-07-10': 'remote',
      '2025-07-11': 'office',
      '2025-07-12': 'remote',
      '2025-07-14': 'office',
      '2025-07-15': 'remote',
      '2025-07-16': 'office',
      '2025-07-17': 'remote',
      '2025-07-18': 'office',
      '2025-07-19': 'remote'
    });

    setExchangeRequests([
      {
        id: 1,
        from: 'John Doe',
        fromEmail: 'john@company.com',
        date: '2025-07-02',
        currentLocation: 'office',
        requestedLocation: 'remote',
        reason: 'Doctor appointment',
        status: 'pending'
      }
    ]);
  }, []);

  const getLocationIcon = (location) => {
    switch (location) {
      case 'office':
        return <Building className="h-4 w-4" />;
      case 'remote':
        return <Home className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
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

  const handleRequestExchange = (date) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setShowExchangeModal(true);
  };

  const handleDateClick = (date) => {
    handleRequestExchange(date);
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Schedule</h1>
          <p className="text-gray-600">Manage your office and remote work schedule</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4 inline mr-1" />
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="h-4 w-4 inline mr-1" />
              Month
            </button>
          </div>

          {exchangeRequests.filter(req => req.status === 'pending').length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  {exchangeRequests.filter(req => req.status === 'pending').length} pending exchange request(s)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conditional View Rendering */}
      {viewMode === 'month' ? (
        <MonthView
          schedule={schedule}
          onDateClick={handleDateClick}
          exchangeRequests={exchangeRequests}
        />
      ) : (
        <>
          {/* Week Navigation */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                const prevWeek = new Date(currentWeek);
                prevWeek.setDate(prevWeek.getDate() - 7);
                setCurrentWeek(prevWeek);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Previous Week
            </button>
            
            <h2 className="text-lg font-semibold">
              {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
            </h2>
            
            <button
              onClick={() => {
                const nextWeek = new Date(currentWeek);
                nextWeek.setDate(nextWeek.getDate() + 7);
                setCurrentWeek(nextWeek);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Next Week →
            </button>
          </div>

          {/* Week Schedule Grid */}
          <div className="grid grid-cols-7 gap-4 mb-8">
            {weekDates.map((date, index) => {
              const dateStr = formatDate(date);
              const location = schedule[dateStr];
              const isToday = formatDate(new Date()) === dateStr;
              const weekend = isWeekend(date);
              
              return (
                <div
                  key={index}
                  className={`bg-white border rounded-lg p-4 ${
                    isToday ? 'ring-2 ring-blue-500' : 'border-gray-200'
                  } ${weekend ? 'bg-gray-50' : ''}`}
                >
                  <div className="text-center mb-3">
                    <div className="font-semibold text-gray-900">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {weekend ? (
                    <div className="text-center text-gray-500 text-sm">
                      Weekend
                    </div>
                  ) : location ? (
                    <div className="space-y-2">
                      <div className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-full border ${getLocationColor(location)}`}>
                        {getLocationIcon(location)}
                        <span className="text-sm font-medium capitalize">{location}</span>
                      </div>
                      
                      <button
                        onClick={() => handleRequestExchange(dateStr)}
                        className="w-full text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center space-x-1"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>Request Exchange</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 text-sm">
                      Not scheduled
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Exchange Requests Section */}
      {exchangeRequests.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <ArrowRightLeft className="h-5 w-5" />
            <span>Exchange Requests</span>
          </h3>
          
          <div className="space-y-4">
            {exchangeRequests.map(request => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{request.from}</div>
                    <div className="text-sm text-gray-600">{request.fromEmail}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Date: {new Date(request.date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Wants to change: <span className="font-medium">{request.currentLocation}</span> → <span className="font-medium">{request.requestedLocation}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Reason: {request.reason}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {request.status === 'pending' && (
                      <>
                        <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                          Accept
                        </button>
                        <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                          Decline
                        </button>
                      </>
                    )}
                    {request.status !== 'pending' && (
                      <span className={`px-3 py-1 rounded text-sm ${
                        request.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ExchangeModal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
        date={selectedDate}
        currentLocation={selectedDate ? schedule[selectedDate] : null}
      />
    </div>
  );
};

export default WorkSchedule;
