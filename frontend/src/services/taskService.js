import api from './api';

// Named exports for each helper
export const getTasks = async () => {
  const response = await api.get('/tasks');
  return response.data;
};

export const createTask = async (taskData) => {
  const response = await api.post('/tasks', taskData);
  return response.data;
};

export const updateTask = async (id, taskData) => {
  const response = await api.put(`/tasks/${id}`, taskData);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};

export const updateTaskStatus = async (id, status) => {
  const response = await api.patch(`/tasks/${id}/status`, { status });
  return response.data;
};

export const getTasksByUser = async (userId) => {
  const response = await api.get(`/tasks/user/${userId}`);
  return response.data;
};

export const getTasksByProject = async (projectId) => {
  const response = await api.get(`/tasks/project/${projectId}`);
  return response.data;
};

export const assignTask = async (taskId, userId) => {
  const response = await api.patch(`/tasks/${taskId}/assign`, { userId });
  return response.data;
};

// Optional default export if other modules import the whole service
const taskService = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getTasksByUser,
  getTasksByProject,
  assignTask,
};

export default taskService;
