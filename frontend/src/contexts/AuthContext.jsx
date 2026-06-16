import React, { createContext, useState, useContext, useEffect } from 'react';
import { setApiKey } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [secretKey, setSecretKey] = useState(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const login = (key) => {
    setSecretKey(key);
    setApiKey(key);
  };

  const logout = () => {
    setSecretKey(null);
    setApiKey(null);
  };

  return (
    <AuthContext.Provider value={{ secretKey, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
