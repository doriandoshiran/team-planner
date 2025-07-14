import React, { useState, useEffect } from 'react';
import { X, Calendar, User, ArrowRightLeft, Clock, MessageSquare, CheckCircle, AlertCircle, Sparkles, Users } from 'lucide-react';
import api from '../../services/api';

const SwapModal = ({ isOpen, onClose, selectedUser, selectedDate, currentUserSchedule }) => {
  const [swapReason, setSwapReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSwapReason('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!swapReason.trim()) {
      setError('Please provide a reason for the swap request');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/schedules/swap-request', {
        targetUserId: selectedUser.id,
        requestedDate: selectedDate,
        reason: swapReason.trim()
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);

    } catch (error) {
      console.error('Error sending swap request:', error);
      setError(error.response?.data?.message || 'Failed to send swap request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCurrentUserScheduleForDate = () => {
    return currentUserSchedule?.[selectedDate] || 'Not scheduled';
  };

  const getTargetUserScheduleForDate = () => {
    return selectedUser?.schedule?.[selectedDate] || 'Not scheduled';
  };

  const getScheduleDisplay = (schedule) => {
    if (!schedule || schedule === 'Not scheduled') {
      return { 
        text: 'Not scheduled', 
        color: 'bg-gray-100 text-gray-500',
        icon: '📅'
      };
    }

    if (typeof schedule === 'object' && schedule.type) {
      const scheduleTypes = {
        office: { text: 'Office', color: 'bg-blue-500 text-white', icon: '🏢' },
        remote: { text: 'Remote', color: 'bg-green-500 text-white', icon: '🏠' },
        vacation: { text: 'Vacation', color: 'bg-purple-500 text-white', icon: '✈️' },
        dayoff: { text: 'Day Off', color: 'bg-orange-500 text-white', icon: '💤' },
        sick: { text: 'Sick Leave', color: 'bg-red-500 text-white', icon: '🤒' }
      };
      
      const type = scheduleTypes[schedule.type] || { text: schedule.type, color: 'bg-gray-500 text-white', icon: '📋' };
      const displayText = schedule.reason 
        ? `${type.text} (${schedule.reason})`
        : type.text;
      
      return { text: displayText, color: type.color, icon: type.icon };
    }

    const scheduleTypes = {
      office: { text: 'Office', color: 'bg-blue-500 text-white', icon: '🏢' },
      remote: { text: 'Remote', color: 'bg-green-500 text-white', icon: '🏠' },
      vacation: { text: 'Vacation', color: 'bg-purple-500 text-white', icon: '✈️' },
      dayoff: { text: 'Day Off', color: 'bg-orange-500 text-white', icon: '💤' },
      sick: { text: 'Sick Leave', color: 'bg-red-500 text-white', icon: '🤒' }
    };

    const type = scheduleTypes[schedule] || { text: schedule, color: 'bg-gray-500 text-white', icon: '📋' };
    return { 
      text: type.text.charAt(0).toUpperCase() + type.text.slice(1), 
      color: type.color,
      icon: type.icon
    };
  };

  const currentSchedule = getScheduleDisplay(getCurrentUserScheduleForDate());
  const targetSchedule = getScheduleDisplay(getTargetUserScheduleForDate());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all animate-in zoom-in-95 duration-300">
        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Request Sent Successfully! 🎉</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Your swap request has been sent to <span className="font-semibold text-blue-600">{selectedUser?.name}</span>. 
              They'll receive a notification and can respond directly from their dashboard.
            </p>
            <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-green-800">
                ✨ You'll be notified as soon as they respond to your request
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="relative p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                    <ArrowRightLeft className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Request Shift Swap</h3>
                    <p className="text-blue-100 text-sm">Exchange schedules with your colleague</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Date</span>
                    </div>
                    <p className="text-gray-900 font-semibold">{formatDate(selectedDate)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Swap with</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {selectedUser?.name?.charAt(0) || 'U'}
                      </div>
                      <p className="text-gray-900 font-semibold">{selectedUser?.name}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <h4 className="text-lg font-semibold text-gray-800">Schedule Exchange Preview</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{currentSchedule.icon}</div>
                        <div>
                          <div className="text-xs text-blue-600 font-medium mb-1">Your Current Schedule</div>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentSchedule.color}`}>
                            {currentSchedule.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                      <ArrowRightLeft className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  
                  <div className="bg-white border-2 border-green-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{targetSchedule.icon}</div>
                        <div>
                          <div className="text-xs text-green-600 font-medium mb-1">{selectedUser?.name}'s Schedule</div>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${targetSchedule.color}`}>
                            {targetSchedule.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span>Reason for swap request</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    placeholder="e.g., I have a doctor's appointment and would prefer to work from home that day..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 placeholder-gray-400"
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                    <span>💡</span>
                    <span>A clear explanation helps your colleague understand and respond to your request</span>
                  </p>
                </div>

                {error && (
                  <div className="flex items-center space-x-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 hover:shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !swapReason.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 hover:shadow-lg transform hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="h-4 w-4" />
                        <span>Send Swap Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SwapModal;
