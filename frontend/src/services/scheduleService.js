import api from './api';

export const scheduleService = {
  // Get user's schedule
  getMySchedule: async () => {
    const response = await api.get('/schedule/my-schedule');
    return response.data;
  },

  // Get all users' schedules (admin only)
  getAllSchedules: async () => {
    const response = await api.get('/schedule/all');
    return response.data;
  },

  // Update work location for a specific date
  updateWorkLocation: async (date, location) => {
    const response = await api.put('/schedule/work-location', { date, location });
    return response.data;
  },

  // Request schedule exchange
  requestExchange: async (exchangeData) => {
    const response = await api.post('/schedule/exchange-request', exchangeData);
    return response.data;
  },

  // Respond to exchange request
  respondToExchange: async (requestId, response) => {
    const response_data = await api.put(`/schedule/exchange-request/${requestId}`, { response });
    return response_data.data;
  },

  // Get exchange requests
  getExchangeRequests: async () => {
    const response = await api.get('/schedule/exchange-requests');
    return response.data;
  },

  // Admin: Set user schedule
  setUserSchedule: async (userId, scheduleData) => {
    const response = await api.put(`/schedule/admin/user/${userId}`, scheduleData);
    return response.data;
  }
};
