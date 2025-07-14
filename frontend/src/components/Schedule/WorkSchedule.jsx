import React, { useState, useEffect } from 'react';
import { Calendar, Home, Building, Users, ChevronLeft, ChevronRight, User, Plane, Heart, Stethoscope, HelpCircle, ArrowRightLeft, Bell, RefreshCw, Search, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SwapModal from './SwapModal';
import api from '../../services/api';

const WorkSchedule = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState({});
  const [activeTab, setActiveTab] = useState('my-schedule');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Team Schedule State
  const [teamSchedules, setTeamSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
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
    if (user) {
      if (activeTab === 'my-schedule') {
        fetchSchedule();
        fetchNotifications();
      } else if (activeTab === 'team-schedule') {
        fetchTeamSchedules();
      }
    }
  }, [user, activeTab, currentDate]);

  const fetchSchedule = async () => {
    try {
      console.log('Fetching schedule for user:', user?.id);
      const response = await api.get(`/schedules/my-schedule?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`);
      setSchedule(response.data);
      console.log('Schedule loaded from database:', response.data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setSchedule({});
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/schedules/notifications');
      const notificationsData = Array.isArray(response.data) ? response.data : [];
      setNotifications(notificationsData);
      console.log('Notifications loaded:', notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.put(`/schedules/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const respondToSwapRequest = async (swapRequestId, action) => {
    try {
      await api.put(`/schedules/swap-request/${swapRequestId}/respond`, {
        action: action,
        reason: action === 'deny' ? 'Declined via notification' : ''
      });
      
      // Refresh notifications and schedule
      await fetchNotifications();
      await fetchSchedule();
      
      alert(`Swap request ${action}d successfully!`);
    } catch (error) {
      console.error('Error responding to swap request:', error);
      alert('Failed to respond to swap request');
    }
  };

  const fetchTeamSchedules = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all users
      const usersResponse = await api.get('/auth/users');
      
      // Extract unique departments
      const uniqueDepartments = [...new Set(usersResponse.data.map(user => user.department).filter(Boolean))];
      setDepartments(uniqueDepartments);

      // Load schedules from database for each user
      const teamWithSchedules = [];
      for (const userData of usersResponse.data) {
        try {
          const scheduleResponse = await api.get(`/schedules/my-schedule?userId=${userData.id}&month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`);
          teamWithSchedules.push({
            ...userData,
            schedule: scheduleResponse.data,
            canSwapWith: userData.id !== user?.id
          });
        } catch (error) {
          console.error(`Error fetching schedule for user ${userData.id}:`, error);
          teamWithSchedules.push({
            ...userData,
            schedule: {},
            canSwapWith: userData.id !== user?.id
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

  const handleMyScheduleClick = (date) => {
    const dateStr = formatDate(date);
    const currentLocation = schedule[dateStr];
    
    console.log('My Schedule Date clicked:', dateStr, 'Location:', currentLocation);
    
    // Only allow swap requests for office or remote days
    if (currentLocation === 'office' || currentLocation === 'remote') {
      // Create a mock user object for the current user to trigger swap modal
      const mockTargetUser = {
        id: 'exchange-request',
        name: 'Exchange Request',
        canSwapWith: true,
        isExchangeRequest: true
      };
      
      setSelectedUser(mockTargetUser);
      setSelectedDate(dateStr);
      setShowSwapModal(true);
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

  const getScheduleDisplay = (schedule) => {
    if (!schedule) {
      return { text: '-', color: '#f3f4f6', textColor: '#9ca3af', icon: <Calendar className="h-3 w-3" /> };
    }

    if (typeof schedule === 'object' && schedule.type) {
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

    const type = scheduleTypes[schedule];
    if (type) {
      return { text: type.label, color: type.color, textColor: type.textColor, icon: type.icon };
    }
    return { text: schedule, color: '#6b7280', textColor: 'white', icon: <HelpCircle className="h-3 w-3" /> };
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

  const getDaysInMonthForTeam = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const formatDateForTeam = (day) => {
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const renderTeamCalendarHeader = () => {
    const daysInMonth = getDaysInMonthForTeam(currentDate.getMonth(), currentDate.getFullYear());
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
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

  const renderTeamUserRow = (userData) => {
    const daysInMonth = getDaysInMonthForTeam(currentDate.getMonth(), currentDate.getFullYear());
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDateForTeam(day);
      const schedule = userData.schedule[date];
      const scheduleDisplay = getScheduleDisplay(schedule);
      const isToday = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString() === new Date().toDateString();

      days.push(
        <td key={day} className={`p-2 text-center border-r border-gray-200 transition-all ${
          isToday ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white hover:bg-gray-50'
        }`}>
          <div
            onClick={() => handleSwapRequest(userData, date)}
            className={`p-2 rounded-lg text-xs font-medium min-h-[32px] flex items-center justify-center transition-all duration-300 transform ${
              userData.canSwapWith 
                ? 'cursor-pointer hover:scale-110 hover:shadow-lg hover:z-10 relative' 
                : 'cursor-not-allowed opacity-60'
            }`}
            style={{
              backgroundColor: scheduleDisplay.color,
              color: scheduleDisplay.textColor
            }}
            title={userData.canSwapWith ? `Click to request swap with ${userData.name}` : 'Cannot swap with yourself'}
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
  const filteredTeamSchedules = teamSchedules.filter(userData => {
    const matchesDepartment = !selectedDepartment || userData.department === selectedDepartment;
    const matchesSearch = userData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userData.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDepartment && matchesSearch;
  });

  const unreadNotifications = notifications.filter(notif => !notif.isRead);

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Work Schedule
          </h1>
          <p className="text-gray-600 mt-1">View your work schedule and team schedules</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
            >
              <Bell className="h-6 w-6" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification._id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Bell className="h-5 w-5 text-blue-600 mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title || 'Notification'}
                              </p>
                              <span className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message || 'No message'}
                            </p>
                            
                            {/* Action buttons for swap requests */}
                            {notification.type === 'swap_request' && notification.relatedId && (
                              <div className="flex space-x-2 mt-3">
                                <button
                                  onClick={() => respondToSwapRequest(notification.relatedId, 'approve')}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => respondToSwapRequest(notification.relatedId, 'deny')}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  Deny
                                </button>
                              </div>
                            )}
                            
                            {!notification.isRead && (
                              <button
                                onClick={() => markNotificationAsRead(notification._id)}
                                className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border-2 border-gray-200 p-1">
            <button
              onClick={navigatePrevious}
              className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="font-semibold text-gray-700 min-w-[140px] text-center px-3">
              {getDateRangeLabel()}
            </span>

            <button
              onClick={navigateNext}
              className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-lg rounded-2xl mb-8 overflow-hidden border-2 border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('my-schedule')}
              className={`py-4 px-8 border-b-2 font-semibold text-sm transition-all duration-200 ${
                activeTab === 'my-schedule'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>My Schedule</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('team-schedule')}
              className={`py-4 px-8 border-b-2 font-semibold text-sm transition-all duration-200 ${
                activeTab === 'team-schedule'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Team Schedules</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'my-schedule' ? (
        <div className="bg-white shadow-xl rounded-2xl p-6 border-2 border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">Schedule for {user?.name}</h3>
            <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              Click on work days (office/remote) to request exchanges
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {weekDays.map(day => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg">
                {day}
              </div>
            ))}
            
            {days.map((date, index) => {
              if (!date) {
                return <div key={index} className="p-3 h-20"></div>;
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
                  onClick={() => canRequestExchange && handleMyScheduleClick(date)}
                  className={`p-3 h-20 border-2 border-gray-200 rounded-lg relative transition-all duration-200 ${
                    today ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  } ${weekend ? 'bg-gray-100' : 'hover:bg-gray-50'} ${bgColor} ${
                    canRequestExchange ? 'cursor-pointer hover:shadow-md transform hover:scale-105' : ''
                  }`}
                  title={canRequestExchange ? 'Click to request exchange' : ''}
                >
                  <div className="flex justify-between items-start h-full">
                    <span className={`text-sm font-semibold ${today ? 'text-blue-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {weekend && !location && (
                    <div className="absolute bottom-1 left-1 right-1">
                      <div className="text-center text-xs text-gray-500 py-1 bg-gray-200 rounded">
                        Weekend
                      </div>
                    </div>
                  )}

                  {location && (
                    <div className="absolute bottom-1 left-1 right-1">
                      <div className={`text-center text-xs font-medium py-1 rounded flex items-center justify-center shadow-sm ${getLocationColor(location)}`}>
                        {getLocationIcon(location)}
                        <span className="ml-1 truncate">{getLocationLabel(location)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enhanced Legend */}
          <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="mb-3 font-semibold text-gray-700 flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Schedule Legend</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(scheduleTypes).map(([key, type]) => (
                <div key={key} className="flex items-center gap-3 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors">
                  <div 
                    className="w-6 h-6 rounded-lg shadow-sm flex items-center justify-center text-white"
                    style={{ backgroundColor: type.color }}
                  >
                    {type.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{type.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-6 h-6 rounded-lg shadow-sm flex items-center justify-center bg-gray-100 border border-gray-300">
                  <Calendar className="h-3 w-3 text-gray-500" />
                </div>
                <span className="text-sm font-medium text-gray-700">Not Scheduled</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Team Schedule Controls */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Team Schedules</h3>
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
                  className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                />
              </div>

              {/* Department Filter */}
              {departments.length > 0 && (
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm bg-white"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Team Schedule Table */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-lg text-gray-600 font-medium">Loading team schedules...</div>
              </div>
            </div>
          ) : filteredTeamSchedules.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8">
              <Users className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Team Members Found</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                No team members match your current filters. Try adjusting your search or department filter.
              </p>
              <button
                onClick={fetchTeamSchedules}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Refresh Team Schedules
              </button>
            </div>
          ) : (
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
                    {renderTeamCalendarHeader()}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeamSchedules.map((userData, index) => (
                    <tr key={userData.id} className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                    }`}>
                      <td className="p-4 border-b border-gray-200 bg-white sticky left-0 z-10 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {userData.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{userData.name}</div>
                            <div className="text-sm text-gray-600">{userData.email}</div>
                            {userData.department && (
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block mt-1">
                                {userData.department}
                              </div>
                            )}
                            <div className={`text-xs text-white px-2 py-1 rounded-full inline-block mt-1 ml-2 ${
                              userData.role === 'admin' ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                              userData.role === 'manager' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                              'bg-gradient-to-r from-gray-500 to-gray-600'
                            }`}>
                              {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                            </div>
                          </div>
                        </div>
                      </td>
                      {renderTeamUserRow(userData)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Team Schedule Legend */}
          {!loading && filteredTeamSchedules.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
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
          )}
        </div>
      )}

      {/* Swap Modal */}
      <SwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        selectedUser={selectedUser}
        selectedDate={selectedDate}
        currentUserSchedule={schedule}
      />
    </div>
  );
};

export default WorkSchedule;
