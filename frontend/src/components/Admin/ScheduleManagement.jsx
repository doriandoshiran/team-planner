import React, { useState, useEffect } from 'react';
import { Calendar, Users, Building, Home, Save, X, ChevronLeft, ChevronRight, Plane, Heart, Stethoscope, HelpCircle, Trash2 } from 'lucide-react';
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
  const [dayOffReason, setDayOffReason] = useState('');
  // FIXED: Move currentDate to top level - not conditional
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/users');
      setEmployees(response.data);

      // Load existing schedules from database
      await fetchAllSchedules(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSchedules = async (users) => {
    try {
      const allSchedules = {};
      
      for (const user of users) {
        try {
          // Load individual user schedule from database
          const response = await api.get(`/schedules/user/${user.id}`);
          allSchedules[user.id] = response.data;
        } catch (error) {
          console.error(`Error fetching schedule for user ${user.id}:`, error);
          allSchedules[user.id] = {};
        }
      }
      
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error fetching all schedules:', error);
    }
  };

  const saveSchedulesToDatabase = async (userId, userSchedule) => {
    try {
      await api.post('/schedules/admin/set-schedule', {
        userId,
        schedules: userSchedule
      });
      console.log('Schedule saved to database successfully');
    } catch (error) {
      console.error('Error saving schedule to database:', error);
      throw error;
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
  };

  // FIXED: Use proper local date formatting
  const handleDateClick = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setSelectedDate(dateStr);
    setShowDateRangeModal(true);
  };

  const handleLocationSelect = (location) => {
    if (!selectedEmployee) {
      alert('Please select an employee first');
      return;
    }
    
    setSelectedLocation(location);
    setShowDateRangeModal(true);
  };

  const applySingleDay = async (date, location, reason = '') => {
    if (!selectedEmployee) return;

    const scheduleData = location === 'dayoff' && reason
      ? { type: location, reason }
      : location;

    const newSchedules = {
      ...schedules,
      [selectedEmployee.id]: {
        ...schedules[selectedEmployee.id],
        [date]: scheduleData
      }
    };

    setSchedules(newSchedules);
    
    try {
      await saveSchedulesToDatabase(selectedEmployee.id, newSchedules[selectedEmployee.id]);
    } catch (error) {
      alert('Failed to save schedule. Please try again.');
      setSchedules(schedules);
    }
  };

  const applyDateRange = async () => {
    if (!selectedEmployee || !dateRange.start || !dateRange.end || !selectedLocation) return;

    // FIXED: Parse as local dates to avoid timezone issues
    const startParts = dateRange.start.split('-').map(Number);
    const endParts = dateRange.end.split('-').map(Number);
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

    const newSchedule = { ...schedules[selectedEmployee.id] };

    const scheduleData = selectedLocation === 'dayoff' && dayOffReason
      ? { type: selectedLocation, reason: dayOffReason }
      : selectedLocation;

    const currentDateIter = new Date(start);
    while (currentDateIter <= end) {
      const dayOfWeek = currentDateIter.getDay();
      
      if (
        selectedLocation === 'vacation' ||
        selectedLocation === 'dayoff' ||
        (dayOfWeek >= 1 && dayOfWeek <= 5)
      ) {
        // FIXED: Use local date string formatting instead of toISOString()
        const year = currentDateIter.getFullYear();
        const month = String(currentDateIter.getMonth() + 1).padStart(2, '0');
        const day = String(currentDateIter.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        newSchedule[dateStr] = scheduleData;
      }
      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }

    const newSchedules = {
      ...schedules,
      [selectedEmployee.id]: newSchedule
    };

    setSchedules(newSchedules);
    
    try {
      await saveSchedulesToDatabase(selectedEmployee.id, newSchedule);
      setShowDateRangeModal(false);
      setDateRange({ start: '', end: '' });
      setSelectedLocation('');
      setSelectedDate(null);
      setDayOffReason('');
    } catch (error) {
      alert('Failed to save schedule. Please try again.');
      setSchedules(schedules);
    }
  };

  // FIXED: Clear month functionality - use the current month view, not system date
  const clearMonthSchedule = async () => {
    if (!selectedEmployee) return;
    
    // FIXED: Use the calendar's current month, not today's date
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    if (!window.confirm(`Are you sure you want to clear all schedule entries for ${selectedEmployee.name} in ${getMonthName(currentDate)} ${year}?`)) {
      return;
    }
    
    try {
      await api.delete('/schedules/admin/clear-schedule', {
        data: {
          userId: selectedEmployee.id,
          year,
          month
        }
      });
      
      // Refresh schedules from database
      await fetchAllSchedules(employees);
      alert(`Cleared schedule for ${selectedEmployee.name}`);
    } catch (error) {
      console.error('Error clearing schedule:', error);
      alert('Failed to clear schedule');
    }
  };

  const getEmployeeSchedule = () => {
    return selectedEmployee ? schedules[selectedEmployee.id] || {} : {};
  };

  const getScheduleStats = (employeeId) => {
    const schedule = schedules[employeeId] || {};
    const stats = {
      office: 0,
      remote: 0,
      vacation: 0,
      dayoff: 0,
      total: 0
    };

    Object.values(schedule).forEach(entry => {
      if (typeof entry === 'object' && entry.type) {
        stats[entry.type]++;
      } else if (typeof entry === 'string') {
        stats[entry]++;
      }
      stats.total++;
    });

    return stats;
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
    if (typeof location === 'object' && location.type === 'dayoff') {
      return `Day-off (${location.reason})`;
    }
    return location ? location.charAt(0).toUpperCase() + location.slice(1) : '';
  };

  const getMonthName = (date) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[date.getMonth()];
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
          <button
            onClick={() => handleLocationSelect('vacation')}
            disabled={!selectedEmployee}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Plane className="h-4 w-4" />
            <span>Set Vacation</span>
          </button>
          <button
            onClick={() => handleLocationSelect('dayoff')}
            disabled={!selectedEmployee}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Heart className="h-4 w-4" />
            <span>Set Day-off</span>
          </button>
          <button
            onClick={clearMonthSchedule}
            disabled={!selectedEmployee}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Month</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {stats.office > 0 && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            Office: {stats.office}
                          </span>
                        )}
                        {stats.remote > 0 && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            Remote: {stats.remote}
                          </span>
                        )}
                        {stats.vacation > 0 && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                            Vacation: {stats.vacation}
                          </span>
                        )}
                        {stats.dayoff > 0 && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                            Day-off: {stats.dayoff}
                          </span>
                        )}
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

        <div className="lg:col-span-3">
          {selectedEmployee ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Schedule for {selectedEmployee.name}
                </h3>
                <div className="text-sm text-gray-600">
                  Click on any day to set work location
                </div>
              </div>

              <EnhancedMonthView
                schedule={getEmployeeSchedule()}
                onDateClick={handleDateClick}
                getLocationIcon={getLocationIcon}
                getLocationColor={getLocationColor}
                getLocationLabel={getLocationLabel}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
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

      {/* Modal code - same as before */}
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
                  setDayOffReason('');
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

                {selectedLocation !== 'dayoff' ? (
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
                      <button
                        onClick={() => {
                          applySingleDay(selectedDate, 'vacation');
                          setShowDateRangeModal(false);
                          setSelectedDate(null);
                        }}
                        className="flex items-center justify-center space-x-2 p-3 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        <Plane className="h-5 w-5 text-purple-600" />
                        <span>Vacation</span>
                      </button>
                      <button
                        onClick={() => setSelectedLocation('dayoff')}
                        className="flex items-center justify-center space-x-2 p-3 border-2 border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <Heart className="h-5 w-5 text-orange-600" />
                        <span>Day-off</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day-off Reason
                      </label>
                      <select
                        value={dayOffReason}
                        onChange={(e) => setDayOffReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select reason...</option>
                        <option value="illness">Illness</option>
                        <option value="family">Family Issues</option>
                        <option value="personal">Personal</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (dayOffReason) {
                          applySingleDay(selectedDate, 'dayoff', dayOffReason);
                          setShowDateRangeModal(false);
                          setSelectedDate(null);
                          setDayOffReason('');
                        }
                      }}
                      disabled={!dayOffReason}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                    >
                      Apply Day-off
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>Employee:</strong> {selectedEmployee?.name}
                  </div>
                  <div className="text-sm text-blue-800">
                    <strong>Location:</strong> {
                      selectedLocation === 'office' ? 'Office' :
                        selectedLocation === 'remote' ? 'Remote' :
                          selectedLocation === 'vacation' ? 'Vacation' :
                            selectedLocation === 'dayoff' ? 'Day-off' : ''
                    }
                  </div>
                </div>

                {selectedLocation === 'dayoff' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day-off Reason
                    </label>
                    <select
                      value={dayOffReason}
                      onChange={(e) => setDayOffReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select reason...</option>
                      <option value="illness">Illness</option>
                      <option value="family">Family Issues</option>
                      <option value="personal">Personal</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}

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

                <div className="text-sm text-gray-600">
                  {selectedLocation === 'vacation' || selectedLocation === 'dayoff'
                    ? 'This will apply to all days in the range (including weekends)'
                    : 'This will apply to weekdays only (Monday-Friday)'}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowDateRangeModal(false);
                      setSelectedLocation('');
                      setDateRange({ start: '', end: '' });
                      setDayOffReason('');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyDateRange}
                    disabled={!dateRange.start || !dateRange.end || (selectedLocation === 'dayoff' && !dayOffReason)}
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

// Enhanced Month View Component
const EnhancedMonthView = ({ schedule, onDateClick, getLocationIcon, getLocationColor, getLocationLabel, currentDate, setCurrentDate }) => {
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

  // FIXED: Use proper local date formatting
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

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
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
              onClick={() => onDateClick(date)}
              className={`p-2 h-20 border border-gray-200 cursor-pointer relative transition-all ${
                today ? 'ring-2 ring-blue-500' : ''
              } ${weekend ? 'bg-gray-100' : 'hover:bg-gray-50'} ${bgColor}`}
            >
              <div className="flex justify-between items-start h-full">
                <span className={`text-sm ${today ? 'font-bold text-blue-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </span>
              </div>

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
  );
};

export default ScheduleManagement;
