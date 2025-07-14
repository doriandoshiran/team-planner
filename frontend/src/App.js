import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';
import WorkSchedule from './components/Schedule/WorkSchedule';
import UserManagement from './components/Admin/UserManagement';
import ScheduleManagement from './components/Admin/ScheduleManagement';
import TaskList from './components/Tasks/TaskList';
import ProjectList from './components/Projects/ProjectList';
import ProjectDetails from './components/Projects/ProjectDetails';
import UserTasks from './components/UserTasks';
import ProfileEdit from './components/ProfileEdit';

// Import i18n configuration
import './i18n';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  console.log('ProtectedRoute: isAuthenticated =', isAuthenticated, 'loading =', loading, 'user =', user?.email);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div className="text-lg text-gray-600 font-medium">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    console.log('ProtectedRoute: Admin access required, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('ProtectedRoute: Authenticated, rendering children');
  return children;
};

// Public Route Component (redirects if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('PublicRoute: isAuthenticated =', isAuthenticated, 'loading =', loading);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div className="text-lg text-gray-600 font-medium">Loading...</div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    console.log('PublicRoute: Already authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('PublicRoute: Not authenticated, rendering children');
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="schedule" element={<WorkSchedule />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="projects/:id" element={<ProjectDetails />} />
              <Route path="tasks" element={<TaskList />} />
              <Route path="user-tasks" element={<UserTasks />} />
              <Route path="profile" element={<ProfileEdit />} />
              
              {/* Admin Only Routes */}
              <Route path="admin/users" element={
                <ProtectedRoute adminOnly={true}>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="admin/schedules" element={
                <ProtectedRoute adminOnly={true}>
                  <ScheduleManagement />
                </ProtectedRoute>
              } />
            </Route>

            {/* Legacy redirect for timesheet (in case of bookmarks) */}
            <Route path="/timesheet" element={<Navigate to="/dashboard" replace />} />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
