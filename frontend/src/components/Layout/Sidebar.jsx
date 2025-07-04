import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, CheckSquare, FolderOpen, Users, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const Sidebar = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();

  const navigation = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: Home },
    { name: t('navigation.schedule'), href: '/schedule', icon: Calendar },
    { name: t('navigation.tasks'), href: '/tasks', icon: CheckSquare },
    { name: t('navigation.projects'), href: '/projects', icon: FolderOpen },
  ];

  // Add admin-only navigation items
  if (isAdmin) {
    navigation.push(
      { name: t('navigation.userManagement'), href: '/admin/users', icon: Users },
      { name: t('navigation.scheduleManagement'), href: '/admin/schedules', icon: Settings }
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
