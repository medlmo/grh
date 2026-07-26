import React from 'react';
import { XCircle } from 'lucide-react';
import { TFunction } from 'i18next';

interface RefuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  motif: string;
  setMotif: (motif: string) => void;
  onConfirm: () => void;
  t: TFunction;
}

const RefuseModal: React.FC<RefuseModalProps> = ({
  isOpen,
  onClose,
  motif,
  setMotif,
  onConfirm,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="confirm-icon bg-red-100 text-red-600">
            <XCircle size={28} />
          </div>
        </div>
        <div className="modal-body text-center">
          <h4 className="confirm-title">{t('conges.reject')}</h4>
          <p className="confirm-message mb-4">{t('conges.reject_reason')}</p>
          <textarea
            className="form-textarea text-start"
            rows={3}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
        </div>
        <div className="modal-footer justify-center">
          <button className="btn btn-outline" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={!motif.trim()}
          >
            {t('conges.reject')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefuseModal;
