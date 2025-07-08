import React, { useState, useEffect } from 'react';
import { CheckSquare, FolderOpen, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const Dashboard = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalTasks: 0,
    activeProjects: 0,
    teamMembers: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [teamActivity, setTeamActivity] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // Only fetch data if user is authenticated and not loading
    if (isAuthenticated && !loading && user) {
      console.log('Dashboard: User is authenticated, fetching data');
      fetchDashboardData();
    } else {
      console.log('Dashboard: Waiting for authentication', { isAuthenticated, loading, user: user?.email });
    }
  }, [isAuthenticated, loading, user]);

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      console.log('Dashboard: Starting to fetch data');
      
      const [tasksResponse, usersResponse, projectsResponse] = await Promise.all([
        api.get('/tasks').catch(() => ({ data: [] })),
        user?.role === 'admin' ? api.get('/auth/users').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.get('/projects').catch(() => ({ data: [] }))
      ]);

      const tasks = tasksResponse.data;
      const users = usersResponse.data;
      const projects = projectsResponse.data;

      const activeProjects = projects.filter(project => 
        project.status !== 'completed' && 
        project.status !== 'cancelled' && 
        !project.isArchived
      ).length;

      setStats({
        totalTasks: tasks.length,
        activeProjects: activeProjects,
        teamMembers: users.length
      });

      setRecentTasks(tasks.slice(0, 5));

      const taskActivity = tasks.slice(0, 2).map(task => ({
        id: `task-${task._id}`,
        message: `Task "${task.title}" status: ${task.status}`,
        timestamp: task.updatedAt || task.createdAt,
        type: 'task'
      }));

      const projectActivity = projects.slice(0, 2).map(project => ({
        id: `project-${project._id}`,
        message: `Project "${project.name}" - ${project.status}`,
        timestamp: project.updatedAt || project.createdAt,
        type: 'project'
      }));

      const allActivity = [...taskActivity, ...projectActivity]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

      setTeamActivity(allActivity);

    } catch (error) {
      console.error('Dashboard: Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // Show loading if auth is still loading
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show loading if data is being fetched
  if (dataLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading dashboard data...</div>
      </div>
    );
  }

  const statsData = [
    { name: t('dashboard.totalTasks'), value: stats.totalTasks.toString(), icon: CheckSquare, color: 'bg-blue-500' },
    { name: t('dashboard.activeProjects'), value: stats.activeProjects.toString(), icon: FolderOpen, color: 'bg-purple-500' },
    { name: t('dashboard.teamMembers'), value: stats.teamMembers.toString(), icon: Users, color: 'bg-orange-500' },
  ];

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="mt-2 text-gray-600">{t('dashboard.welcome', { name: user?.name })}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statsData.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard.recentTasks')}</h3>
          <div className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.map(task => (
                <div key={task._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <span className="text-sm text-gray-900 font-medium">{task.title}</span>
                    {task.userId && (
                      <div className="text-xs text-gray-500 mt-1">
                        Assigned to: {task.userId.name || task.userId}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.status === 'done' ? 'bg-green-100 text-green-800' :
                      task.status === 'inprogress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {t(`tasks.${task.status}`)}
                    </span>
                    {task.priority && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">{t('dashboard.noTasks')}</p>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard.teamActivity')}</h3>
          <div className="space-y-3">
            {teamActivity.length > 0 ? (
              teamActivity.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'project' ? 'bg-purple-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-900">{activity.message}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">{t('dashboard.noActivity')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
