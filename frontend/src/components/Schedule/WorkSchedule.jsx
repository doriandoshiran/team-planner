import React, { useState, useEffect } from 'react';
import { Calendar, Home, Building, Users, ChevronLeft, ChevronRight, User, Plane, Heart, Stethoscope, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ExchangeModal from './ExchangeModal';
import TeamScheduleView from './TeamScheduleView';
import api from '../../services/api';

const WorkSchedule = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState({});
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState('my-schedule');

  useEffect(() => {
    if (activeTab === 'my-schedule' && user) {
      fetchSchedule();
    }
  }, [user, activeTab]);

  const fetchSchedule = async () => {
    try {
      console.log('Fetching schedule for user:', user?.id);
      
      // Load from database via API
      const response = await api.get('/schedules/my-schedule');
      setSchedule(response.data);
      console.log('Schedule loaded from database:', response.data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setSchedule({});
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = (startingDayOfWeek + 6) % 7;

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getLocationIcon = (location) => {
    if (typeof location === 'object' && location.type === 'dayoff') {
      switch (location.reason) {
        case 'illness': return <Stethoscope className="h-3 w-3" />;
        case 'family': return <Heart className="h-3 w-3" />;
        default: return <HelpCircle className="h-3 w-3" />;
      }
    }
    
    switch (location) {
      case 'office': return <Building className="h-3 w-3" />;
      case 'remote': return <Home className="h-3 w-3" />;
      case 'vacation': return <Plane className="h-3 w-3" />;
      case 'dayoff': return <HelpCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getLocationColor = (location) => {
    if (!location) return 'bg-gray-100 text-gray-600';
    
    const locationType = typeof location === 'object' ? location.type : location;
    switch (locationType) {
      case 'office': return 'bg-blue-600 text-white';
      case 'remote': return 'bg-green-600 text-white';
      case 'vacation': return 'bg-purple-600 text-white';
      case 'dayoff': return 'bg-orange-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getLocationLabel = (location) => {
    if (!location) return '';
    
    if (typeof location === 'object' && location.type === 'dayoff') {
      return `Day-off (${location.reason})`;
    }
    return location ? location.charAt(0).toUpperCase() + location.slice(1) : '';
  };

  const handleDateClick = (date) => {
    const dateStr = formatDate(date);
    const currentLocation = schedule[dateStr];
    
    console.log('Date clicked:', dateStr, 'Location:', currentLocation);
    
    if (currentLocation === 'office' || currentLocation === 'remote') {
      setSelectedDate(date);
      setShowExchangeModal(true);
    }
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const getDateRangeLabel = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Schedule</h1>
          <p className="text-gray-600">View your work schedule and team schedules</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('my-schedule')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'my-schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>My Schedule</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('team-schedule')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'team-schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Team Schedules</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'my-schedule' ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Schedule for {user?.name}</h3>
            <div className="text-sm text-gray-600">
              Click on work days (office/remote) to request exchanges
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <h2 className="text-xl font-semibold">
              {getDateRangeLabel()}
            </h2>
            
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {days.map((date, index) => {
              if (!date) {
                return <div key={index} className="p-2 h-20"></div>;
              }

              const dateStr = formatDate(date);
              const weekend = isWeekend(date);
              const today = isToday(date);
              const location = schedule[dateStr];
              const canRequestExchange = location === 'office' || location === 'remote';

              let bgColor = '';
              if (location) {
                const locationType = typeof location === 'object' ? location.type : location;
                switch (locationType) {
                  case 'office': bgColor = 'bg-blue-100 hover:bg-blue-200'; break;
                  case 'remote': bgColor = 'bg-green-100 hover:bg-green-200'; break;
                  case 'vacation': bgColor = 'bg-purple-100 hover:bg-purple-200'; break;
                  case 'dayoff': bgColor = 'bg-orange-100 hover:bg-orange-200'; break;
                }
              }

              return (
                <div
                  key={index}
                  onClick={() => canRequestExchange && handleDateClick(date)}
                  className={`p-2 h-20 border border-gray-200 relative transition-all ${
                    today ? 'ring-2 ring-blue-500' : ''
                  } ${weekend ? 'bg-gray-100' : 'hover:bg-gray-50'} ${bgColor} ${
                    canRequestExchange ? 'cursor-pointer' : ''
                  }`}
                  title={canRequestExchange ? 'Click to request exchange' : ''}
                >
                  <div className="flex justify-between items-start h-full">
                    <span className={`text-sm ${today ? 'font-bold text-blue-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {weekend && !location && (
                    <div className="absolute bottom-1 left-1 right-1">
                      <div className="text-center text-xs text-gray-500 py-1">
                        Weekend
                      </div>
                    </div>
                  )}

                  {location && (
                    <div className="absolute bottom-1 left-1 right-1">
                      <div className={`text-center text-xs font-medium py-1 rounded flex items-center justify-center ${getLocationColor(location)}`}>
                        {getLocationIcon(location)}
                        <span className="ml-1">{getLocationLabel(location)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-6 text-sm">
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
              <div className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center">
                <Plane className="h-2 w-2 text-white" />
              </div>
              <span>Vacation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-600 rounded flex items-center justify-center">
                <Heart className="h-2 w-2 text-white" />
              </div>
              <span>Day-off</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Not Scheduled</span>
            </div>
          </div>
        </div>
      ) : (
        <TeamScheduleView currentUser={user} />
      )}

      {/* Exchange Modal */}
      <ExchangeModal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
        date={selectedDate}
        currentLocation={selectedDate ? schedule[formatDate(selectedDate)] : null}
        onSave={() => {
          setShowExchangeModal(false);
        }}
      />
    </div>
  );
};

export default WorkSchedule;
