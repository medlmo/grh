import React from 'react';
import { XCircle, AlertCircle, Send } from 'lucide-react';
import { TFunction } from 'i18next';
import { TypeConfig } from '../../types/conges';
import { typeLabel, TYPE_ORDER } from '../../utils/congesHelpers';

interface CongeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  types: TypeConfig[];
  formError: string | null;
  formSubmitting: boolean;
  t: TFunction;
  form: { type: string; dateDebut: string; dateFin: string; motif: string };
  setForm: React.Dispatch<React.SetStateAction<{ type: string; dateDebut: string; dateFin: string; motif: string }>>;
  onSubmit: (submit: boolean) => void;
}

const CongeFormModal: React.FC<CongeFormModalProps> = ({
  isOpen,
  onClose,
  types,
  formError,
  formSubmitting,
  t,
  form,
  setForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const sortedTypes = [...types].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{t('conges.request_form_title')}</h3>
          <button className="btn-icon" onClick={onClose}>
            <XCircle size={20} />
          </button>
        </div>
        <div className="modal-body">
          {formError && (
            <div className="login-error mb-4">
              <AlertCircle size={16} className="inline mr-2" />
              {formError}
            </div>
          )}
          <div className="form-row mb-4">
            <div className="form-group">
              <label className="form-label">
                {t('conges.type')} <span className="form-required">*</span>
              </label>
              <select
                className="form-select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="">{t('conges.select_type')}</option>
                {sortedTypes.map((tItem) => (
                  <option key={tItem.type} value={tItem.type}>
                    {typeLabel(tItem.type, t)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row mb-4">
            <div className="form-group">
              <label className="form-label">
                {t('conges.start_date')} <span className="form-required">*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={form.dateDebut}
                onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {t('conges.end_date')} <span className="form-required">*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={form.dateFin}
                onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">{t('conges.reason')}</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.motif}
              onChange={(e) => setForm({ ...form, motif: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSubmit(false)}
            disabled={formSubmitting}
          >
            {t('conges.save_draft')}
          </button>
          <button
            className="btn btn-accent"
            onClick={() => onSubmit(true)}
            disabled={formSubmitting}
          >
            <Send size={16} /> {t('conges.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CongeFormModal;
