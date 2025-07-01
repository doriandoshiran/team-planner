import React, { useState, useEffect } from 'react';
import { CheckSquare, Clock, FolderOpen, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalTasks: 0,
    hoursThisWeek: 0,
    activeProjects: 0,
    teamMembers: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [teamActivity, setTeamActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [tasksResponse, usersResponse] = await Promise.all([
        api.get('/tasks').catch(() => ({ data: [] })),
        user?.role === 'admin' ? api.get('/auth/users').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);

      const tasks = tasksResponse.data;
      const users = usersResponse.data;

      setStats({
        totalTasks: tasks.length,
        hoursThisWeek: 0,
        activeProjects: 0,
        teamMembers: users.length
      });

      setRecentTasks(tasks.slice(0, 5));

      const activity = tasks.slice(0, 3).map(task => ({
        id: task._id,
        message: `${t('tasks.title')} "${task.title}" ${t('tasks.status')}: ${t(`tasks.${task.status}`)}`,
        timestamp: task.updatedAt || task.createdAt
      }));
      setTeamActivity(activity);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    { name: t('dashboard.totalTasks'), value: stats.totalTasks.toString(), icon: CheckSquare, color: 'bg-blue-500' },
    { name: t('dashboard.hoursThisWeek'), value: stats.hoursThisWeek.toString(), icon: Clock, color: 'bg-green-500' },
    { name: t('dashboard.activeProjects'), value: stats.activeProjects.toString(), icon: FolderOpen, color: 'bg-purple-500' },
    { name: t('dashboard.teamMembers'), value: stats.teamMembers.toString(), icon: Users, color: 'bg-orange-500' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="mt-2 text-gray-600">{t('dashboard.welcome', { name: user?.name })}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                  <span className="text-sm text-gray-900">{task.title}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    task.status === 'done' ? 'bg-green-100 text-green-800' :
                    task.status === 'inprogress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {t(`tasks.${task.status}`)}
                  </span>
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
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-900">{activity.message}</span>
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
