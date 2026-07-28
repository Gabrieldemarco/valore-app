import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import { formatPrice } from '../dashboardContext';
import PhoneInput from '../../../../components/PhoneInput';
import { api } from '../../../../api/client';
import type { ClientSummary } from '../dashboardContext';

export default function NewAppointmentModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { servicesList, staffList, filterDate, loadAppointments, loadClients } = useDashboard();
  const { saveNewAppointment } = useDashboardCRUD();

  const [form, setForm] = useState({
    clientName: '', clientPhone: '', clientEmail: '',
    serviceId: '', staffId: '', appointmentDate: filterDate, appointmentTime: '', notes: '',
  });
  const [suggestedClients, setSuggestedClients] = useState<ClientSummary[]>([]);
  const [selectedSuggested, setSelectedSuggested] = useState<ClientSummary | null>(null);

  useEffect(() => {
    if (form.clientPhone.length < 3) { setSuggestedClients([]); return; }
    const timer = setTimeout(() => {
      api.get<{ clients: ClientSummary[] }>(`/api/tenant/clients?q=${encodeURIComponent(form.clientPhone)}`)
        .then(d => setSuggestedClients(d.clients)).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [form.clientPhone]);

  const handleSave = async () => {
    const ok = await saveNewAppointment(form);
    if (ok) onClose();
  };

  return (
    <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
      <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="dash-modal-header">
          <h3 className="text-gradient">{t('staffDashboard.newAppointmentModalTitle')}</h3>
          <button onClick={onClose} className="dash-close-btn">✕</button>
        </div>
        <div className="dash-modal-body">
          <div className="dash-form-group">
            <label>{t('staffDashboard.newApptNameLabel')}</label>
            <input type="text" className="glass-input" value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} placeholder={t('staffDashboard.newApptNamePlaceholder')} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.newApptPhoneLabel')}</label>
            <PhoneInput value={form.clientPhone} onChange={v => { setForm(p => ({ ...p, clientPhone: v })); setSelectedSuggested(null); }} placeholder={t('staffDashboard.newApptPhonePlaceholder')} className="glass-input" />
            {suggestedClients.length > 0 && (
              <div style={{ position: 'relative', marginTop: 4 }}>
                <div style={{ position: 'absolute', zIndex: 10, width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {suggestedClients.map(c => (
                    <div key={c.client_phone} onClick={() => {
                      setForm(p => ({ ...p, clientName: c.client_name, clientPhone: c.client_phone, clientEmail: c.client_email || '' }));
                      setSelectedSuggested(c);
                      setSuggestedClients([]);
                    }} className="fs-14" style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{c.client_name}</strong> - {c.client_phone}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{c.total_appointments} {t('staffDashboard.clientsTableAppointments')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedSuggested && <small style={{ color: 'var(--accent)', marginTop: 2, display: 'block' }}>{t('staffDashboard.clientsHistoryTotal')} {selectedSuggested.total_appointments} {t('staffDashboard.clientsTableAppointments')}</small>}
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.newApptEmailLabel')}</label>
            <input type="email" className="glass-input" value={form.clientEmail} onChange={e => setForm(p => ({ ...p, clientEmail: e.target.value }))} placeholder={t('staffDashboard.newApptEmailPlaceholder')} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.newApptServiceLabel')}</label>
            <select className="glass-input" value={form.serviceId} onChange={e => setForm(p => ({ ...p, serviceId: e.target.value }))}>
              <option value="">{t('staffDashboard.newApptServicePlaceholder')}</option>
              {servicesList.filter(s => s.active).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({t('landingServices.pricePrefix')}{formatPrice(s.price)} - {s.duration}{t('landingServices.minutes')})</option>
              ))}
            </select>
          </div>
          {staffList.filter(s => s.active !== false).length > 0 && (
            <div className="dash-form-group">
              <label>{t('staffDashboard.newApptStaffLabel')}</label>
              <select className="glass-input" value={form.staffId} onChange={e => setForm(p => ({ ...p, staffId: e.target.value }))}>
                <option value="">{t('staffDashboard.newApptStaffAny')}</option>
                {staffList.filter(s => s.active !== false).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="dash-form-group">
            <label>{t('staffDashboard.newApptDateLabel')}</label>
            <input type="date" className="glass-input" min={new Date().toISOString().split('T')[0]} value={form.appointmentDate} onChange={e => setForm(p => ({ ...p, appointmentDate: e.target.value }))} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.newApptTimeLabel')}</label>
            <input type="time" className="glass-input" value={form.appointmentTime} onChange={e => setForm(p => ({ ...p, appointmentTime: e.target.value }))} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.newApptNotesLabel')}</label>
            <textarea className="glass-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('staffDashboard.newApptNotesPlaceholder')} rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="dash-btn dash-btn-danger" onClick={onClose}>{t('staffDashboard.newApptCancel')}</button>
            <button className="dash-btn dash-btn-success" onClick={handleSave}>{t('staffDashboard.newApptCreate')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
