import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Flag, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TaskForm from './TaskForm';
import { taskService } from '../../services/taskService';

const TaskList = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getTasks();
      
      const safeTasks = Array.isArray(data) ? data.map(task => ({
        _id: task._id || task.id || Math.random().toString(),
        title: String(task.title || t('tasks.taskTitle')),
        description: String(task.description || ''),
        priority: String(task.priority || 'medium'),
        status: String(task.status || 'todo'),
        dueDate: task.dueDate || null,
        assignee: String(task.assignee || '')
      })) : [];
      
      setTasks(safeTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError(error.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const newTask = await taskService.createTask(taskData);
      const safeTask = {
        _id: newTask._id || newTask.id || Math.random().toString(),
        title: String(newTask.title || taskData.title || t('tasks.taskTitle')),
        description: String(newTask.description || taskData.description || ''),
        priority: String(newTask.priority || taskData.priority || 'medium'),
        status: String(newTask.status || taskData.status || 'todo'),
        dueDate: newTask.dueDate || taskData.dueDate || null,
        assignee: String(newTask.assignee || taskData.assignee || '')
      };
      
      setTasks([safeTask, ...tasks]);
    } catch (error) {
      console.error('Error creating task:', error);
      alert(t('errors.creatingTask', { error: error.message || t('errors.unknown') }));
    }
  };

  const handleUpdateTask = async (taskData) => {
    try {
      const updatedTask = await taskService.updateTask(editingTask._id, taskData);
      
      setTasks(tasks.map(task => 
        task._id === editingTask._id ? {
          ...task,
          title: String(updatedTask.title || taskData.title || task.title),
          description: String(updatedTask.description || taskData.description || task.description),
          priority: String(updatedTask.priority || taskData.priority || task.priority),
          status: String(updatedTask.status || taskData.status || task.status),
          dueDate: updatedTask.dueDate || taskData.dueDate || task.dueDate,
          assignee: String(updatedTask.assignee || taskData.assignee || task.assignee)
        } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      alert(t('errors.updatingTask', { error: error.message || t('errors.unknown') }));
    }
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm(t('tasks.deleteConfirm'))) {
      try {
        await taskService.deleteTask(id);
        setTasks(tasks.filter(task => task._id !== id));
      } catch (error) {
        console.error('Error deleting task:', error);
        alert(t('errors.deletingTask', { error: error.message || t('errors.unknown') }));
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      setTasks(tasks.map(task => 
        task._id === taskId ? { ...task, status: String(newStatus) } : task
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
      alert(t('errors.updatingTask', { error: error.message || t('errors.unknown') }));
    }
  };

  const getPriorityColor = (priority) => {
    const safePriority = String(priority || 'medium').toLowerCase();
    switch (safePriority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    const safeStatus = String(status || 'todo').toLowerCase();
    switch (safeStatus) {
      case 'todo': return 'text-gray-600 bg-gray-100';
      case 'inprogress': return 'text-blue-600 bg-blue-100';
      case 'done': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (!task || typeof task !== 'object') return false;
    if (filter === 'all') return true;
    return String(task.status || '').toLowerCase() === filter;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">{t('common.loading')}</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">{t('errors.loadingTasks', { error })}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{t('tasks.addTask')}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { key: 'all', label: t('tasks.allTasks') },
          { key: 'todo', label: t('tasks.todo') },
          { key: 'inprogress', label: t('tasks.inProgress') },
          { key: 'done', label: t('tasks.done') }
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

      {/* Task Grid */}
      <div className="grid gap-4">
        {filteredTasks.map(task => {
          if (!task || !task._id) {
            return null;
          }

          return (
            <div key={task._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {task.title}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingTask(task);
                      setIsFormOpen(true);
                    }}
                    className="text-gray-400 hover:text-blue-600"
                    title={t('common.edit')}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="text-gray-400 hover:text-red-600"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 mb-3">{task.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    <Flag className="h-3 w-3 inline mr-1" />
                    {t(`tasks.${task.priority}`)}
                  </span>
                  
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task._id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${getStatusColor(task.status)}`}
                  >
                    <option value="todo">{t('tasks.todo')}</option>
                    <option value="inprogress">{t('tasks.inProgress')}</option>
                    <option value="done">{t('tasks.done')}</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  {task.dueDate && (
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {(() => {
                        try {
                          return new Date(task.dueDate).toLocaleDateString();
                        } catch (error) {
                          return t('errors.unknown');
                        }
                      })()}
                    </span>
                  )}
                  {task.assignee && (
                    <span className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {String(task.assignee)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('tasks.noTasks')}</p>
        </div>
      )}

      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
      />
    </div>
  );
};

export default TaskList;
