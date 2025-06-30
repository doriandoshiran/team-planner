import api from './api';

export const taskService = {
  // Get all tasks
  getTasks: async () => {
    const response = await api.get('/tasks');
    return response.data;
  },

  // Create new task
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  // Update task
  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  // Delete task
  deleteTask: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  // Update task status
  updateTaskStatus: async (id, status) => {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    return response.data;
  }
};
