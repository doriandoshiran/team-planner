import React, { useState, useEffect } from 'react';
import { Users, Calendar, ArrowRightLeft, Building, Mail, User, ChevronLeft, ChevronRight, Home, Plane, Heart, Stethoscope, HelpCircle, RefreshCw, Filter, Search, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import SwapModal from './SwapModal';

const TeamScheduleView = () => {
  const { user: currentUser } = useAuth();
  const [teamSchedules, setTeamSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentUserSchedule, setCurrentUserSchedule] = useState({});
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Swap Modal State
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const scheduleTypes = {
    office: { label: 'Office', color: '#3b82f6', textColor: 'white', icon: <Building className="h-3 w-3" /> },
    remote: { label: 'Remote', color: '#10b981', textColor: 'white', icon: <Home className="h-3 w-3" /> },
    dayoff: { label: 'Day Off', color: '#f59e0b', textColor: 'white', icon: <Heart className="h-3 w-3" /> },
    vacation: { label: 'Vacation', color: '#8b5cf6', textColor: 'white', icon: <Plane className="h-3 w-3" /> },
    sick: { label: 'Sick Leave', color: '#ef4444', textColor: 'white', icon: <Stethoscope className="h-3 w-3" /> }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTeamSchedules();
      fetchCurrentUserSchedule();
    }
  }, [currentUser, currentMonth, currentYear, selectedDepartment]);

  const fetchCurrentUserSchedule = async () => {
    try {
      const userId = currentUser._id || currentUser.id;
      
      // Try to load from localStorage first
      const storageKey = `schedule_${userId}_${currentYear}_${currentMonth + 1}`;
      const savedSchedule = localStorage.getItem(storageKey);
      
      if (savedSchedule) {
        setCurrentUserSchedule(JSON.parse(savedSchedule));
      } else {
        setCurrentUserSchedule({});
      }

      // Try to load from API if available
      try {
        const response = await api.get(`/schedules/user/${userId}?month=${currentMonth + 1}&year=${currentYear}`);
        if (response.data && response.data.success) {
          setCurrentUserSchedule(response.data.schedule || {});
        }
      } catch (apiError) {
        console.log('Schedule API not available, using localStorage');
      }
    } catch (error) {
      console.error('Error fetching current user schedule:', error);
      setCurrentUserSchedule({});
    }
  };

  const fetchTeamSchedules = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all users with proper response handling
      const usersResponse = await api.get('/auth/users');
      
      // Handle different response structures
      let usersData = [];
      if (usersResponse.data && usersResponse.data.success && usersResponse.data.data) {
        usersData = usersResponse.data.data;
      } else if (usersResponse.data && usersResponse.data.users) {
        usersData = usersResponse.data.users;
      } else if (Array.isArray(usersResponse.data)) {
        usersData = usersResponse.data;
      }

      console.log('Fetched users:', usersData);

      // Ensure we have an array
      if (!Array.isArray(usersData)) {
        throw new Error('Invalid users data structure');
      }
      
      // Extract unique departments
      const uniqueDepartments = [...new Set(usersData.map(user => user.department).filter(Boolean))];
      setDepartments(uniqueDepartments);

      // Load schedules for each user
      const teamWithSchedules = [];
      for (const user of usersData) {
        const userId = user._id || user.id;
        const currentUserId = currentUser._id || currentUser.id;
        
        try {
          // Try to load from localStorage first
          const storageKey = `schedule_${userId}_${currentYear}_${currentMonth + 1}`;
          const savedSchedule = localStorage.getItem(storageKey);
          
          let userSchedule = {};
          if (savedSchedule) {
            userSchedule = JSON.parse(savedSchedule);
          }

          // Try to load from API if available
          try {
            const scheduleResponse = await api.get(`/schedules/user/${userId}?month=${currentMonth + 1}&year=${currentYear}`);
            if (scheduleResponse.data && scheduleResponse.data.success) {
              userSchedule = scheduleResponse.data.schedule || {};
            }
          } catch (apiError) {
            console.log(`Schedule API not available for user ${userId}, using localStorage`);
          }

          teamWithSchedules.push({
            ...user,
            id: userId, // Ensure consistent ID
            schedule: userSchedule,
            canSwapWith: userId !== currentUserId
          });
        } catch (error) {
          console.error(`Error fetching schedule for user ${userId}:`, error);
          teamWithSchedules.push({
            ...user,
            id: userId,
            schedule: {},
            canSwapWith: userId !== currentUserId
          });
        }
      }

      setTeamSchedules(teamWithSchedules);
    } catch (error) {
      console.error('Error fetching team schedules:', error);
      setError('Failed to fetch team schedules: ' + (error.response?.data?.message || error.message));
      setTeamSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapRequest = (targetUser, date) => {
    if (!targetUser.canSwapWith) {
      return;
    }

    setSelectedUser(targetUser);
    setSelectedDate(date);
    setShowSwapModal(true);
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const formatDate = (day) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getScheduleDisplay = (schedule) => {
    if (!schedule) {
      return { text: '-', color: '#f3f4f6', textColor: '#9ca3af', icon: <Calendar className="h-3 w-3" /> };
    }

    // Handle complex schedule objects from your Schedule model
    if (typeof schedule === 'object') {
      // Handle schedule with location property (from your Schedule model)
      if (schedule.location) {
        const location = schedule.location;
        if (typeof location === 'object' && location.type) {
          const type = scheduleTypes[location.type];
          if (type) {
            return {
              text: schedule.reason ? `${type.label} (${schedule.reason})` : type.label,
              color: type.color,
              textColor: type.textColor,
              icon: type.icon
            };
          }
        } else if (typeof location === 'string') {
          const type = scheduleTypes[location];
          if (type) {
            return {
              text: schedule.reason ? `${type.label} (${schedule.reason})` : type.label,
              color: type.color,
              textColor: type.textColor,
              icon: type.icon
            };
          }
        }
      }
      
      // Handle legacy format with type property
      if (schedule.type) {
        const type = scheduleTypes[schedule.type];
        if (type) {
          return {
            text: schedule.reason ? `${type.label} (${schedule.reason})` : type.label,
            color: type.color,
            textColor: type.textColor,
            icon: type.icon
          };
        }
        return { text: schedule.type, color: '#6b7280', textColor: 'white', icon: <HelpCircle className="h-3 w-3" /> };
      }
    }

    // Handle simple string schedules
    const type = scheduleTypes[schedule];
    if (type) {
      return { text: type.label, color: type.color, textColor: type.textColor, icon: type.icon };
    }
    return { text: schedule, color: '#6b7280', textColor: 'white', icon: <HelpCircle className="h-3 w-3" /> };
  };

  const renderCalendarHeader = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = date.toDateString() === new Date().toDateString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      days.push(
        <th key={day} className={`p-3 text-center text-xs font-semibold border-r border-gray-200 min-w-[50px] transition-colors ${
          isToday 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
            : isWeekend 
              ? 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600' 
              : 'bg-gradient-to-br from-gray-50 to-white text-gray-700 hover:bg-gray-100'
        }`}>
          <div className="font-bold text-sm">{day}</div>
          <div className="text-[10px] opacity-75 mt-1">
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
        </th>
      );
    }

    return days;
  };

  const renderUserRow = (user) => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDate(day);
      const schedule = user.schedule[date];
      const scheduleDisplay = getScheduleDisplay(schedule);
      const isToday = new Date(currentYear, currentMonth, day).toDateString() === new Date().toDateString();

      days.push(
        <td key={day} className={`p-2 text-center border-r border-gray-200 transition-all ${
          isToday ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white hover:bg-gray-50'
        }`}>
          <div
            onClick={() => handleSwapRequest(user, date)}
            className={`p-2 rounded-lg text-xs font-medium min-h-[32px] flex items-center justify-center transition-all duration-300 transform ${
              user.canSwapWith 
                ? 'cursor-pointer hover:scale-110 hover:shadow-lg hover:z-10 relative' 
                : 'cursor-not-allowed opacity-60'
            }`}
            style={{
              backgroundColor: scheduleDisplay.color,
              color: scheduleDisplay.textColor
            }}
            title={user.canSwapWith ? `Click to request swap with ${user.name}` : 'Cannot swap with yourself'}
          >
            <span className="mr-1">{scheduleDisplay.icon}</span>
            <span className="truncate">{scheduleDisplay.text}</span>
          </div>
        </td>
      );
    }

    return days;
  };

  // Filter team schedules based on department and search term
  const filteredTeamSchedules = Array.isArray(teamSchedules) ? teamSchedules.filter(user => {
    const matchesDepartment = !selectedDepartment || user.department === selectedDepartment;
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDepartment && matchesSearch;
  }) : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 font-medium">Loading team schedules...</div>
        </div>
      </div>
    );
  }

  if (filteredTeamSchedules.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8">
        <Users className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Team Members Found</h3>
        <p className="text-gray-500 mb-6 max-w-md">
          {teamSchedules.length === 0 
            ? 'Unable to load team members. Please check your connection and try again.'
            : 'No team members match your current filters. Try adjusting your search or department filter.'
          }
        </p>
        <button
          onClick={fetchTeamSchedules}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          <RefreshCw className="h-4 w-4 inline mr-2" />
          Refresh Team Schedules
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Team Schedule View
          </h2>
          <p className="text-gray-600 mt-1">Click on any schedule to request a swap</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm min-w-[250px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
          </div>

          {/* Department Filter */}
          {departments.length > 0 && (
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          )}

          {/* Month Navigation */}
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border-2 border-gray-200 p-1">
            <button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(currentYear - 1);
                } else {
                  setCurrentMonth(currentMonth - 1);
                }
              }}
              className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="font-semibold text-gray-700 min-w-[140px] text-center px-3">
              {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            
            <button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(currentYear + 1);
                } else {
                  setCurrentMonth(currentMonth + 1);
                }
              }}
              className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Schedule Table */}
      <div className="overflow-x-auto border-2 border-gray-200 rounded-2xl bg-white shadow-xl">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-4 text-left bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 font-bold text-gray-800 min-w-[220px] sticky left-0 z-20 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Team Member</span>
                </div>
              </th>
              {renderCalendarHeader()}
            </tr>
          </thead>
          <tbody>
            {filteredTeamSchedules.map((user, index) => (
              <tr key={user.id || user._id || index} className={`hover:bg-gray-50 transition-colors ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
              }`}>
                <td className="p-4 border-b border-gray-200 bg-white sticky left-0 z-10 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {user.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{user.name || 'Unknown User'}</div>
                      <div className="text-sm text-gray-600">{user.email || 'No email'}</div>
                      {user.department && (
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block mt-1">
                          {user.department}
                        </div>
                      )}
                      <div className={`text-xs text-white px-2 py-1 rounded-full inline-block mt-1 ml-2 ${
                        user.role === 'admin' ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                        user.role === 'manager' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                        'bg-gradient-to-r from-gray-500 to-gray-600'
                      }`}>
                        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                      </div>
                    </div>
                  </div>
                </td>
                {renderUserRow(user)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Legend */}
      <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
        <h4 className="mb-4 font-bold text-gray-800 flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Calendar className="h-3 w-3 text-white" />
          </div>
          <span>Schedule Legend</span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(scheduleTypes).map(([key, type]) => (
            <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div 
                className="w-8 h-8 rounded-lg shadow-sm flex items-center justify-center text-white"
                style={{ backgroundColor: type.color }}
              >
                {type.icon}
              </div>
              <span className="text-sm font-medium text-gray-700">{type.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <div className="w-8 h-8 rounded-lg shadow-sm flex items-center justify-center bg-gray-100 border-2 border-gray-300">
              <Calendar className="h-3 w-3 text-gray-500" />
            </div>
            <span className="text-sm font-medium text-gray-700">Not Scheduled</span>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-800 flex items-center space-x-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span><strong>Pro Tip:</strong> Click on any schedule cell to request a shift swap with that team member. A beautiful modal will guide you through the process!</span>
          </p>
        </div>
      </div>

      {/* Swap Modal */}
      <SwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        selectedUser={selectedUser}
        selectedDate={selectedDate}
        currentUserSchedule={currentUserSchedule}
      />
    </div>
  );
};

export default TeamScheduleView;
