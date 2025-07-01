import api from './api';

export const projectService = {
  // Get all projects
  getProjects: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const response = await api.get(`/projects?${params}`);
    return response.data;
  },

  // Get single project
  getProject: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  // Create project
  createProject: async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  // Update project
  updateProject: async (id, projectData) => {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },

  // Delete project
  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  // Add team member
  addTeamMember: async (projectId, memberData) => {
    const response = await api.post(`/projects/${projectId}/team`, memberData);
    return response.data;
  },

  // Remove team member
  removeTeamMember: async (projectId, userId) => {
    const response = await api.delete(`/projects/${projectId}/team/${userId}`);
    return response.data;
  },

  // Add comment
  addComment: async (projectId, text) => {
    const response = await api.post(`/projects/${projectId}/comments`, { text });
    return response.data;
  },

  // Update progress
  updateProgress: async (projectId, progress) => {
    const response = await api.patch(`/projects/${projectId}/progress`, { progress });
    return response.data;
  },

  // Archive project
  archiveProject: async (projectId, archived = true) => {
    const response = await api.patch(`/projects/${projectId}/archive`, { archived });
    return response.data;
  }
};
