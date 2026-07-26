import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FeriesTab.module.css';
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  AlertCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
  CalendarDays,
} from 'lucide-react';
import api from '../../api/client';
import { format, getDay, parseISO } from 'date-fns';
import { fr, ar } from 'date-fns/locale';

interface JourFerie {
  id: number;
  libelleFr: string;
  libelleAr: string;
  date: string;
  estMobile: boolean;
}

type TypeFilter = 'all' | 'fixed' | 'mobile';

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const FeriesTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const dateLocale = isRtl ? ar : fr;

  const [feries, setFeries] = useState<JourFerie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [annee, setAnnee] = useState(new Date().getFullYear());

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    libelleFr: '',
    libelleAr: '',
    date: '',
    estMobile: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteItem, setDeleteItem] = useState<JourFerie | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchFeries = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/parametrage/feries', { params: { annee } });
      setFeries(response.data);
    } catch (error) {
      console.error('Error fetching feries:', error);
      pushToast('error', t('holidays.error_loading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeries();
  }, [annee]);

  const filteredFeries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return feries
      .filter(f => {
        const matchesSearch =
          !term ||
          f.libelleFr.toLowerCase().includes(term) ||
          f.libelleAr.toLowerCase().includes(term) ||
          format(parseISO(f.date), 'dd/MM/yyyy').includes(term);
        const matchesType =
          typeFilter === 'all' ||
          (typeFilter === 'mobile' && f.estMobile) ||
          (typeFilter === 'fixed' && !f.estMobile);
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [feries, search, typeFilter]);

  const groupedByMonth = useMemo(() => {
    const groups: Record<number, JourFerie[]> = {};
    filteredFeries.forEach(f => {
      const month = new Date(f.date).getMonth();
      if (!groups[month]) groups[month] = [];
      groups[month].push(f);
    });
    return groups;
  }, [filteredFeries]);

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => format(new Date(annee, i, 1), 'MMMM', { locale: dateLocale })),
    [annee, dateLocale]
  );

  const weekDayNames = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        format(new Date(2024, 0, 7 + i), 'EEEE', { locale: dateLocale })
      ),
    [dateLocale]
  );

  const totalFeries = feries.length;
  const fixedCount = feries.filter(f => !f.estMobile).length;
  const mobileCount = feries.filter(f => f.estMobile).length;

  const statCards = [
    {
      key: 'total',
      value: totalFeries,
      icon: <CalendarDays size={22} />,
      color: 'blue',
    },
    {
      key: 'fixed',
      value: fixedCount,
      icon: <Sun size={22} />,
      color: 'emerald',
    },
    {
      key: 'mobile',
      value: mobileCount,
      icon: <Moon size={22} />,
      color: 'gold',
    },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await api.post('/parametrage/feries', form);
      setIsModalOpen(false);
      setForm({ libelleFr: '', libelleAr: '', date: '', estMobile: false });
      pushToast('success', t('holidays.success_created'));
      fetchFeries();
    } catch (error: any) {
      setFormError(
        error.response?.data?.message || t('holidays.error_create')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await api.delete(`/parametrage/feries/${deleteItem.id}`);
      pushToast('success', t('holidays.success_deleted'));
      fetchFeries();
    } catch (error) {
      console.error('Error deleting ferie:', error);
      pushToast('error', t('holidays.error_delete'));
    } finally {
      setIsDeleting(false);
      setDeleteItem(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setForm({ libelleFr: '', libelleAr: '', date: '', estMobile: false });
  };

  const isWeekend = (dateString: string) => {
    const day = getDay(parseISO(dateString));
    return day === 0 || day === 6;
  };

  return (
    <div className="animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`${styles['feries-header']}`}>
        <div className={`${styles['feries-header-title']}`}>
          <h2>{t('holidays.title')}</h2>
          <p>{t('holidays.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`${styles['feries-year-picker']}`}>
            <button
              className={`${styles['feries-year-btn']}`}
              onClick={() => setAnnee(annee - 1)}
              aria-label={t('holidays.previous_year')}
            >
              <ChevronLeft size={18} />
            </button>
            <span className={`${styles['feries-year-value']}`}>{annee}</span>
            <button
              className={`${styles['feries-year-btn']}`}
              onClick={() => setAnnee(annee + 1)}
              aria-label={t('holidays.next_year')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            className="btn btn-primary shadow-md hover:shadow-lg transition-all"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            {t('holidays.add')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={`${styles['feries-stats']}`}>
        {statCards.map(card => (
          <div key={card.key} className={`${styles['feries-stat']}`}>
            <div className={`feries-stat-icon ${card.color}`}>{card.icon}</div>
            <div className={`${styles['feries-stat-content']}`}>
              <span className={`${styles['feries-stat-value']}`}>{card.value}</span>
              <span className={`${styles['feries-stat-label']}`}>
                {t(`holidays.stat_${card.key}`)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {/* Mini calendar strip */}
          {!isLoading && feries.length > 0 && (
            <div className={`${styles['feries-calendar-strip']}`}>
              {Array.from({ length: 12 }, (_, month) => {
                const items = groupedByMonth[month] || [];
                return (
                  <div
                    key={month}
                    className={`feries-month-card ${items.length === 0 ? 'empty' : ''}`}
                  >
                    <div className={`${styles['feries-month-header']}`}>
                      <span className={`${styles['feries-month-name']}`}>{monthNames[month]}</span>
                      <span className={`${styles['feries-month-count']}`}>
                        {items.length} {t('holidays.days_count', { count: items.length })}
                      </span>
                    </div>
                    {items.length > 0 ? (
                      <div className={`${styles['feries-month-list']}`}>
                        {items.map(f => (
                          <div key={f.id} className={`${styles['feries-month-item']}`}>
                            <span
                              className={`feries-month-dot ${f.estMobile ? 'mobile' : 'is-fixed'}`}
                            />
                            <span className={`${styles['feries-month-day']}`}>
                              {format(parseISO(f.date), 'dd')}
                            </span>
                            <span className="truncate">
                              {isRtl ? f.libelleAr : f.libelleFr}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`${styles['feries-month-list']}`}>
                        <span className="text-gray-400 text-xs italic">
                          {t('holidays.no_month_holiday')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Filters */}
          {feries.length > 0 && (
            <div className={`${styles['feries-filters']}`}>
              <div className={`${styles['feries-search']}`}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder={t('holidays.search_placeholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className={`${styles['feries-filter-pills']}`}>
                {(['all', 'fixed', 'mobile'] as TypeFilter[]).map(type => (
                  <button
                    key={type}
                    className={`feries-filter-pill ${typeFilter === type ? 'active' : ''}`}
                    onClick={() => setTypeFilter(type)}
                  >
                    {t(`holidays.type_${type}`)}
                  </button>
                ))}
              </div>
              {(search || typeFilter !== 'all') && (
                <button
                  className="btn btn-ghost text-sm"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('all');
                  }}
                >
                  {t('common.reset_filters')}
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {filteredFeries.length === 0 ? (
            <div className={`${styles['feries-empty']}`}>
              <div className={`${styles['feries-empty-icon']}`}>
                <CalendarIcon size={32} />
              </div>
              <h3>
                {feries.length === 0
                  ? t('holidays.empty_title', { annee })
                  : t('holidays.no_results')}
              </h3>
              <p>
                {feries.length === 0
                  ? t('holidays.empty_desc')
                  : t('holidays.no_results_desc')}
              </p>
              {feries.length === 0 && (
                <button
                  className="btn btn-primary mt-6"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus size={18} />
                  {t('holidays.add_first')}
                </button>
              )}
            </div>
          ) : (
            <div className="table-container card" style={{ padding: 0 }}>
              <table className={`${styles['feries-table']}`}>
                <thead>
                  <tr>
                    <th style={{ width: '140px' }}>{t('holidays.table_date')}</th>
                    <th>{t('holidays.table_label_fr')}</th>
                    <th className={isRtl ? 'text-right' : 'text-right'}>
                      {t('holidays.table_label_ar')}
                    </th>
                    <th style={{ width: '120px' }}>{t('holidays.table_type')}</th>
                    <th className="text-right" style={{ width: '80px' }}>
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 12 }, (_, month) => {
                    const items = groupedByMonth[month];
                    if (!items || items.length === 0) return null;
                    return (
                      <React.Fragment key={month}>
                        <tr className={`${styles['feries-month-row']}`}>
                          <td colSpan={5}>
                            {t('holidays.month_header', { month: monthNames[month], count: items.length })}
                          </td>
                        </tr>
                        {items.map(f => {
                          const parsed = parseISO(f.date);
                          return (
                            <tr key={f.id}>
                              <td>
                                <div className={`${styles['feries-date-cell']}`}>
                                  <div className={`${styles['feries-date-badge']}`}>
                                    <span className="day">
                                      {format(parsed, 'dd')}
                                    </span>
                                    <span className="month">
                                      {format(parsed, 'MMM', { locale: dateLocale })}
                                    </span>
                                  </div>
                                  <span className={`${styles['feries-date-weekday']}`}>
                                    {weekDayNames[getDay(parsed)]}
                                  </span>
                                </div>
                              </td>
                              <td className="text-gray-700 font-medium">
                                {f.libelleFr}
                              </td>
                              <td className={`feries-label-ar ${isRtl ? 'text-right' : 'text-right'}`}>
                                {f.libelleAr}
                              </td>
                              <td>
                                <span
                                  className={`feries-type-badge ${f.estMobile ? 'mobile' : 'is-fixed'}`}
                                >
                                  {f.estMobile
                                    ? t('holidays.mobile')
                                    : t('holidays.fixed')}
                                </span>
                                {isWeekend(f.date) && (
                                  <span className="badge badge-gray ml-2">
                                    {t('holidays.weekend')}
                                  </span>
                                )}
                              </td>
                              <td className="text-right">
                                <button
                                  className="btn-icon text-danger hover:bg-danger/10 hover:shadow-sm transition-all"
                                  onClick={() => setDeleteItem(f)}
                                  title={t('common.delete')}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <Sparkles size={20} className="text-primary-500" />
                {t('holidays.modal_title')}
              </h3>
              <button className="btn-icon" onClick={closeModal}>
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {formError && (
                  <div className="toast error mb-4">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className={`${styles['feries-modal-grid']}`}>
                  <div className={`form-group ${styles['form-group-full']}`}>
                    <label className="form-label">
                      {t('holidays.form_date')}{' '}
                      <span className="form-required">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={form.date}
                      onChange={e =>
                        setForm({ ...form, date: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('holidays.form_date_hint')}
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {t('holidays.form_label_fr')}{' '}
                      <span className="form-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={t('holidays.placeholder_label_fr')}
                      required
                      value={form.libelleFr}
                      onChange={e =>
                        setForm({ ...form, libelleFr: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label
                      className="form-label w-full"
                      dir="rtl"
                    >
                      {t('holidays.form_label_ar')}{' '}
                      <span className="form-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input text-right"
                      dir="rtl"
                      placeholder={t('holidays.placeholder_label_ar')}
                      required
                      value={form.libelleAr}
                      onChange={e =>
                        setForm({ ...form, libelleAr: e.target.value })
                      }
                    />
                  </div>

                  <div className={`${styles['form-group-full']}`}>
                    <label
                      className={`feries-toggle ${form.estMobile ? 'bg-primary-50 border-primary-300' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.estMobile}
                        onChange={e =>
                          setForm({ ...form, estMobile: e.target.checked })
                        }
                      />
                      <div className={`${styles['feries-toggle-label']}`}>
                        <strong>{t('holidays.form_mobile_toggle')}</strong>
                        <span>{t('holidays.form_mobile_hint')}</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeModal}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner" style={{ borderTopColor: 'white' }}></span>
                      {t('common.save')}
                    </>
                  ) : (
                    t('common.save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="modal-overlay" onClick={() => setDeleteItem(null)}>
          <div
            className="modal confirm-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="confirm-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                <Trash2 size={28} />
              </div>
              <button
                className="btn-icon"
                onClick={() => setDeleteItem(null)}
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="modal-body text-center">
              <h4 className="confirm-title">{t('holidays.delete_title')}</h4>
              <p className="confirm-message">
                {t('holidays.delete_message', {
                  label: isRtl ? deleteItem.libelleAr : deleteItem.libelleFr,
                  date: format(parseISO(deleteItem.date), 'dd MMMM yyyy', {
                    locale: dateLocale,
                  }),
                })}
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                onClick={() => setDeleteItem(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner" style={{ borderTopColor: 'white' }}></span>
                    {t('common.delete')}
                  </>
                ) : (
                  t('common.delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
              )}
              <span>{toast.message}</span>
              <button
                className="toast-close"
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              >
                <XCircle size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeriesTab;
