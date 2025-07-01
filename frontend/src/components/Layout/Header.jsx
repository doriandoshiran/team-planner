import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NotificationCenter from '../Notifications/NotificationCenter';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

const Header = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Team Work Schedule</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Notification Center */}
            <NotificationCenter />
            
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-500" />
              <div className="text-sm">
                <div className="text-gray-700 font-medium">{user?.name}</div>
                <div className="text-gray-500 text-xs">{user?.role}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm">{t('navigation.logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
