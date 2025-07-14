import React, { useState, useEffect } from 'react';
import { CheckSquare, FolderOpen, Users, Calendar, MessageSquare, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const Dashboard = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalTasks: 0,
    activeProjects: 0,
    teamMembers: 0,
    upcomingSchedules: 0,
    discordLinked: false
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentSchedules, setRecentSchedules] = useState([]);
  const [teamActivity, setTeamActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setError(null);
      console.log('Dashboard: Starting to fetch data');
      
      // Fetch data from your Team Planner backend
      const [
        tasksResponse,
        usersResponse,
        projectsResponse,
        schedulesResponse,
        notificationsResponse,
        profileResponse
      ] = await Promise.all([
        api.get('/tasks').catch(() => ({ data: [] })),
        user?.role === 'admin' ? api.get('/auth/users').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        api.get('/projects').catch(() => ({ data: [] })),
        api.get('/schedules/my-schedule').catch(() => ({ data: {} })),
        api.get('/notifications').catch(() => ({ data: [] })),
        api.get('/auth/me').catch(() => ({ data: { user: user } }))
      ]);

      // Process tasks data
      const tasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
      
      // Process users data (handle both formats)
      const users = usersResponse.data?.data || usersResponse.data || [];
      
      // Process projects data
      const projects = Array.isArray(projectsResponse.data) ? projectsResponse.data : [];
      
      // Process schedules data
      const schedules = schedulesResponse.data || {};
      const scheduleEntries = Object.entries(schedules).map(([date, location]) => ({
        date,
        location: typeof location === 'object' ? location.type : location
      }));
      
      // Process notifications
      const notificationsData = Array.isArray(notificationsResponse.data) ? notificationsResponse.data : [];
      
      // Check Discord integration
      const profileData = profileResponse.data?.user || user;
      const discordLinked = !!(profileData?.discordId);

      // Calculate active projects
      const activeProjects = projects.filter(project => 
        project.status !== 'completed' && 
        project.status !== 'cancelled' && 
        !project.isArchived
      ).length;

      // Get upcoming schedules (next 7 days)
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingSchedules = scheduleEntries.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= today && scheduleDate <= nextWeek;
      }).length;

      setStats({
        totalTasks: tasks.length,
        activeProjects: activeProjects,
        teamMembers: users.length,
        upcomingSchedules: upcomingSchedules,
        discordLinked: discordLinked
      });

      setRecentTasks(tasks.slice(0, 5));
      setRecentSchedules(scheduleEntries.slice(0, 5));
      setNotifications(notificationsData.slice(0, 5));

      // Create team activity from various sources
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

      const scheduleActivity = scheduleEntries.slice(0, 2).map((schedule, index) => ({
        id: `schedule-${index}`,
        message: `Schedule for ${schedule.date}: ${schedule.location}`,
        timestamp: new Date().toISOString(), // Use current time as schedules don't have timestamps
        type: 'schedule'
      }));

      const allActivity = [...taskActivity, ...projectActivity, ...scheduleActivity]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

      setTeamActivity(allActivity);

    } catch (error) {
      console.error('Dashboard: Error fetching data:', error);
      setError('Failed to load dashboard data. Please try again.');
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

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="text-lg text-red-600">{error}</div>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
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
    { name: t('dashboard.totalTasks') || 'Total Tasks', value: stats.totalTasks.toString(), icon: CheckSquare, color: 'bg-blue-500' },
    { name: t('dashboard.activeProjects') || 'Active Projects', value: stats.activeProjects.toString(), icon: FolderOpen, color: 'bg-purple-500' },
    { name: t('dashboard.teamMembers') || 'Team Members', value: stats.teamMembers.toString(), icon: Users, color: 'bg-orange-500' },
    { name: 'Upcoming Schedules', value: stats.upcomingSchedules.toString(), icon: Calendar, color: 'bg-green-500' },
    { name: 'Discord Integration', value: stats.discordLinked ? 'Connected' : 'Not Connected', icon: MessageSquare, color: stats.discordLinked ? 'bg-indigo-500' : 'bg-gray-400' },
  ];

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const formatScheduleLocation = (location) => {
    if (typeof location === 'object') {
      return location.reason ? `${location.type} (${location.reason})` : location.type;
    }
    return location || 'Not specified';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title') || 'Dashboard'}</h1>
        <p className="mt-2 text-gray-600">{t('dashboard.welcome', { name: user?.name }) || `Welcome back, ${user?.name || 'User'}!`}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

      {/* Main Content Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3">
        {/* Recent Tasks */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard.recentTasks') || 'Recent Tasks'}</h3>
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
                      {t(`tasks.${task.status}`) || task.status}
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
              <p className="text-gray-500 text-sm">{t('dashboard.noTasks') || 'No tasks found'}</p>
            )}
          </div>
        </div>

        {/* Recent Schedules */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Schedules</h3>
          <div className="space-y-3">
            {recentSchedules.length > 0 ? (
              recentSchedules.map((schedule, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <span className="text-sm text-gray-900 font-medium">{schedule.date}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      Location: {formatScheduleLocation(schedule.location)}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No schedules found</p>
            )}
          </div>
        </div>

        {/* Team Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard.teamActivity') || 'Team Activity'}</h3>
          <div className="space-y-3">
            {teamActivity.length > 0 ? (
              teamActivity.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'project' ? 'bg-purple-500' : 
                    activity.type === 'schedule' ? 'bg-blue-500' : 
                    'bg-green-500'
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
              <p className="text-gray-500 text-sm">{t('dashboard.noActivity') || 'No recent activity'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Notifications</h3>
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div key={notification._id || index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded">
                  <div className="w-2 h-2 rounded-full mt-2 bg-blue-500"></div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-900 font-medium">{notification.title || 'Notification'}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      {notification.message || 'No message'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(notification.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <button 
              onClick={() => window.location.href = '/schedule'}
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Calendar className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-blue-900">View Schedule</span>
            </button>
            
            {user?.role === 'admin' && (
              <>
                <button 
                  onClick={() => window.location.href = '/admin/users'}
                  className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Users className="h-8 w-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-900">Manage Users</span>
                </button>
                
                <button 
                  onClick={() => window.location.href = '/admin/schedules'}
                  className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Calendar className="h-8 w-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-900">Manage Schedules</span>
                </button>
              </>
            )}
            
            <button 
              onClick={() => window.location.href = '/profile'}
              className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <MessageSquare className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-orange-900">Discord Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
