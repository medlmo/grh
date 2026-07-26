import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      button: 'btn-danger',
    },
    warning: {
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      button: 'btn btn-warning',
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      button: 'btn-primary',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`confirm-icon ${styles.iconBg} ${styles.iconColor}`}>
            <AlertTriangle size={28} />
          </div>
          <button className="btn-icon text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body text-center">
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-message">{message}</p>
        </div>
        <div className="modal-footer justify-center gap-3">
          <button className="btn btn-outline px-6" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${styles.button} px-6`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Traitement...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;