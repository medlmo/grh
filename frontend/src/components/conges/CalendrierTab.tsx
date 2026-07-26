import React from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TFunction } from 'i18next';
import { Conge } from '../../types/conges';
import { typeLabel } from '../../utils/congesHelpers';

interface CalendrierTabProps {
  conges: Conge[];
  isLoading: boolean;
  t: TFunction;
  isRtl: boolean;
  calendarMonth: Date;
  setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>;
}

const CalendrierTab: React.FC<CalendrierTabProps> = ({
  conges,
  isLoading,
  t,
  isRtl,
  calendarMonth,
  setCalendarMonth,
}) => {
  const monthLabel = format(calendarMonth, 'MMMM yyyy', { locale: fr });

  return (
    <div className="card">
      <div className="card-header calendar-header">
        <h2 className="card-title">{t('conges.calendar')}</h2>
        <div className="calendar-nav">
          <button
            className="btn btn-icon btn-outline"
            onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
          >
            {isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <span className="calendar-month capitalize">{monthLabel}</span>
          <button
            className="btn btn-icon btn-outline"
            onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
          >
            {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('agents.matricule')}</th>
                <th>{t('agents.name')}</th>
                <th>{t('conges.type')}</th>
                <th>{t('conges.start_date')}</th>
                <th>{t('conges.end_date')}</th>
                <th>{t('conges.duration')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="spinner"></div>
                    </div>
                  </td>
                </tr>
              ) : conges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    {t('conges.no_leaves')}
                  </td>
                </tr>
              ) : (
                conges.map((conge) => (
                  <tr key={conge.id}>
                    <td className="font-medium">{conge.agent?.matricule}</td>
                    <td>
                      {conge.agent?.prenomFr} {conge.agent?.nomFr}
                    </td>
                    <td>{typeLabel(conge.type, t)}</td>
                    <td>{format(new Date(conge.dateDebut), 'dd MMM yyyy', { locale: fr })}</td>
                    <td>{format(new Date(conge.dateFin), 'dd MMM yyyy', { locale: fr })}</td>
                    <td>{conge.nombreJours} j</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CalendrierTab;
