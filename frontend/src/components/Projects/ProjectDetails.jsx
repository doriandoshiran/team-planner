import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, Flag, CheckSquare, Building, Mail } from 'lucide-react';
import api from '../../services/api';

const ProjectDetails = ({ isOpen, onClose, project }) => {
  const [projectTasks, setProjectTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      fetchProjectTasks();
    }
  }, [isOpen, project]);

  const fetchProjectTasks = async () => {
    if (!project?._id) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/tasks?project=${project._id}`);
      setProjectTasks(response.data);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      setProjectTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'inprogress': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
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

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">{project.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Project Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Project Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="text-gray-900">{project.description || 'No description provided'}</p>
                </div>
                <div className="flex space-x-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Priority:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </div>
                </div>
                {project.dueDate && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Due Date:</span>
                    <p className="text-gray-900">{new Date(project.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-500">Progress:</span>
                  <div className="mt-1">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${project.progress || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 mt-1">{project.progress || 0}% complete</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Team Members ({project.teamMembers?.length || 0})
              </h3>
              <div className="space-y-2">
                {project.teamMembers?.map((member, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {member.name?.charAt(0) || member.userId?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{member.name || member.userId?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{member.role || 'member'}</div>
                    </div>
                  </div>
                )) || <p className="text-gray-500">No team members assigned</p>}
              </div>
            </div>
          </div>

          {/* Project Tasks */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <CheckSquare className="h-5 w-5 mr-2" />
              Project Tasks ({projectTasks.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-8">Loading tasks...</div>
            ) : projectTasks.length > 0 ? (
              <div className="space-y-3">
                {projectTasks.map(task => (
                  <div key={task._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{task.title}</h4>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Assigned to: {task.userId?.name || 'Unassigned'}</span>
                      {task.dueDate && (
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No tasks found for this project</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
