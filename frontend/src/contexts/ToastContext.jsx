import React, { createContext, useContext, useCallback } from 'react';
import { toast } from 'sonner';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const showToast = useCallback((message, type = 'info') => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else if (type === 'warning') {
      toast.warning(message);
    } else {
      toast(message);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
};
