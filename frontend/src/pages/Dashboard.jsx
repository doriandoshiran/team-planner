import React from 'react';
import { CheckSquare, Clock, FolderOpen, Users } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { name: 'Total Tasks', value: '12', icon: CheckSquare, color: 'bg-blue-500' },
    { name: 'Hours This Week', value: '32', icon: Clock, color: 'bg-green-500' },
    { name: 'Active Projects', value: '3', icon: FolderOpen, color: 'bg-purple-500' },
    { name: 'Team Members', value: '8', icon: Users, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's what's happening with your team.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Tasks</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-sm text-gray-900">Update user interface</span>
              <span className="text-xs text-gray-500">Due today</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-sm text-gray-900">Fix login bug</span>
              <span className="text-xs text-gray-500">Due tomorrow</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Team Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-900">John completed "Database migration"</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-900">Sarah started "API documentation"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
