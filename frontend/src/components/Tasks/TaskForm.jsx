import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const TaskForm = ({ isOpen, onClose, onSubmit, task = null }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
    assignee: ''
  });
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/auth/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (task) {
      setFormData({
        title: String(task.title || ''),
        description: String(task.description || ''),
        priority: String(task.priority || 'medium'),
        status: String(task.status || 'todo'),
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        assignee: String(task.assignee || '')
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        dueDate: '',
        assignee: ''
      });
    }
  }, [task, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanFormData = {
      ...formData,
      title: String(formData.title),
      description: String(formData.description),
      priority: String(formData.priority),
      status: String(formData.status),
      assignee: String(formData.assignee)
    };
    onSubmit(cleanFormData);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      dueDate: '',
      assignee: ''
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {task ? t('tasks.editTask') : t('tasks.createTask')}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.taskTitle')}
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('tasks.enterTitle')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('tasks.enterDescription')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.priority')}
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">{t('tasks.low')}</option>
                <option value="medium">{t('tasks.medium')}</option>
                <option value="high">{t('tasks.high')}</option>
                <option value="urgent">{t('tasks.urgent')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.status')}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todo">{t('tasks.todo')}</option>
                <option value="inprogress">{t('tasks.inProgress')}</option>
                <option value="done">{t('tasks.done')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.dueDate')}
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.assignee')}
            </label>
            <select
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingUsers}
            >
              <option value="">{t('tasks.selectAssignee')}</option>
              {users.map(user => (
                <option key={user.id} value={user.name}>
                  {user.name} - {user.department || t('admin.department')}
                </option>
              ))}
            </select>
            {loadingUsers && (
              <p className="text-xs text-gray-500 mt-1">{t('errors.loadingUsers')}</p>
            )}
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
              {task ? t('tasks.updateTask') : t('tasks.createTask')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
