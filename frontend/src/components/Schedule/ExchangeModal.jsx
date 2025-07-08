import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import api from '../../services/api';

const ExchangeModal = ({ isOpen, onClose, date, currentLocation, onSave }) => {
  const [colleagues, setColleagues] = useState([]);
  const [selectedColleague, setSelectedColleague] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchColleagues();
    }
  }, [isOpen]);

  const fetchColleagues = async () => {
    try {
      const response = await api.get('/auth/users');
      setColleagues(response.data);
    } catch (error) {
      console.error('Error fetching colleagues:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedColleague || !reason.trim()) return;

    try {
      // Submit exchange request
      await api.post('/schedules/exchange-request', {
        targetUserId: selectedColleague,
        date: date.toISOString().split('T')[0],
        currentLocation,
        reason
      });

      alert('Exchange request sent successfully!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error sending exchange request:', error);
      alert('Failed to send exchange request');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Request Exchange</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Date:</strong> {date ? date.toLocaleDateString() : ''}
          </div>
          <div className="text-sm text-blue-800">
            <strong>Current:</strong> {currentLocation}
          </div>
          <div className="text-sm text-blue-800">
            <strong>Requesting:</strong> {currentLocation === 'office' ? 'remote' : 'office'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Colleague
            </label>
            <select
              value={selectedColleague}
              onChange={(e) => setSelectedColleague(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a colleague...</option>
              {colleagues.map(colleague => (
                <option key={colleague.id} value={colleague.id}>
                  {colleague.name} - {colleague.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Exchange
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please explain why you need this exchange..."
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Send Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExchangeModal;
