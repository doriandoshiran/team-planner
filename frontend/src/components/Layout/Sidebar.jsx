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
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
      <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-gray-800 to-gray-900 shadow-xl">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-3 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const isAdminItem = item.href.startsWith('/admin');
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive
                      ? isAdminItem
                        ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg transform scale-105'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } group flex items-center px-4 py-3 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200`}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                    } mr-3 flex-shrink-0 h-5 w-5`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          {/* Admin Section Separator */}
          {isAdmin && (
            <div className="px-3 mt-6">
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">
                  {t('navigation.administration')}
                </h3>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
