import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './screens/Dashboard';
import Sessions from './screens/Sessions';
import Parse from './screens/Parse';
import Orders from './screens/Orders';
import Kitchen from './screens/Kitchen';
import Finance from './screens/Finance';
import Alias from './screens/Alias';
import Login from './screens/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { secretKey } = useAuth();

  if (!secretKey) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="parse" element={<Parse />} />
          <Route path="orders" element={<Orders />} />
          <Route path="kitchen" element={<Kitchen />} />
          <Route path="finance" element={<Finance />} />
          <Route path="alias" element={<Alias />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
