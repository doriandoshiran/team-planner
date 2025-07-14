import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, User, Calendar, MapPin, MessageSquare, Send, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const ExchangeModal = ({ isOpen, onClose, date, currentLocation, onSave }) => {
  const [colleagues, setColleagues] = useState([]);
  const [selectedColleague, setSelectedColleague] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchColleagues();
      setReason('');
      setError('');
      setSelectedColleague('');
    }
  }, [isOpen]);

  const fetchColleagues = async () => {
    try {
      const response = await api.get('/auth/users');
      setColleagues(response.data);
    } catch (error) {
      console.error('Error fetching colleagues:', error);
      setError('Failed to load colleagues');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedColleague || !reason.trim()) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/schedules/exchange-request', {
        targetUserId: selectedColleague,
        date: date.toISOString().split('T')[0],
        currentLocation,
        reason: reason.trim()
      });

      // Success notification
      const selectedUser = colleagues.find(c => c.id === selectedColleague);
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      notification.innerHTML = `
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Exchange request sent to ${selectedUser?.name}!</span>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 4000);

      onSave();
      onClose();
    } catch (error) {
      console.error('Error sending exchange request:', error);
      setError(error.response?.data?.message || 'Failed to send exchange request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const requestedLocation = currentLocation === 'office' ? 'remote' : 'office';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowRightLeft className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Request Location Exchange</h3>
              <p className="text-sm text-gray-500">Change your work location for this day</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Exchange Details */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Date: <span className="font-semibold">{date ? date.toLocaleDateString() : ''}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="text-xs text-green-600 font-medium mb-1">Current Location</div>
                  <div className="text-sm font-semibold text-gray-900 capitalize flex items-center space-x-2">
                    <MapPin className="h-3 w-3" />
                    <span>{currentLocation}</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="text-xs text-green-600 font-medium mb-1">Requesting</div>
                  <div className="text-sm font-semibold text-gray-900 capitalize flex items-center space-x-2">
                    <ArrowRightLeft className="h-3 w-3" />
                    <span>{requestedLocation}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-800">Error</div>
                <div className="text-sm text-red-700 mt-1">{error}</div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                <User className="h-4 w-4" />
                <span>Select Colleague to Exchange With</span>
              </label>
              <select
                value={selectedColleague}
                onChange={(e) => setSelectedColleague(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                required
                disabled={loading}
              >
                <option value="">Choose a colleague...</option>
                {colleagues.map(colleague => (
                  <option key={colleague.id} value={colleague.id}>
                    {colleague.name} - {colleague.department || 'No Department'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                <MessageSquare className="h-4 w-4" />
                <span>Reason for Exchange</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-colors"
                placeholder="Please explain why you need this location exchange (e.g., client meeting, home internet issues, family situation)..."
                required
                disabled={loading}
              />
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-gray-500">Provide a clear reason to help with approval</span>
                <span className="text-xs text-gray-400">{reason.length}/500</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedColleague || !reason.trim() || loading}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExchangeModal;
