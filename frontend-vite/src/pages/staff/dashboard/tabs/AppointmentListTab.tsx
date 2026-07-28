import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { getStatusBadge } from '../utils';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import NewAppointmentModal from '../modals/NewAppointmentModal';

export default function AppointmentListTab() {
  const { t } = useTranslation();
  const {
    loading, appointments, filterDate, filterMode, filterStatus, filterPhone,
    setFilterDate, setFilterMode, setFilterStatus, setFilterPhone,
    page, setPage, totalPages, totalAppointments,
    setSelectedAppointment,
  } = useDashboard();
  const { updateAppointmentStatus } = useDashboardCRUD();
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  const filteredAppointments = appointments.filter(a => !filterPhone || ((a.phone || a.client_phone || '') && (a.phone || a.client_phone || '').includes(filterPhone)));

  return (
    <>
      <div className="dash-filters glass-panel">
        <div className="dash-filter-group">
          <label>{t('staffDashboard.filterDateLabel')}</label>
          <div className="flex-center gap-6">
            <div className="flex rounded" style={{ overflow: 'hidden', border: '1px solid rgba(148,163,184,0.25)' }}>
              {(['day', 'week', 'month'] as const).map(m => (
                <button key={m} onClick={() => { setPage(1); setFilterMode(m); }}
                  style={{
                    padding: '6px 14px', fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: filterMode === m ? 'var(--accent)' : 'transparent',
                    color: filterMode === m ? 'var(--text-white)' : 'var(--text-muted)',
                    transition: 'all 0.15s'
                  }}>{m === 'day' ? t('staffDashboard.calendarDay') : m === 'week' ? t('staffDashboard.calendarWeek') : t('staffDashboard.calendarMonth')}</button>
              ))}
            </div>
            <input type="date" className="glass-input flex-1" value={filterDate} onChange={e => { setPage(1); setFilterDate(e.target.value); }} style={{ minWidth: 0 }} />
          </div>
        </div>
        <div className="dash-filter-group">
          <label>{t('staffDashboard.filterStatusLabel')}</label>
          <select className="glass-input" value={filterStatus} onChange={e => { setPage(1); setFilterStatus(e.target.value); }}>
            <option value="">{t('staffDashboard.filterStatusAll')}</option>
            <option value="confirmed">{t('staffDashboard.filterStatusConfirmed')}</option>
            <option value="completed">{t('staffDashboard.filterStatusCompleted')}</option>
            <option value="cancelled">{t('staffDashboard.filterStatusCancelled')}</option>
            <option value="pending">{t('staffDashboard.filterStatusPending')}</option>
            <option value="no-show">{t('staffDashboard.filterStatusNoShow')}</option>
          </select>
        </div>
        <div className="dash-filter-group">
          <label>{t('staffDashboard.filterPhoneLabel')}</label>
          <input type="text" className="glass-input" placeholder={t('staffDashboard.filterPhonePlaceholder')} value={filterPhone} onChange={e => setFilterPhone(e.target.value)} />
        </div>
      </div>

      <div className="flex-end mb-16">
        <button className="dash-btn dash-btn-success" onClick={() => setShowNewAppointment(true)}>{t('staffDashboard.newAppointmentButton')}</button>
      </div>

      {loading ? (
        <div className="dash-loading">
          <div className="dash-loading-spinner"></div>
          {t('staffDashboard.loadingAppointments')}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h3 className="text-gradient">{t('staffDashboard.emptyTitle')}</h3>
          <p>{t('staffDashboard.emptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-appointments-list">
          {filteredAppointments.map(a => (
            <div key={a.id} className={`dash-appointment-card glass-panel ${a.status} cursor-pointer`} onClick={() => setSelectedAppointment(a)}>
              <div className="dash-appointment-header">
                <div>
                  <div className="dash-appointment-time">{a.time}</div>
                  <div className="dash-appointment-date">{a.date}</div>
                </div>
                {getStatusBadge(a.status)}
              </div>
              <div className="dash-appointment-body">
                <div className="dash-info-group">
                  <label>{t('staffDashboard.apptClient')}</label>
                  <span>{a.client_name}</span>
                </div>
                <div className="dash-info-group">
                  <label>{t('staffDashboard.apptService')}</label>
                  <span>{a.service_name || a.service || '-'}</span>
                </div>
                <div className="dash-info-group">
                  <label>{t('staffDashboard.apptStaff')}</label>
                  <span>{a.staff_name || '-'}</span>
                </div>
              </div>
              {a.notes && <div className="dash-appointment-notes">{a.notes}</div>}
              {(a.phone || a.client_phone) && (
                <div style={{ padding: '0 16px 8px' }}>
                  <a href={`https://wa.me/${(a.phone || a.client_phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 12px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{t('staffDashboard.apptWhatsApp')}</a>
                </div>
              )}
              <div className="dash-appointment-actions" onClick={e => e.stopPropagation()}>
                {a.status === 'pending' && (
                  <button className="dash-btn dash-btn-success" onClick={() => updateAppointmentStatus(a.id, 'confirmed')}>{t('staffDashboard.apptConfirm')}</button>
                )}
                {a.status !== 'cancelled' && a.status !== 'completed' && (
                  <button className="dash-btn dash-btn-complete" onClick={() => updateAppointmentStatus(a.id, 'completed')}>{t('staffDashboard.apptComplete')}</button>
                )}
                {a.status !== 'cancelled' && a.status !== 'completed' && (
                  <button className="dash-btn dash-btn-cancel" onClick={() => updateAppointmentStatus(a.id, 'cancelled')}>{t('staffDashboard.apptCancel')}</button>
                )}
                {a.status !== 'cancelled' && a.status !== 'completed' && a.status !== 'no-show' && (
                  <button className="dash-btn dash-btn-noshow" onClick={() => updateAppointmentStatus(a.id, 'no-show')}>{t('staffDashboard.apptNoShow')}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="glass-panel flex-center-center gap-8 mt-20 p-12">
          <button className="dash-btn dash-btn-success" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ opacity: page <= 1 ? 0.4 : 1 }}>{t('staffDashboard.paginationPrev')}</button>
          <span style={{ color: 'var(--text-muted)', padding: '0 8px' }}>
            {t('staffDashboard.paginationInfo', { page, totalPages, totalAppointments })}
          </span>
          <button className="dash-btn dash-btn-success" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ opacity: page >= totalPages ? 0.4 : 1 }}>{t('staffDashboard.paginationNext')}</button>
        </div>
      )}

      {showNewAppointment && <NewAppointmentModal onClose={() => setShowNewAppointment(false)} />}
    </>
  );
}
