import React, { useState, useEffect } from 'react';
import { Users, Calendar, ArrowRightLeft, Building, Mail, User, ChevronLeft, ChevronRight, Home, Plane, Heart, Stethoscope, HelpCircle } from 'lucide-react';
import api from '../../services/api';

const TeamScheduleView = ({ currentUser }) => {
  const [teamSchedules, setTeamSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [swapReason, setSwapReason] = useState('');

  useEffect(() => {
    fetchTeamSchedules();
  }, []);

  const fetchTeamSchedules = async () => {
    try {
      setLoading(true);
      
      // Get all users
      const response = await api.get('/auth/users');
      
      // Load schedules from database for each user
      const teamWithSchedules = [];
      for (const user of response.data) {
        try {
          const scheduleResponse = await api.get(`/schedules/user/${user.id}`);
          teamWithSchedules.push({
            ...user,
            schedule: scheduleResponse.data
          });
        } catch (error) {
          console.error(`Error fetching schedule for user ${user.id}:`, error);
          teamWithSchedules.push({
            ...user,
            schedule: {}
          });
        }
      }
      
      setTeamSchedules(teamWithSchedules);
      
      if (teamWithSchedules.length > 0 && !selectedUser) {
        setSelectedUser(teamWithSchedules[0]);
      }
    } catch (error) {
      console.error('Error fetching team schedules:', error);
      setTeamSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  const handleDateClick = (date) => {
    if (!selectedUser) return;
    
    // FIXED: Use proper local date formatting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const userSchedule = selectedUser.schedule[dateStr];
    
    if (userSchedule && selectedUser.id !== currentUser?.id) {
      setSelectedDate(date);
      setShowSwapModal(true);
    }
  };

  const getScheduleForDate = (schedule, date) => {
    // FIXED: Use proper local date formatting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return schedule[dateStr] || null;
  };

  const getLocationColor = (location) => {
    if (typeof location === 'object' && location.type) {
      location = location.type;
    }
    
    switch (location) {
      case 'office': return 'bg-blue-600 text-white';
      case 'remote': return 'bg-green-600 text-white';
      case 'vacation': return 'bg-purple-600 text-white';
      case 'dayoff': return 'bg-orange-600 text-white';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getLocationLabel = (location) => {
    if (typeof location === 'object' && location.type === 'dayoff') {
      return `Day-off (${location.reason})`;
    }
    return location ? location.charAt(0).toUpperCase() + location.slice(1) : 'Not Scheduled';
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

  const submitSwapRequest = async () => {
    if (!selectedUser || !swapReason.trim()) return;
    
    try {
      await api.post('/schedules/swap-request', {
        targetUserId: selectedUser.id,
        requestedDate: selectedDate.toISOString().split('T')[0],
        offeredDate: selectedDate.toISOString().split('T')[0],
        reason: swapReason
      });
      
      alert('Shift swap request sent successfully!');
      setShowSwapModal(false);
      setSwapReason('');
      setSelectedUser(null);
    } catch (error) {
      console.error('Error sending swap request:', error);
      alert('Failed to send swap request');
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // FIXED: Proper Monday calculation
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

  // FIXED: Use proper local date formatting
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading team schedules...</div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Team Schedules
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Team Members List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Team Members</span>
            </h3>

            <div className="space-y-2">
              {teamSchedules.map(user => {
                const isCurrentUser = user.id === currentUser?.id;
                const isSelected = selectedUser?.id === user.id;

                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    } ${isCurrentUser ? 'ring-2 ring-green-200' : ''}`}
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className={`font-medium ${isCurrentUser ? 'text-green-900' : 'text-gray-900'}`}>
                        {user.name} {isCurrentUser && '(You)'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                      <Building className="h-3 w-3" />
                      <span>{user.department || 'No Department'}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                      <Mail className="h-3 w-3" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {teamSchedules.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No team members found</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Calendar */}
        <div className="lg:col-span-3">
          {selectedUser ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Schedule for {selectedUser.name}
                </h3>
                <div className="text-sm text-gray-600">
                  {selectedUser.id !== currentUser?.id ? 'Click on scheduled days to request swaps' : 'Your schedule'}
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
                  const location = selectedUser.schedule[dateStr];
                  const canRequestSwap = location && selectedUser.id !== currentUser?.id;

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
                      onClick={() => canRequestSwap && handleDateClick(date)}
                      className={`p-2 h-20 border border-gray-200 relative transition-all ${
                        today ? 'ring-2 ring-blue-500' : ''
                      } ${weekend ? 'bg-gray-100' : 'hover:bg-gray-50'} ${bgColor} ${
                        canRequestSwap ? 'cursor-pointer' : ''
                      }`}
                      title={canRequestSwap ? 'Click to request swap' : ''}
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

                      {/* FIXED: Display location with icon and label like in screenshot */}
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
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Team Member</h3>
              <p className="text-gray-600">Choose a team member from the list to view their schedule</p>
            </div>
          )}
        </div>
      </div>

      {/* Swap Request Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Request Shift Swap</h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Requesting swap with:</strong> {selectedUser?.name}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Date:</strong> {selectedDate?.toLocaleDateString()}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Their schedule:</strong> {getLocationLabel(getScheduleForDate(selectedUser?.schedule || {}, selectedDate))}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for swap request
                </label>
                <textarea
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please explain why you need this swap..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSwapModal(false);
                    setSwapReason('');
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitSwapRequest}
                  disabled={!swapReason.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamScheduleView;
