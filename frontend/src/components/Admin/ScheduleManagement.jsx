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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      fetchAllSchedules(employees);
    }
  }, [currentDate, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/auth/users');
      
      // Handle the correct response structure
      let employeesData = [];
      if (response.data && response.data.success && response.data.data) {
        employeesData = response.data.data;
      } else if (response.data && response.data.users) {
        employeesData = response.data.users;
      } else if (Array.isArray(response.data)) {
        employeesData = response.data;
      }
      
      console.log('Fetched employees:', employeesData);
      setEmployees(employeesData);

      // Load existing schedules
      await fetchAllSchedules(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSchedules = async (users) => {
    try {
      const allSchedules = {};
      
      for (const user of users) {
        const userId = user._id || user.id;
        try {
          // Use the correct endpoint that exists in your backend
          const response = await api.get(`/schedules/my-schedule?userId=${userId}&month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`);
          
          if (response.data && response.data.success) {
            allSchedules[userId] = response.data.data || {};
          } else {
            allSchedules[userId] = {};
          }
        } catch (error) {
          console.error(`Error fetching schedule for user ${userId}:`, error);
          allSchedules[userId] = {};
        }
      }
      
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error fetching all schedules:', error);
      setError('Failed to fetch schedules');
    }
  };

  const saveSchedulesToDatabase = async (userId, date, scheduleData) => {
    try {
      // Prepare the payload for your existing admin endpoint
      let payload = {
        userId,
        date
      };

      if (typeof scheduleData === 'object' && scheduleData.type === 'dayoff') {
        // For day-off with reason
        payload.type = 'dayoff';
        payload.reason = scheduleData.reason;
      } else {
        // For simple location types
        payload.type = scheduleData;
      }

      console.log('Sending payload to API:', payload);

      // Use the correct admin endpoint that exists in your backend
      await api.post('/schedules/admin/set-schedule', payload);
      console.log('Schedule saved to database successfully');
    } catch (error) {
      console.error('Error saving schedule to database:', error);
      console.error('Error details:', error.response?.data);
      throw error;
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleDateClick = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setSelectedDate(dateStr);
    setSelectedLocation('');
    setDayOffReason('');
    setShowDateRangeModal(true);
  };

  const handleLocationSelect = (location) => {
    if (!selectedEmployee) {
      alert('Please select an employee first');
      return;
    }
    
    setSelectedLocation(location);
    setSelectedDate(null);
    setDayOffReason('');
    setShowDateRangeModal(true);
  };

  const applySingleDay = async (date, location, reason = '') => {
    if (!selectedEmployee) return;

    try {
      setError('');
      
      const userId = selectedEmployee._id || selectedEmployee.id;
      const scheduleData = location === 'dayoff' && reason
        ? { type: location, reason }
        : location;

      // Update local state first
      const newSchedules = {
        ...schedules,
        [userId]: {
          ...schedules[userId],
          [date]: scheduleData
        }
      };

      setSchedules(newSchedules);
      
      // Save to database using your existing endpoint
      await saveSchedulesToDatabase(userId, date, scheduleData);
      
      // Reset form state
      setSelectedLocation('');
      setDayOffReason('');
      
    } catch (error) {
      console.error('Error applying single day schedule:', error);
      setError('Failed to save schedule. Please try again.');
      // Revert local state on error
      await fetchAllSchedules(employees);
    }
  };

  const applyDateRange = async () => {
    if (!selectedEmployee || !dateRange.start || !dateRange.end || !selectedLocation) return;

    try {
      setError('');
      
      const userId = selectedEmployee._id || selectedEmployee.id;
      const startParts = dateRange.start.split('-').map(Number);
      const endParts = dateRange.end.split('-').map(Number);
      const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

      const newSchedule = { ...schedules[userId] };

      const scheduleData = selectedLocation === 'dayoff' && dayOffReason
        ? { type: selectedLocation, reason: dayOffReason }
        : selectedLocation;

      const currentDateIter = new Date(start);
      const datesToSave = [];

      while (currentDateIter <= end) {
        const dayOfWeek = currentDateIter.getDay();
        
        if (
          selectedLocation === 'vacation' ||
          selectedLocation === 'dayoff' ||
          (dayOfWeek >= 1 && dayOfWeek <= 5)
        ) {
          const year = currentDateIter.getFullYear();
          const month = String(currentDateIter.getMonth() + 1).padStart(2, '0');
          const day = String(currentDateIter.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          newSchedule[dateStr] = scheduleData;
          datesToSave.push(dateStr);
        }
        currentDateIter.setDate(currentDateIter.getDate() + 1);
      }

      // Update local state
      const newSchedules = {
        ...schedules,
        [userId]: newSchedule
      };
      setSchedules(newSchedules);

      // Save all dates to database
      for (const dateStr of datesToSave) {
        try {
          await saveSchedulesToDatabase(userId, dateStr, scheduleData);
        } catch (error) {
          console.error(`Error saving schedule for ${dateStr}:`, error);
          setError(`Failed to save schedule for ${dateStr}`);
        }
      }
      
      // Close modal and reset form
      setShowDateRangeModal(false);
      setDateRange({ start: '', end: '' });
      setSelectedLocation('');
      setSelectedDate(null);
      setDayOffReason('');
      
    } catch (error) {
      console.error('Error applying date range:', error);
      setError('Failed to apply date range. Please try again.');
      // Refresh schedules on error
      await fetchAllSchedules(employees);
    }
  };

  const clearMonthSchedule = async () => {
    if (!selectedEmployee) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    if (!window.confirm(`Are you sure you want to clear all schedule entries for ${selectedEmployee.name} in ${getMonthName(currentDate)} ${year}?`)) {
      return;
    }
    
    try {
      setError('');
      const userId = selectedEmployee._id || selectedEmployee.id;
      
      // Get all dates in the month and remove them one by one using the correct endpoint
      const daysInMonth = new Date(year, month, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        try {
          await api.delete('/schedules/admin/remove-schedule', {
            data: {
              userId,
              date: dateStr
            }
          });
        } catch (error) {
          // Ignore 404 errors for dates that don't have schedules
          if (error.response?.status !== 404) {
            console.error(`Error removing schedule for ${dateStr}:`, error);
          }
        }
      }
      
      // Refresh schedules from database
      await fetchAllSchedules(employees);
      alert(`Cleared schedule for ${selectedEmployee.name}`);
    } catch (error) {
      console.error('Error clearing schedule:', error);
      setError('Failed to clear schedule');
    }
  };

  const removeScheduleEntry = async (date) => {
    if (!selectedEmployee) return;
    
    try {
      setError('');
      
      const userId = selectedEmployee._id || selectedEmployee.id;
      
      // Remove from local state
      const newSchedules = {
        ...schedules,
        [userId]: {
          ...schedules[userId]
        }
      };
      delete newSchedules[userId][date];
      setSchedules(newSchedules);
      
      // Remove from database using your existing endpoint
      await api.delete('/schedules/admin/remove-schedule', {
        data: {
          userId,
          date
        }
      });
      
      setShowDateRangeModal(false);
      setSelectedDate(null);
      
    } catch (error) {
      console.error('Error removing schedule entry:', error);
      setError('Failed to remove schedule entry');
      // Refresh on error
      await fetchAllSchedules(employees);
    }
  };

  const getEmployeeSchedule = () => {
    if (!selectedEmployee) return {};
    const userId = selectedEmployee._id || selectedEmployee.id;
    return schedules[userId] || {};
  };

  const getScheduleStats = (employeeId) => {
    const schedule = schedules[employeeId] || {};
    const stats = {
      office: 0,
      remote: 0,
      vacation: 0,
      dayoff: 0,
      sick: 0,
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
      case 'sick': return <Stethoscope className="h-3 w-3" />;
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
      case 'sick': return 'bg-red-600 text-white';
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Employees</span>
            </h3>

            <div className="space-y-2">
              {employees.map(employee => {
                const employeeId = employee._id || employee.id;
                const stats = getScheduleStats(employeeId);
                const isSelected = selectedEmployee && (selectedEmployee._id || selectedEmployee.id) === employeeId;

                return (
                  <div
                    key={employeeId}
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
                        {stats.sick > 0 && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                            Sick: {stats.sick}
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

      {/* Modal for date range and single day selection */}
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
                  {getEmployeeSchedule()[selectedDate] && (
                    <div className="text-sm text-blue-800">
                      <strong>Current:</strong> {getLocationLabel(getEmployeeSchedule()[selectedDate])}
                    </div>
                  )}
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
                    
                    {getEmployeeSchedule()[selectedDate] && (
                      <div className="mt-4">
                        <button
                          onClick={() => removeScheduleEntry(selectedDate)}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Remove Schedule Entry</span>
                        </button>
                      </div>
                    )}
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
                    <button
                      onClick={() => setSelectedLocation('')}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Back to Options
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
              case 'sick': bgColor = 'bg-red-100 hover:bg-red-200'; break;
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
                    <span className="ml-1 truncate">{getLocationLabel(location)}</span>
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
          <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center">
            <Stethoscope className="h-2 w-2 text-white" />
          </div>
          <span>Sick</span>
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
