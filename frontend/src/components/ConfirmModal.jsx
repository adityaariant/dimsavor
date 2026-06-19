import React from 'react';

export default function ConfirmModal({ isOpen, title, body, onConfirm, onCancel, confirmText = 'Confirm' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--text-primary)]/40 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
      
      <div className="relative bg-[var(--bg-surface)] rounded-[14px] border border-[var(--border)] shadow-paper max-w-md w-full overflow-hidden transform transition-all p-[24px]">
        <div>
          <h3 className="text-[18px] font-bold font-['Fraunces'] text-[var(--text-primary)]" id="modal-title">{title}</h3>
          <div className="mt-[12px]">
            <p className="text-[14px] text-[var(--text-secondary)] font-['Inter_Tight_Variable'] leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="mt-[24px] pt-[16px] border-t border-[var(--border)] flex justify-end gap-[12px]">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn-destructive"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
