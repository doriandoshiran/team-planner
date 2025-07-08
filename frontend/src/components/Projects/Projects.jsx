import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ProjectForm from './ProjectForm';
import ProjectDetails from './ProjectDetails';
import api from '../../services/api';

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      const { tasks, ...projectInfo } = projectData;
      
      // Create the project first
      const response = await api.post('/projects', projectInfo);
      const savedProject = response.data;
      
      // Create tasks if any
      if (tasks && tasks.length > 0) {
        for (const task of tasks) {
          const taskData = {
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            status: 'todo',
            startDate: task.startDate || new Date().toISOString().split('T')[0],
            dueDate: task.dueDate || new Date().toISOString().split('T')[0],
            userId: task.assignee,
            project: savedProject._id,
            tags: []
          };
          
          await api.post('/tasks', taskData);
        }
        
        // Fetch updated project with tasks
        const updatedProjectResponse = await api.get(`/projects/${savedProject._id}`);
        setProjects(prevProjects => [updatedProjectResponse.data, ...prevProjects]);
      } else {
        setProjects(prevProjects => [savedProject, ...prevProjects]);
      }
      
      setShowProjectForm(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const handleUpdateProject = async (projectData) => {
    try {
      const response = await api.put(`/projects/${editingProject._id}`, projectData);
      setProjects(prevProjects => 
        prevProjects.map(p => p._id === editingProject._id ? response.data : p)
      );
      setShowProjectForm(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project');
    }
  };

  const handleDeleteProject = async (project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This will also delete all associated tasks.`)) {
      try {
        await api.delete(`/projects/${project._id}`);
        setProjects(prevProjects => prevProjects.filter(p => p._id !== project._id));
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
      }
    }
  };

  const handleProjectClick = (project, e) => {
    if (e) e.stopPropagation();
    console.log('Project clicked:', project);
    setSelectedProject(project);
    setShowProjectDetails(true);
  };

  const handleEditProject = (project, e) => {
    if (e) e.stopPropagation();
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'planning': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'onHold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Manage and track your projects</p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setShowProjectForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="onHold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <div
            key={project._id}
            className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow cursor-pointer"
            onClick={(e) => handleProjectClick(project, e)}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {project.name}
                </h3>
                <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleProjectClick(project, e)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleEditProject(project, e)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Edit Project"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project);
                    }}
                    className="text-red-400 hover:text-red-600 p-1"
                    title="Delete Project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {project.description || 'No description provided'}
              </p>

              <div className="flex justify-between items-center mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                <span>{project.teamMembers?.length || 0} members</span>
                <span>{project.tasks?.length || 0} tasks</span>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{project.progress || 0}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${project.progress || 0}%` }}
                  ></div>
                </div>
              </div>

              {project.dueDate && (
                <div className="text-xs text-gray-500">
                  Due: {new Date(project.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first project'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => {
                setEditingProject(null);
                setShowProjectForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Create Project
            </button>
          )}
        </div>
      )}

      {/* Project Form Modal */}
      <ProjectForm
        isOpen={showProjectForm}
        onClose={() => {
          setShowProjectForm(false);
          setEditingProject(null);
        }}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        project={editingProject}
      />

      {/* Project Details Modal */}
      <ProjectDetails
        isOpen={showProjectDetails}
        onClose={() => {
          setShowProjectDetails(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
      />
    </div>
  );
};

export default Projects;
