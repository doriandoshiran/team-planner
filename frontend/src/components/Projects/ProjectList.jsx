import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Users, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProjectForm from './ProjectForm';
import { projectService } from '../../services/projectService';

const ProjectList = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const projects = await projectService.getProjects();
      setProjects(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      const newProject = await projectService.createProject(projectData);
      setProjects([newProject, ...projects]);
    } catch (error) {
      console.error('Error creating project:', error);
      alert(t('errors.creatingTask', { error: error.message }));
    }
  };

  const handleUpdateProject = async (projectData) => {
    try {
      const updatedProject = await projectService.updateProject(editingProject._id, projectData);
      setProjects(projects.map(project => 
        project._id === editingProject._id ? updatedProject : project
      ));
    } catch (error) {
      console.error('Error updating project:', error);
      alert(t('errors.updatingTask', { error: error.message }));
    }
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm(t('projects.deleteConfirm'))) {
      try {
        await projectService.deleteProject(id);
        setProjects(projects.filter(project => project._id !== id));
      } catch (error) {
        console.error('Error deleting project:', error);
        alert(t('errors.deletingTask', { error: error.message }));
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planning': return 'text-yellow-600 bg-yellow-100';
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'on-hold': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('projects.title')}</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{t('projects.addProject')}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { key: 'all', label: t('projects.allProjects') },
          { key: 'planning', label: t('projects.planning') },
          { key: 'active', label: t('projects.active') },
          { key: 'completed', label: t('projects.completed') },
          { key: 'on-hold', label: t('projects.onHold') }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === tab.key
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Project Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map(project => (
          <div key={project._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                ></div>
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingProject(project);
                    setIsFormOpen(true);
                  }}
                  className="text-gray-400 hover:text-blue-600"
                  title={t('common.edit')}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteProject(project._id)}
                  className="text-gray-400 hover:text-red-600"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-gray-600 mb-4">{project.description}</p>

            {/* Progress Bar */}
            {project.tasks && project.tasks.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{t('projects.progress')}</span>
                  <span>{project.tasks.filter(t => t.completed).length}/{project.tasks.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${project.tasks.length > 0 ? (project.tasks.filter(t => t.completed).length / project.tasks.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                {t(`projects.${project.status}`)}
              </span>
              
              {project.endDate && (
                <span className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(project.endDate).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Budget Display */}
            {project.budget > 0 && (
              <div className="mb-4 text-sm text-gray-600">
                <span className="font-medium">{t('projects.budget')}: </span>
                ${project.budget.toLocaleString()}
              </div>
            )}

            {project.teamMembers && project.teamMembers.length > 0 && (
              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-1" />
                <span>{t('projects.teamMemberCount', { count: project.teamMembers.length })}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{t('projects.noProjects')}</p>
        </div>
      )}

      <ProjectForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProject(null);
        }}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        project={editingProject}
      />
    </div>
  );
};

export default ProjectList;
