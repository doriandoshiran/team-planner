import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';

const ExchangeModal = ({ isOpen, onClose, date, currentLocation }) => {
  const [colleagues, setColleagues] = useState([]);
  const [selectedColleague, setSelectedColleague] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

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
      // API call to request exchange
      console.log('Exchange request:', {
        date,
        currentLocation,
        requestedLocation: currentLocation === 'office' ? 'remote' : 'office',
        colleagueId: selectedColleague,
        reason
      });
      
      // Mock success
      setTimeout(() => {
        alert('Exchange request sent successfully!');
        onClose();
        setSelectedColleague('');
        setReason('');
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending exchange request:', error);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const requestedLocation = currentLocation === 'office' ? 'remote' : 'office';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Request Schedule Exchange</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Date:</strong> {date && new Date(date).toLocaleDateString()}
          </div>
          <div className="text-sm text-blue-800">
            <strong>Change:</strong> {currentLocation} → {requestedLocation}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
      </div>
    </div>
  );
};

export default ExchangeModal;
