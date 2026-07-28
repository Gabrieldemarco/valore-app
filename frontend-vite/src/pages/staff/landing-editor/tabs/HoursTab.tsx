import React from 'react';
import { useLandingEditor } from '../landingEditorContext';
import { DAY_LABELS } from '../landingEditorUtils';

export default function HoursTab() {
  const { t, hours, setHours, toggleDay, debounceSave } = useLandingEditor();

  return (
    <div className="card glass-panel" style={{ padding: '1.5rem' }}>
      <h3 className="text-gradient">{t('staffDashboard.hoursTitle')}</h3>
      <p className="text-muted-sm" style={{ marginBottom: '1rem' }}>{t('staffLandingEditor.hoursHint')}</p>
      <div className="form-group">
        <label>{t('staffDashboard.workDaysLabel')}</label>
        <div className="hours-grid">
          {DAY_LABELS.map((day, i) => (
            <label key={i} className="day-check" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={hours.workDays.includes(i)}
                onChange={() => toggleDay(i)}
                style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>{day}</span>
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>{t('staffDashboard.openingHourLabel')}</label>
          <input type="number" className="glass-input" min={0} max={23} value={hours.startHour}
            onChange={e => { setHours(p => ({ ...p, startHour: Number(e.target.value) })); debounceSave(); }} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>{t('staffDashboard.closingHourLabel')}</label>
          <input type="number" className="glass-input" min={0} max={23} value={hours.endHour}
            onChange={e => { setHours(p => ({ ...p, endHour: Number(e.target.value) })); debounceSave(); }} />
        </div>
      </div>
    </div>
  );
}
