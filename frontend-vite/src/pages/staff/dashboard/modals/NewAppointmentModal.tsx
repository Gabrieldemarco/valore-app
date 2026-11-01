import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import PhoneInput from '../../../../components/PhoneInput';
import { api } from '../../../../api/client';
import { formatLocalDateInputValue } from '../../../../utils/dateTime';
import type { ClientSummary } from '../dashboardContext';

export default function NewAppointmentModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { servicesList, staffList, filterDate, settings } = useDashboard();
  const { saveNewAppointment } = useDashboardCRUD();

  const availableServices = servicesList.filter(service => service.active);
  const [form, setForm] = useState({
    clientName: '', clientPhone: '', clientEmail: '',
    serviceId: '', staffId: '', appointmentDate: filterDate, appointmentTime: '', notes: '',
    selectedServices: [] as number[],
    appointmentDateTime: undefined as string | undefined,
  });
  const [suggestedClients, setSuggestedClients] = useState<ClientSummary[]>([]);
  const [selectedSuggested, setSelectedSuggested] = useState<ClientSummary | null>(null);
  const [availability, setAvailability] = useState<{
    status: 'idle' | 'loading' | 'ready' | 'error';
    slots: { time: string; datetime: string }[];
  }>({ status: 'idle', slots: [] });

  useEffect(() => {
    if (form.clientPhone.length < 3) { setSuggestedClients([]); return; } // eslint-disable-line react-hooks/set-state-in-effect
    const timer = setTimeout(() => {
      api.get<{ clients: ClientSummary[] }>(`/api/tenant/clients?q=${encodeURIComponent(form.clientPhone)}`)
        .then(d => setSuggestedClients(d.clients)).catch(() => {/* silent */});
    }, 300);
    return () => clearTimeout(timer);
  }, [form.clientPhone]);

  useEffect(() => {
    if (!settings.slug || !form.appointmentDate || form.selectedServices.length === 0) {
      setAvailability({ status: 'idle', slots: [] }); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    let current = true;
    setAvailability({ status: 'loading', slots: [] });
    const serviceParams = form.selectedServices.length > 1
      ? `serviceIds=${form.selectedServices.join(',')}`
      : `serviceId=${form.selectedServices[0]}`;
    const path = form.staffId
      ? `/p/${settings.slug}/staff/${form.staffId}/availability?date=${form.appointmentDate}&${serviceParams}`
      : `/p/${settings.slug}/availability?date=${form.appointmentDate}&${serviceParams}`;

    api.getFresh<{ slots: { time: string; datetime: string }[] }>(path)
      .then(data => {
        if (current) setAvailability({ status: 'ready', slots: data.slots || [] });
      })
      .catch(() => {
        if (current) setAvailability({ status: 'error', slots: [] });
      });
    return () => { current = false; };
  }, [form.appointmentDate, form.selectedServices, form.staffId, settings.slug]);

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
            <small className="text-muted">{t('staffDashboard.newApptServiceHelp')}</small>
            {availableServices.length === 0 ? (
              <p className="text-muted" role="status">{t('staffDashboard.newApptNoServices')}</p>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 180, overflowY: 'auto', marginTop: 6 }}>
                {availableServices.map(s => {
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
                          setForm(p => ({
                            ...p,
                            selectedServices: updated,
                            serviceId: updated.length > 0 ? String(updated[0]) : '',
                            appointmentTime: '',
                            appointmentDateTime: undefined,
                          }));
                        }}
                      />
                      <span className="fs-13">{s.name} ({s.duration} {t('landingServices.minutes')})</span>
                    </label>
                  );
                })}
              </div>
            )}
            {form.selectedServices.length > 0 && (
              <div className="fs-13" style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                {t('staffDashboard.totalDuration')}: {availableServices.filter(s => form.selectedServices.includes(s.id)).reduce((sum, s) => sum + s.duration, 0)} {t('landingServices.minutes')}
              </div>
            )}
          </div>
          {staffList.filter(s => s.active !== false).length > 0 && (
            <div className="dash-form-group">
              <label>{t('staffDashboard.newApptStaffLabel')}</label>
              <select className="glass-input" value={form.staffId} onChange={e => setForm(p => ({ ...p, staffId: e.target.value, appointmentTime: '', appointmentDateTime: undefined }))}>
                <option value="">{t('staffDashboard.newApptStaffAny')}</option>
                {staffList.filter(s => s.active !== false).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="dash-form-group">
            <label>{t('staffDashboard.newApptDateLabel')}</label>
            <small className="text-muted">{t('staffDashboard.newApptDateHelp')}</small>
            <input type="date" className="glass-input" min={formatLocalDateInputValue()} value={form.appointmentDate} onChange={e => setForm(p => ({ ...p, appointmentDate: e.target.value, appointmentTime: '', appointmentDateTime: undefined }))} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.newApptTimeLabel')}</label>
            <small className="text-muted">{t('staffDashboard.newApptTimeHelp')}</small>
            {availability.status === 'loading' && <p className="text-muted" role="status">{t('staffDashboard.newApptLoadingTimes')}</p>}
            {availability.status === 'ready' && availability.slots.length > 0 && (
              <div role="group" aria-label={t('staffDashboard.newApptTimeLabel')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8, marginTop: 8 }}>
                {availability.slots.map(slot => (
                  <button
                    key={slot.datetime}
                    type="button"
                    className={`dash-btn ${form.appointmentTime === slot.time ? 'dash-btn-primary' : 'dash-btn-success'}`}
                    aria-pressed={form.appointmentTime === slot.time}
                    onClick={() => setForm(p => ({ ...p, appointmentTime: slot.time, appointmentDateTime: slot.datetime }))}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
            {availability.status === 'ready' && availability.slots.length === 0 && (
              <p className="text-muted" role="status">{t('staffDashboard.newApptNoTimes')}</p>
            )}
            {(availability.status === 'error' || (availability.status === 'idle' && !settings.slug)) && (
              <>
                <input type="time" className="glass-input" value={form.appointmentTime} onChange={e => setForm(p => ({ ...p, appointmentTime: e.target.value, appointmentDateTime: undefined }))} />
                {availability.status === 'error' && <small className="text-muted">{t('staffDashboard.newApptTimesUnavailable')}</small>}
              </>
            )}
            {availability.status === 'idle' && settings.slug && (
              <p className="text-muted">{t('staffDashboard.newApptChooseServiceDate')}</p>
            )}
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
