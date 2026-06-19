import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ id, message, type = 'info', onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, onClose, duration]);

  const variants = {
    success: 'bg-[#EDE9E0] border-[#C3BDAE] text-[var(--text-primary)]',
    error: 'bg-[#FBE9E7] border-[#FFCCBC] text-[#D32F2F]',
    info: 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)]',
  };

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-[#4CAF50]" />,
    error: <AlertCircle className="w-4 h-4 text-[#D32F2F]" />,
    info: <Info className="w-4 h-4 text-[var(--text-secondary)]" />
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-[12px] p-[12px_16px] rounded-[8px] border shadow-soft ${variants[type]} animate-in slide-in-from-right fade-in duration-300 font-['Inter_Tight_Variable'] text-[13px] min-w-[280px] max-w-[400px]`}>
      <div className="shrink-0">{icons[type]}</div>
      <div className="flex-1 mr-[8px]">{message}</div>
      <button 
        onClick={() => onClose(id)} 
        className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
