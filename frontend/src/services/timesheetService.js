import api from './api';

export const getTimeEntries = (params) => api.get('/timesheet', { params });
export const createTimeEntry = (data) => api.post('/timesheet', data);
export const updateTimeEntry = (id, data) => api.put(`/timesheet/${id}`, data);
export const submitTimesheet = (data) => api.post('/timesheet/submit', data);