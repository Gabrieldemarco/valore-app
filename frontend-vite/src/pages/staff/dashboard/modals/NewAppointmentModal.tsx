import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import PhoneInput from '../../../../components/PhoneInput';
import { api } from '../../../../api/client';
import type { ClientSummary } from '../dashboardContext';

export default function NewAppointmentModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { servicesList, staffList, filterDate } = useDashboard();
  const { saveNewAppointment } = useDashboardCRUD();

  const [form, setForm] = useState({
    clientName: '', clientPhone: '', clientEmail: '',
    serviceId: '', staffId: '', appointmentDate: filterDate, appointmentTime: '', notes: '',
    selectedServices: [] as number[],
  });
  const [suggestedClients, setSuggestedClients] = useState<ClientSummary[]>([]);
  const [selectedSuggested, setSelectedSuggested] = useState<ClientSummary | null>(null);
  const [showServicePicker, setShowServicePicker] = useState(false);

  useEffect(() => {
    if (form.clientPhone.length < 3) { setSuggestedClients([]); return; } // eslint-disable-line react-hooks/set-state-in-effect
    const timer = setTimeout(() => {
      api.get<{ clients: ClientSummary[] }>(`/api/tenant/clients?q=${encodeURIComponent(form.clientPhone)}`)
        .then(d => setSuggestedClients(d.clients)).catch(() => {/* silent */});
    }, 300);
    return () => clearTimeout(timer);
  }, [form.clientPhone]);

  const handleSave = async () => {
    const ok = await saveNewAppointment(form);
    if (ok) onClose();
  };

  return (
    <div className="dash-modal-overlay flex" onClick={onClose}>
      <div className="dash-modal-content glass-panel max-w-500" onClick={e => e.stopPropagation()}>
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
              <div className="relative mt-4">
                <div style={{ position: 'absolute', zIndex: 10, width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {suggestedClients.map(c => (
                    <div key={c.client_phone} onClick={() => {
                      setForm(p => ({ ...p, clientName: c.client_name, clientPhone: c.client_phone, clientEmail: c.client_email || '' }));
                      setSelectedSuggested(c);
                      setSuggestedClients([]);
                    }} className="fs-14" style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{c.client_name}</strong> - {c.client_phone}</span>
                      <span className="text-muted">{c.total_appointments} {t('staffDashboard.clientsTableAppointments')}</span>
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
            <div className="relative">
              <input
                type="text"
                className="glass-input"
                readOnly
                value={form.selectedServices.length > 0
                  ? `${form.selectedServices.length} ${t('staffDashboard.servicesSelected', { count: form.selectedServices.length })}`
                  : t('staffDashboard.newApptServicePlaceholder')}
                onClick={() => setShowServicePicker(true)}
              />
              {form.selectedServices.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div className="fs-13" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
                    {t('staffDashboard.totalDuration')}: {servicesList.filter(s => form.selectedServices.includes(s.id)).reduce((sum, s) => sum + s.duration, 0)} {t('landingServices.minutes')}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {servicesList.filter(s => form.selectedServices.includes(s.id)).map(s => (
                      <span key={s.id} style={{ background: 'rgba(37, 99, 235, 0.15)', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>{s.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {showServicePicker && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 240, overflowY: 'auto', marginTop: 4 }}>
                {servicesList.filter(s => s.active).map(s => {
                  const checked = form.selectedServices.includes(s.id);
                  return (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                         onChange={() => {
                          const updated = checked
                            ? form.selectedServices.filter(id => id !== s.id)
                            : [...form.selectedServices, s.id];
                          setForm(p => ({ ...p, selectedServices: updated, serviceId: updated.length > 0 ? String(updated[0]) : '' }));
                        }}
                      />
                      <span className="fs-13">{s.name} ({s.duration}{t('landingServices.minutes')})</span>
                    </label>
                  );
                })}
                <div style={{ padding: 8, borderTop: '1px solid var(--border)' }}>
                  <button className="dash-btn dash-btn-success" style={{ width: '100%', fontSize: 12, padding: '4px 8px' }} onClick={() => setShowServicePicker(false)}>
                    {t('staffDashboard.doneButton')}
                  </button>
                </div>
              </div>
            )}
            {showServicePicker && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setShowServicePicker(false)} />}
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
            <textarea className="glass-input resize-y" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('staffDashboard.newApptNotesPlaceholder')} rows={2} />
          </div>
          <div className="flex-end gap-12 mt-8">
            <button className="dash-btn dash-btn-danger" onClick={onClose}>{t('staffDashboard.newApptCancel')}</button>
            <button className="dash-btn dash-btn-success" onClick={handleSave}>{t('staffDashboard.newApptCreate')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
