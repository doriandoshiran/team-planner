import React, { useState, useEffect } from 'react';
import { X, Users, Building, Home } from 'lucide-react';

const ExchangeModal = ({ isOpen, onClose, date, currentLocation, onSave }) => {
  const [colleagues, setColleagues] = useState([]);
  const [selectedColleague, setSelectedColleague] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('exchange'); // 'exchange' or 'change'

  useEffect(() => {
    if (isOpen) {
      // Mock colleagues data - replace with API call
      setColleagues([
        { id: 1, name: 'John Doe', email: 'john@company.com', department: 'Development' },
        { id: 2, name: 'Jane Smith', email: 'jane@company.com', department: 'Design' },
        { id: 3, name: 'Mike Johnson', email: 'mike@company.com', department: 'Development' }
      ]);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'exchange') {
        // Exchange request logic
        console.log('Exchange request:', {
          date,
          currentLocation,
          requestedLocation: currentLocation === 'office' ? 'remote' : 'office',
          colleagueId: selectedColleague,
          reason
        });
        alert('Exchange request sent successfully!');
      } else {
        // Direct change logic
        const newLocation = currentLocation === 'office' ? 'remote' : 'office';
        if (onSave) {
          await onSave(date, newLocation);
        }
        alert('Schedule updated successfully!');
      }
      
      onClose();
      setSelectedColleague('');
      setReason('');
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const handleDirectChange = async (newLocation) => {
    try {
      if (onSave) {
        await onSave(date, newLocation);
      }
      alert('Schedule updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule. Please try again.');
    }
  };

  if (!isOpen) return null;

  const requestedLocation = currentLocation === 'office' ? 'remote' : 'office';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Update Work Location</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Date:</strong> {date && new Date(date).toLocaleDateString()}
          </div>
          <div className="text-sm text-blue-800">
            <strong>Current:</strong> {currentLocation || 'Not set'}
          </div>
        </div>

        {/* Mode Selection */}
        <div className="mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setMode('change')}
              className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                mode === 'change' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="font-medium">Direct Change</div>
                <div className="text-sm text-gray-600">Change your schedule directly</div>
              </div>
            </button>
            <button
              onClick={() => setMode('exchange')}
              className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                mode === 'exchange' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="font-medium">Request Exchange</div>
                <div className="text-sm text-gray-600">Ask colleague to swap</div>
              </div>
            </button>
          </div>
        </div>

        {mode === 'change' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Location
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDirectChange('office')}
                  className="flex items-center justify-center space-x-2 p-3 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Building className="h-5 w-5 text-blue-600" />
                  <span>Office</span>
                </button>
                <button
                  onClick={() => handleDirectChange('remote')}
                  className="flex items-center justify-center space-x-2 p-3 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <Home className="h-5 w-5 text-green-600" />
                  <span>Remote</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>Requesting:</strong> {currentLocation} → {requestedLocation}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Exchange
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please explain why you need to exchange this day..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    <span>Send Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ExchangeModal;
