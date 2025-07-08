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

// Import i18n configuration
import './i18n';

// Protected Route Component - FIXED
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  console.log('ProtectedRoute: isAuthenticated =', isAuthenticated, 'loading =', loading, 'user =', user?.email);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('ProtectedRoute: Authenticated, rendering children');
  return children;
};

// Admin Route Component - FIXED
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  
  console.log('AdminRoute: isAuthenticated =', isAuthenticated, 'isAdmin =', isAdmin, 'loading =', loading);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Public Route Component - FIXED
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('PublicRoute: isAuthenticated =', isAuthenticated, 'loading =', loading);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
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
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="schedule" element={<WorkSchedule />} />
              <Route path="tasks" element={<TaskList />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="admin/users" element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              } />
              <Route path="admin/schedules" element={
                <AdminRoute>
                  <ScheduleManagement />
                </AdminRoute>
              } />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
