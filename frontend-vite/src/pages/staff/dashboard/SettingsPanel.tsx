import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from './dashboardContext';
import { useDashboardCRUD } from './useDashboardCRUD';
import { api } from '../../../api/client';
import PhoneInput from '../../../components/PhoneInput';

export default function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const {
    settings, setSettings,
    openingHours, setOpeningHours,
    blockedDates, setBlockedDates,
    calendarStatus,
  } = useDashboard();
  const { saveSettings, addBlockedDate, deleteBlockedDate } = useDashboardCRUD();

  const [newBlockedDate, setNewBlockedDate] = useState({ date: '', reason: '' });
  const [calendarSyncing, setCalendarSyncing] = useState(false);

  const handleSave = async () => {
    await saveSettings(settings, openingHours);
  };

  const handleAddBlockedDate = async () => {
    const ok = await addBlockedDate(newBlockedDate.date, newBlockedDate.reason);
    if (ok) {
      const data = await api.get<{ blockedDates: { id: number; date: string; reason: string }[] }>('/api/tenant/blocked-dates');
      setBlockedDates(data.blockedDates);
      setNewBlockedDate({ date: '', reason: '' });
    }
  };

  const handleDeleteBlockedDate = async (id: number) => {
    const ok = await deleteBlockedDate(id);
    if (ok) setBlockedDates(prev => prev.filter(bd => bd.id !== id));
  };

  return (
    <div className="dash-container">
      <div className="glass-panel p-32 block" style={{ marginBottom: 32 }}>
        <div className="dash-panel-header">
          <h3 className="text-gradient">{t('staffDashboard.settingsTitle')}</h3>
          <button onClick={() => {}} className="dash-close-btn">✕</button>
        </div>
        <form className="dash-form-grid" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="dash-form-group">
            <label>{t('staffDashboard.businessNameLabel')}</label>
            <input type="text" className="glass-input" value={settings.business_name} onChange={e => setSettings(p => ({ ...p, business_name: e.target.value }))} placeholder={t('staffDashboard.businessNamePlaceholder')} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.addressLabel')}</label>
            <input type="text" className="glass-input" value={settings.business_address} onChange={e => setSettings(p => ({ ...p, business_address: e.target.value }))} placeholder={t('staffDashboard.addressPlaceholder')} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.notificationEmailLabel')}</label>
            <input type="email" className="glass-input" value={settings.notification_email} onChange={e => setSettings(p => ({ ...p, notification_email: e.target.value }))} placeholder={t('staffDashboard.notificationEmailPlaceholder')} />
            <small>{t('staffDashboard.notificationEmailHint')}</small>
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.contactWhatsAppLabel')}</label>
            <PhoneInput value={settings.business_phone} onChange={v => setSettings(p => ({ ...p, business_phone: v }))} placeholder={t('staffDashboard.contactWhatsAppPlaceholder')} className="glass-input" />
            <small>{t('staffDashboard.contactWhatsAppHint')}</small>
          </div>

          {/* Opening Hours */}
          <div className="section-divider">
            <details>
              <summary className="section-header">{t('staffDashboard.hoursTitle')}</summary>
              <div className="grid-2">
                <div className="dash-form-group">
                  <label>{t('staffDashboard.openingHourLabel')}</label>
                  <select className="glass-input" value={openingHours.startHour} onChange={e => setOpeningHours(p => ({ ...p, startHour: parseInt(e.target.value, 10) }))}>
                    {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>)}
                  </select>
                </div>
                <div className="dash-form-group">
                  <label>{t('staffDashboard.closingHourLabel')}</label>
                  <select className="glass-input" value={openingHours.endHour} onChange={e => setOpeningHours(p => ({ ...p, endHour: parseInt(e.target.value, 10) }))}>
                    {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>)}
                  </select>
                </div>
              </div>
              <div className="dash-form-group mt-8">
                <label>{t('staffDashboard.workDaysLabel')}</label>
                <div className="flex flex-gap-8 flex-wrap">
                  {[
                    { v: 1, l: t('staffDashboard.dayLun') }, { v: 2, l: t('staffDashboard.dayMar') }, { v: 3, l: t('staffDashboard.dayMie') },
                    { v: 4, l: t('staffDashboard.dayJue') }, { v: 5, l: t('staffDashboard.dayVie') }, { v: 6, l: t('staffDashboard.daySab') }, { v: 0, l: t('staffDashboard.dayDom') }
                  ].map(d => (
                    <label key={d.v} className="flex-center flex-gap-4 cursor-pointer text-main">
                      <input type="checkbox" checked={openingHours.workDays.includes(d.v)} onChange={() => {
                        setOpeningHours(p => ({
                          ...p,
                          workDays: p.workDays.includes(d.v) ? p.workDays.filter(w => w !== d.v) : [...p.workDays, d.v].sort(),
                        }));
                      }} />
                      {d.l}
                    </label>
                  ))}
                </div>
              </div>
            </details>
          </div>

          {/* Blocked Dates */}
          <div className="section-divider">
            <details>
              <summary className="section-header">{t('staffDashboard.blockedDatesTitle')}</summary>
              <p className="text-muted mb-12">{t('staffDashboard.blockedDatesHint')}</p>
              <div className="flex flex-gap-8 mb-12">
                <div className="dash-form-group flex-1">
                  <input type="date" className="glass-input" value={newBlockedDate.date} onChange={e => setNewBlockedDate(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="dash-form-group flex-1">
                  <input type="text" className="glass-input" value={newBlockedDate.reason} onChange={e => setNewBlockedDate(p => ({ ...p, reason: e.target.value }))} placeholder={t('staffDashboard.blockedDatesReasonPlaceholder')} />
                </div>
                <button className="dash-btn dash-btn-primary nowrap" onClick={handleAddBlockedDate}>{t('staffDashboard.blockedDatesAddLabel')}</button>
              </div>
              {blockedDates.length === 0 ? (
                <p className="fs-14">{t('staffDashboard.blockedDatesEmpty')}</p>
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table className="table-full">
                    <thead>
                      <tr>
                        <th className="table-cell-header">{t('staffDashboard.blockedDatesDelete')}</th>
                        <th className="table-cell-header">{t('staffDashboard.blockedDatesDateHeader')}</th>
                        <th className="table-cell-header">{t('staffDashboard.blockedDatesReasonHeader')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockedDates.map(bd => (
                        <tr key={bd.id}>
                          <td style={{ padding: '6px 10px' }}>
                            <button className="dash-btn dash-btn-danger" onClick={() => handleDeleteBlockedDate(bd.id)}>✕</button>
                          </td>
                          <td className="fs-14">{new Date(bd.date).toLocaleDateString(i18n.language)}</td>
                          <td className="fs-14">{bd.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          </div>

          {/* Reminders */}
          <div className="section-divider">
            <details>
              <summary className="section-header">{t('staffDashboard.remindersTitle')}</summary>
              <div className="dash-form-group">
                <label>{t('staffDashboard.reminderHoursLabel')}</label>
                <select className="glass-input" value={settings.reminder_hours ?? 24} onChange={e => setSettings(p => ({ ...p, reminder_hours: parseInt(e.target.value, 10) }))}>
                  {[1, 2, 4, 12, 24, 48, 72].map(h => (
                    <option key={h} value={h}>{h} {h === 1 ? t('staffDashboard.reminderHour') : t('staffDashboard.reminderHours')}</option>
                  ))}
                </select>
                <small>{t('staffDashboard.reminderHoursHint')}</small>
              </div>
            </details>
          </div>

          {/* Captcha */}
          <div className="section-divider">
            <details>
              <summary className="section-header">{t('staffDashboard.captchaTitle')}</summary>
              <div className="dash-form-group">
                <label className="flex-center flex-gap-8 cursor-pointer">
                  <input type="checkbox" checked={!!settings.captcha_enabled} onChange={e => setSettings(p => ({ ...p, captcha_enabled: e.target.checked }))} style={{ width: 18, height: 18 }} />
                  {t('staffDashboard.captchaEnabledLabel')}
                </label>
                <small>{t('staffDashboard.captchaHint')}</small>
              </div>
            </details>
          </div>

          {/* SMTP */}
          <div className="section-divider">
            <details>
              <summary className="section-header">{t('staffDashboard.smtpTitle')}</summary>
              <p className="text-muted mb-12">{t('staffDashboard.smtpHint')}</p>
              <div className="grid-2">
                <div className="dash-form-group">
                  <label>{t('staffDashboard.smtpEmailLabel')}</label>
                  <input type="email" className="glass-input" value={settings.smtp_email || ''} onChange={e => setSettings(p => ({ ...p, smtp_email: e.target.value }))} placeholder={t('staffDashboard.notificationEmailPlaceholder')} />
                </div>
                <div className="dash-form-group">
                  <label>{t('staffDashboard.smtpPasswordLabel')}</label>
                  <input type="password" className="glass-input" value={settings.smtp_password || ''} onChange={e => setSettings(p => ({ ...p, smtp_password: e.target.value }))} placeholder="••••••••" />
                  <small className="text-muted">{t('staffDashboard.smtpPasswordHint')}</small>
                </div>
              </div>
            </details>
          </div>

          {/* Calendar Sync */}
          <div className="section-divider">
            <details>
              <summary className="section-header">{t('staffDashboard.calendarSyncSettingsTitle')}</summary>
              <p className="text-muted mb-12">{t('staffDashboard.calendarSyncConnectHint')}</p>
              {calendarStatus.connected ? (
                <div>
                  <p className="text-primary mb-8">
                    ✅ {t('staffDashboard.calendarSyncConnected')}
                    {calendarStatus.google_email && <span> — {t('staffDashboard.calendarSyncConnectedAs', { email: calendarStatus.google_email })}</span>}
                  </p>
                  {calendarStatus.last_sync && (
                    <p className="text-muted mb-8">
                      {t('staffDashboard.calendarSyncLastSync', { time: new Date(calendarStatus.last_sync).toLocaleString(i18n.language) })}
                    </p>
                  )}
                  <div className="flex flex-gap-8">
                    <button className="dash-btn dash-btn-success fs-14" disabled={calendarSyncing} onClick={async () => {
                      setCalendarSyncing(true);
                      try {
                        await api.post('/api/calendar/sync');
                      } catch {}
                      setCalendarSyncing(false);
                    }}>
                      {calendarSyncing ? t('staffDashboard.calendarSyncSyncing') : t('staffDashboard.calendarSyncSyncNow')}
                    </button>
                    <button className="dash-btn dash-btn-danger fs-14" onClick={async () => {
                      if (!confirm(t('staffDashboard.calendarDisconnectConfirm'))) return;
                      try {
                        await api.delete('/api/calendar/disconnect');
                      } catch {}
                    }}>
                      {t('staffDashboard.calendarSyncDisconnect')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-muted mb-8">{t('staffDashboard.calendarSyncNotConnected')}</p>
                  <a href={`/api/auth/google/calendar?staff_token=${encodeURIComponent('')}`} className="dash-btn dash-btn-primary inline-block no-underline">
                    {t('staffDashboard.calendarSyncConnect')}
                  </a>
                </div>
              )}
            </details>
          </div>

          <div className="dash-form-group full-width text-right mt-12">
            <button type="submit" className="dash-btn dash-btn-success">{t('staffDashboard.saveSettings')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
