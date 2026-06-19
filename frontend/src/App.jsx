import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './screens/Dashboard';
import Sessions from './screens/Sessions';
import Finance from './screens/Finance';
import Alias from './screens/Alias';
import Login from './screens/Login';
import Assets from './screens/Assets';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';

function AppContent() {
  const { session } = useAuth();

  if (!session) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="finance" element={<Finance />} />
          <Route path="alias" element={<Alias />} />
          <Route path="assets" element={<Assets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
