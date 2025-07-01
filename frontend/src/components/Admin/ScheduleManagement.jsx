import React, { useState, useEffect } from 'react';
import { Calendar, Users, Building, Home, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';

const ScheduleManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/users');
      setEmployees(response.data);
      
      // Load shared schedules (not admin-specific)
      const savedSchedules = localStorage.getItem('shared_schedules');
      if (savedSchedules) {
        setSchedules(JSON.parse(savedSchedules));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Save to shared storage that users can access
  const saveSchedulesToStorage = (newSchedules) => {
    localStorage.setItem('shared_schedules', JSON.stringify(newSchedules));
    // Also save individual user schedules
    Object.keys(newSchedules).forEach(userId => {
      localStorage.setItem(`schedule_${userId}`, JSON.stringify(newSchedules[userId]));
    });
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date.toISOString().split('T')[0]);
    setShowDateRangeModal(true);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    if (selectedDate) {
      applySingleDay(selectedDate, location);
      setShowDateRangeModal(false);
      setSelectedDate(null);
    } else {
      setShowDateRangeModal(true);
    }
  };

  const applySingleDay = (date, location) => {
    if (!selectedEmployee) return;
    
    const newSchedules = {
      ...schedules,
      [selectedEmployee.id]: {
        ...schedules[selectedEmployee.id],
        [date]: location
      }
    };
    
    setSchedules(newSchedules);
    saveSchedulesToStorage(newSchedules);
  };

  // Fixed date range application to properly include Mondays
  const applyDateRange = () => {
    if (!selectedEmployee || !dateRange.start || !dateRange.end || !selectedLocation) return;

    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const newSchedule = { ...schedules[selectedEmployee.id] };

    // Fixed loop to properly include all weekdays including Mondays
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      // Include Monday (1) through Friday (5), exclude Saturday (6) and Sunday (0)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = currentDate.toISOString().split('T')[0];
        newSchedule[dateStr] = selectedLocation;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const newSchedules = {
      ...schedules,
      [selectedEmployee.id]: newSchedule
    };
    
    setSchedules(newSchedules);
    saveSchedulesToStorage(newSchedules);

    // Reset modal
    setShowDateRangeModal(false);
    setDateRange({ start: '', end: '' });
    setSelectedLocation('');
    setSelectedDate(null);
  };

  const getEmployeeSchedule = () => {
    return selectedEmployee ? schedules[selectedEmployee.id] || {} : {};
  };

  const getScheduleStats = (employeeId) => {
    const schedule = schedules[employeeId] || {};
    const total = Object.keys(schedule).length;
    const office = Object.values(schedule).filter(loc => loc === 'office').length;
    const remote = Object.values(schedule).filter(loc => loc === 'remote').length;
    
    return { total, office, remote };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading employees...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => handleLocationSelect('office')}
            disabled={!selectedEmployee}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Building className="h-4 w-4" />
            <span>Set Office Days</span>
          </button>
          <button
            onClick={() => handleLocationSelect('remote')}
            disabled={!selectedEmployee}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>Set Remote Days</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Employee List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Employees</span>
            </h3>
            
            <div className="space-y-2">
              {employees.map(employee => {
                const stats = getScheduleStats(employee.id);
                const isSelected = selectedEmployee?.id === employee.id;
                
                return (
                  <div
                    key={employee.id}
                    onClick={() => handleEmployeeSelect(employee)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-100 border-2 border-blue-500' 
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{employee.name}</div>
                    <div className="text-sm text-gray-600">{employee.department || 'No Department'}</div>
                    
                    {stats.total > 0 && (
                      <div className="flex space-x-2 mt-2 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Office: {stats.office}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          Remote: {stats.remote}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {employees.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No employees found</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Calendar */}
        <div className="lg:col-span-3">
          {selectedEmployee ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Schedule for {selectedEmployee.name}
                </h3>
                <div className="text-sm text-gray-600">
                  Click on any day to set work location, or use the buttons above for date ranges
                </div>
              </div>

              <EnhancedMonthView
                schedule={getEmployeeSchedule()}
                onDateClick={handleDateClick}
              />
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select an Employee</h3>
              <p className="text-gray-600">Choose an employee from the list to manage their work schedule</p>
            </div>
          )}
        </div>
      </div>

      {/* Date Range Modal */}
      {showDateRangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedDate ? 'Set Work Location' : 'Set Date Range'}
              </h3>
              <button
                onClick={() => {
                  setShowDateRangeModal(false);
                  setSelectedDate(null);
                  setSelectedLocation('');
                  setDateRange({ start: '', end: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedDate ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>Employee:</strong> {selectedEmployee?.name}
                  </div>
                  <div className="text-sm text-blue-800">
                    <strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Location
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        applySingleDay(selectedDate, 'office');
                        setShowDateRangeModal(false);
                        setSelectedDate(null);
                      }}
                      className="flex items-center justify-center space-x-2 p-3 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Building className="h-5 w-5 text-blue-600" />
                      <span>Office</span>
                    </button>
                    <button
                      onClick={() => {
                        applySingleDay(selectedDate, 'remote');
                        setShowDateRangeModal(false);
                        setSelectedDate(null);
                      }}
                      className="flex items-center justify-center space-x-2 p-3 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <Home className="h-5 w-5 text-green-600" />
                      <span>Remote</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>Employee:</strong> {selectedEmployee?.name}
                  </div>
                  <div className="text-sm text-blue-800">
                    <strong>Location:</strong> {selectedLocation === 'office' ? 'Office' : 'Remote'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowDateRangeModal(false);
                      setSelectedLocation('');
                      setDateRange({ start: '', end: '' });
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyDateRange}
                    disabled={!dateRange.start || !dateRange.end}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Apply Schedule</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Fixed Enhanced Month View Component - CORRECTED Monday calculation
const EnhancedMonthView = ({ schedule, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // FIXED Monday calculation - this was the main issue
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // CORRECTED: Proper Monday-first calculation
    let startingDayOfWeek = firstDay.getDay();
    // Convert Sunday=0 to Sunday=6, Monday=0
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

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

  // Week days starting with Monday
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
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
          const location = schedule[dateStr];
          const weekend = isWeekend(date);
          const today = isToday(date);

          return (
            <div
              key={index}
              onClick={() => !weekend && onDateClick(date)}
              className={`p-2 h-20 border border-gray-200 cursor-pointer relative transition-all ${
                today ? 'ring-2 ring-blue-500' : ''
              } ${weekend ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'} ${
                location === 'office' ? 'bg-blue-100 hover:bg-blue-200' : 
                location === 'remote' ? 'bg-green-100 hover:bg-green-200' : ''
              }`}
            >
              <div className="flex justify-between items-start h-full">
                <span className={`text-sm ${today ? 'font-bold text-blue-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </span>
              </div>
              
              {!weekend && location && (
                <div className="absolute bottom-1 left-1 right-1">
                  <div className={`text-center text-xs font-medium py-1 rounded ${
                    location === 'office' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-green-600 text-white'
                  }`}>
                    {location === 'office' ? (
                      <Building className="h-3 w-3 inline mr-1" />
                    ) : (
                      <Home className="h-3 w-3 inline mr-1" />
                    )}
                    {location.charAt(0).toUpperCase() + location.slice(1)}
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
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <span>Not Scheduled</span>
        </div>
      </div>
    </div>
  );
};

export default ScheduleManagement;
