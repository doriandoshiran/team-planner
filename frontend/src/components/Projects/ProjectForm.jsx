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
    startDate: '',
    endDate: '',
    teamMembers: [],
    color: '#3B82F6',
    budget: 0
  });

  const [availableUsers, setAvailableUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', assignee: '', priority: 'medium', completed: false });
  const [showTaskForm, setShowTaskForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (project) {
        // Fixed date handling - properly extract date part
        setFormData({
          name: project.name || '',
          description: project.description || '',
          status: project.status || 'planning',
          startDate: project.startDate ? project.startDate.split('T')[0] : '',
          endDate: project.endDate ? project.endDate.split('T')[0] : '',
          teamMembers: project.teamMembers || [],
          color: project.color || '#3B82F6',
          budget: project.budget || 0
        });
        setTasks(project.tasks || []);
      } else {
        // Reset form for new project
        setFormData({
          name: '',
          description: '',
          status: 'planning',
          startDate: '',
          endDate: '',
          teamMembers: [],
          color: '#3B82F6',
          budget: 0
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, tasks });
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
      setTasks([...tasks, { ...newTask, id: Date.now() }]);
      setNewTask({ title: '', assignee: '', priority: 'medium', completed: false });
      setShowTaskForm(false);
    }
  };

  const handleRemoveTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleToggleTaskCompletion = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
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
            {project ? t('projects.editProject') : t('projects.createProject')}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('projects.projectName')}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('projects.enterName')}
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('projects.description')}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('projects.enterDescription')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('projects.status')}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="planning">{t('projects.planning')}</option>
                <option value="active">{t('projects.active')}</option>
                <option value="completed">{t('projects.completed')}</option>
                <option value="on-hold">{t('projects.onHold')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('projects.budget')}
              </label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.startDate')}
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.endDate')}
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('projects.color')}
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
              {t('projects.teamMembers')}
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
                  <span className="text-sm">{user.name} - {user.department || t('admin.department')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('tasks.title')}
              </label>
              <button
                type="button"
                onClick={() => setShowTaskForm(true)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>{t('tasks.addTask')}</span>
              </button>
            </div>

            {showTaskForm && (
              <div className="bg-gray-50 p-3 rounded-md mb-2">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder={t('tasks.enterTitle')}
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={newTask.assignee}
                    onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">{t('tasks.selectAssignee')}</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="low">{t('tasks.low')}</option>
                    <option value="medium">{t('tasks.medium')}</option>
                    <option value="high">{t('tasks.high')}</option>
                    <option value="urgent">{t('tasks.urgent')}</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {t('common.add')}
                  </button>
                </div>
              </div>
            )}

            <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">{t('tasks.noTasks')}</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => {
                    const assignee = availableUsers.find(u => u.id === task.assignee);
                    return (
                      <div key={task.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleToggleTaskCompletion(task.id)}
                            className="rounded text-blue-600"
                          />
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                              {task.title}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({assignee?.name || t('tasks.selectAssignee')} - {t(`tasks.${task.priority}`)})
                            </span>
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

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {project ? t('projects.updateProject') : t('projects.createProject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;
