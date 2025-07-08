import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const ProjectForm = ({ isOpen, onClose, onSubmit, project = null }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    startDate: '',
    dueDate: '',
    teamMembers: [],
    color: '#3B82F6'
  });

  const [availableUsers, setAvailableUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '',
    assignee: '', 
    priority: 'medium', 
    startDate: '',
    dueDate: ''
  });
  const [showTaskForm, setShowTaskForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (project) {
        setFormData({
          name: project.name || '',
          description: project.description || '',
          status: project.status || 'planning',
          priority: project.priority || 'medium',
          startDate: project.startDate ? project.startDate.split('T')[0] : '',
          dueDate: project.dueDate ? project.dueDate.split('T')[0] : '',
          teamMembers: project.teamMembers?.map(member => member.userId || member) || [],
          color: project.color || '#3B82F6'
        });
        setTasks([]);
      } else {
        setFormData({
          name: '',
          description: '',
          status: 'planning',
          priority: 'medium',
          startDate: '',
          dueDate: '',
          teamMembers: [],
          color: '#3B82F6'
        });
        setTasks([]);
      }
    }
  }, [isOpen, project]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      setAvailableUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAvailableUsers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const projectData = {
      ...formData,
      teamMembers: formData.teamMembers,
      tasks: project ? [] : tasks // Only include tasks for new projects
    };
    
    onSubmit(projectData);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleTeamMemberToggle = (userId) => {
    const isSelected = formData.teamMembers.includes(userId);
    setFormData({
      ...formData,
      teamMembers: isSelected 
        ? formData.teamMembers.filter(id => id !== userId)
        : [...formData.teamMembers, userId]
    });
  };

  const handleAddTask = () => {
    if (newTask.title && newTask.assignee) {
      setTasks([...tasks, { 
        ...newTask, 
        id: Date.now(),
        startDate: newTask.startDate || new Date().toISOString().split('T')[0],
        dueDate: newTask.dueDate || new Date().toISOString().split('T')[0]
      }]);
      setNewTask({ 
        title: '', 
        description: '',
        assignee: '', 
        priority: 'medium',
        startDate: '',
        dueDate: ''
      });
      setShowTaskForm(false);
    }
  };

  const handleRemoveTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const projectColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#06B6D4'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {project ? 'Edit Project' : 'Create Project'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="onHold">On Hold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex space-x-2">
              {projectColors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Members
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
              {availableUsers.map(user => (
                <label key={user.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.teamMembers.includes(user.id)}
                    onChange={() => handleTeamMemberToggle(user.id)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">{user.name} - {user.department || 'No Department'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tasks Section - Only for new projects */}
          {!project && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tasks
                </label>
                <button
                  type="button"
                  onClick={() => setShowTaskForm(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </button>
              </div>

              {showTaskForm && (
                <div className="bg-gray-50 p-3 rounded-md mb-2">
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Task title *"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className={`w-full px-2 py-1 border ${!newTask.title ? 'border-red-300' : 'border-gray-300'} rounded text-sm`}
                    />
                    <textarea
                      placeholder="Task description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      rows="2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newTask.assignee}
                        onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                        className={`px-2 py-1 border ${!newTask.assignee ? 'border-red-300' : 'border-gray-300'} rounded text-sm`}
                      >
                        <option value="">Select assignee *</option>
                        {availableUsers.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        placeholder="Start Date"
                        value={newTask.startDate}
                        onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="date"
                        placeholder="Due Date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    
                    {/* Validation hint */}
                    {(!newTask.title || !newTask.assignee) && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        <strong>Required fields:</strong> Please fill in the task title and select an assignee before adding the task.
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowTaskForm(false)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTask}
                      disabled={!newTask.title || !newTask.assignee}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!newTask.title || !newTask.assignee ? 'Please fill in required fields' : 'Add task'}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No tasks added</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map(task => {
                      const assignee = availableUsers.find(u => u.id === task.assignee);
                      return (
                        <div key={task.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{task.title}</div>
                            <div className="text-xs text-gray-500">
                              {assignee?.name || 'Unassigned'} - {task.priority} priority
                              {task.dueDate && ` - Due: ${task.dueDate}`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(task.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;
