import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { getStatusBadge } from '../utils';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import { api } from '../../../../api/client';
import type { Appointment } from '../dashboardContext';

export default function AppointmentDetailModal() {
  const { t, i18n } = useTranslation();
  const { selectedAppointment, setSelectedAppointment, addToast } = useDashboard();
  const { updateAppointmentStatus } = useDashboardCRUD();

  const [showClientHistory, setShowClientHistory] = useState(false);
  const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
  const [clientHistoryLoading, setClientHistoryLoading] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (selectedAppointment) {
      setInternalNotes(selectedAppointment.internal_notes || '');
      setShowClientHistory(false);
      setClientHistory([]);
    }
  }, [selectedAppointment]);

  if (!selectedAppointment) return null;

  const phone = selectedAppointment.client_phone || selectedAppointment.phone;

  const loadClientHistory = async () => {
    if (!phone) return;
    setClientHistoryLoading(true);
    try {
      const data = await api.get<{ appointments: Appointment[] }>(`/api/tenant/clients/${encodeURIComponent(phone)}/appointments`);
      setClientHistory(data.appointments);
    } catch { addToast(t('staffDashboard.toastLoadHistoryError'), 'error'); }
    setClientHistoryLoading(false);
  };

  const handleToggleHistory = () => {
    if (!showClientHistory && clientHistory.length === 0 && phone) loadClientHistory();
    setShowClientHistory(p => !p);
  };

  const handleSaveNotes = (val: string) => {
    const trimmed = val.trim();
    if (trimmed !== (selectedAppointment.internal_notes || '')) {
      api.put(`/api/appointments/${selectedAppointment.id}/notes`, { internalNotes: trimmed }).then(() => {
        setSelectedAppointment(p => p ? { ...p, internal_notes: trimmed } : null);
      }).catch(() => addToast(t('staffDashboard.toastSaveNotesError'), 'error'));
    }
  };

  return (
    <div className="dash-modal-overlay flex" onClick={() => setSelectedAppointment(null)}>
      <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()}>
        <div className="dash-modal-header">
          <h3 className="text-gradient">{t('staffDashboard.appointmentDetailTitle')}</h3>
          <button onClick={() => setSelectedAppointment(null)} className="dash-close-btn">✕</button>
        </div>
        <div className="dash-modal-body">
          <div className="dash-modal-info-grid">
            <div className="dash-info-group">
              <label>{t('staffDashboard.apptDetailClient')}</label>
              <span>{selectedAppointment.client_name}</span>
            </div>
            <div className="dash-info-group">
              <label>{t('staffDashboard.apptDetailService')}</label>
              <span>{selectedAppointment.service_name || selectedAppointment.service || '-'}</span>
            </div>
            <div className="dash-info-group">
              <label>{t('staffDashboard.apptDetailStaff')}</label>
              <span>{selectedAppointment.staff_name || '-'}</span>
            </div>
            <div className="dash-info-group">
              <label>{t('staffDashboard.apptDetailDate')}</label>
              <span>{selectedAppointment.date}</span>
            </div>
            <div className="dash-info-group">
              <label>{t('staffDashboard.apptDetailTime')}</label>
              <span>{selectedAppointment.time}</span>
            </div>
            <div className="dash-info-group">
              <label>{t('staffDashboard.apptDetailStatus')}</label>
              <span>{getStatusBadge(selectedAppointment.status)}</span>
            </div>
          </div>

          {phone && (
            <div className="dash-modal-info-full">
              <div className="dash-info-group">
                <label>{t('staffDashboard.apptDetailPhone')}</label>
                <span>
                  <a href={`tel:${phone}`} className="font-600 no-underline" style={{ color: 'var(--primary-hover)' }}>{phone}</a>
                </span>
              </div>
              <div className="mt-8">
                <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', padding: '8px 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>{t('staffDashboard.apptDetailWhatsApp')}</a>
              </div>
            </div>
          )}

          {selectedAppointment.email && (
            <div className="dash-modal-info-full">
              <div className="dash-info-group">
                <label>{t('staffDashboard.apptDetailEmail')}</label>
                <span>{selectedAppointment.email}</span>
              </div>
            </div>
          )}

          {selectedAppointment.notes && <div className="dash-appointment-notes">{selectedAppointment.notes}</div>}

          <div className="dash-info-group">
            <label>{t('staffDashboard.apptDetailInternalNotes')}</label>
            <textarea className="glass-input w-full mt-4" rows={2} value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              onBlur={() => handleSaveNotes(internalNotes)}
              placeholder={t('staffDashboard.apptDetailInternalNotesPlaceholder')}
              style={{ resize: 'vertical' }} />
          </div>

          {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
            <div className="flex flex-gap-8 flex-wrap mt-12">
              {selectedAppointment.status === 'pending' && (
                <button className="dash-btn dash-btn-success" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed')}>{t('staffDashboard.apptConfirm')}</button>
              )}
              <button className="dash-btn dash-btn-complete" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}>{t('staffDashboard.apptComplete')}</button>
              <button className="dash-btn dash-btn-cancel" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}>{t('staffDashboard.apptCancel')}</button>
              <button className="dash-btn dash-btn-noshow" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'no-show')}>{t('staffDashboard.apptNoShow')}</button>
            </div>
          )}

          <div className="mt-16 border-bottom pt-12">
            <button className="dash-btn dash-btn-ghost w-full" onClick={handleToggleHistory} style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
              {t('staffDashboard.apptDetailClientHistory')}
              <span className="ml-auto">{showClientHistory ? '▲' : '▼'}</span>
            </button>
            {showClientHistory && (
              <div className="mt-8">
                {clientHistoryLoading ? (
                  <div className="dash-loading p-12"><div className="dash-loading-spinner"></div></div>
                ) : clientHistory.length === 0 ? (
                  <p className="text-secondary p-12">{t('staffDashboard.apptDetailClientHistoryEmpty')}</p>
                ) : (
                  <>
                    <div className="flex flex-gap-12 mb-12 flex-wrap" style={{ padding: '0 4px' }}>
                      <div style={{ background: 'rgba(148,163,184,0.1)', padding: '8px 14px', borderRadius: 8, flex: 1, minWidth: 100 }}>
                        <div className="fs-12 text-secondary text-uppercase">{t('staffDashboard.apptDetailClientHistoryTotal')}</div>
                        <div className="fs-21 font-700 text-main">{clientHistory.length}</div>
                      </div>
                      <div style={{ background: 'rgba(148,163,184,0.1)', padding: '8px 14px', borderRadius: 8, flex: 1, minWidth: 100 }}>
                        <div className="fs-12 text-secondary text-uppercase">{t('staffDashboard.apptDetailClientHistoryLastVisit')}</div>
                        <div className="fs-15 font-600 text-main">{new Date(clientHistory[0].appointment_date || clientHistory[0].date).toLocaleDateString(i18n.language)}</div>
                      </div>
                      <div style={{ background: 'rgba(148,163,184,0.1)', padding: '8px 14px', borderRadius: 8, flex: 1, minWidth: 100 }}>
                        <div className="fs-12 text-secondary text-uppercase">{t('staffDashboard.apptDetailClientHistoryTotalSpent')}</div>
                        <div className="fs-21 font-700 text-main">
                          ${Math.round(clientHistory.reduce((sum, a) => sum + (Number(a.service_price) || 0), 0)).toLocaleString(i18n.language)}
                        </div>
                      </div>
                    </div>
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      <table className="table-full">
                        <thead>
                          <tr>
                            <th className="table-cell-header">{t('staffDashboard.apptDetailClientHistoryDate')}</th>
                            <th className="table-cell-header">{t('staffDashboard.apptDetailClientHistoryService')}</th>
                            <th className="table-cell-header">{t('staffDashboard.apptDetailClientHistoryStaff')}</th>
                            <th className="table-cell-header" style={{ textAlign: 'center' }}>{t('staffDashboard.apptDetailClientHistoryStatus')}</th>
                            <th className="table-cell-header">{t('staffDashboard.apptDetailClientHistoryNotes')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientHistory.map(a => (
                            <tr key={a.id}>
                              <td className="fs-14">{new Date(a.appointment_date || a.date).toLocaleDateString(i18n.language)}</td>
                              <td className="fs-14">{a.service_name || a.service}</td>
                              <td className="fs-14">{a.staff_name || '-'}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'center' }}>{getStatusBadge(a.status)}</td>
                              <td className="truncate text-secondary" style={{ padding: '6px 10px', maxWidth: 120 }}>{a.internal_notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
