import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Work Schedule', href: '/schedule', icon: Calendar },
  ];

  // Add admin-only navigation items
  if (isAdmin) {
    navigation.push(
      { name: 'User Management', href: '/admin/users', icon: Users },
      { name: 'Schedule Management', href: '/admin/schedules', icon: Settings }
    );
  }

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors duration-200`}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'
                    } mr-3 flex-shrink-0 h-6 w-6`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
