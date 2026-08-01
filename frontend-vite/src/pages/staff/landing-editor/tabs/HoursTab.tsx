import { useLandingEditor } from '../landingEditorContext';
import { DAY_LABELS } from '../landingEditorUtils';

export default function HoursTab() {
  const { t, hours, setHours, toggleDay, debounceSave } = useLandingEditor();

  return (
    <div className="card glass-panel p-24">
      <h3 className="text-gradient">{t('staffDashboard.hoursTitle')}</h3>
      <p className="text-muted-sm mb-16">{t('staffLandingEditor.hoursHint')}</p>
      <div className="form-group">
        <label>{t('staffDashboard.workDaysLabel')}</label>
        <div className="hours-grid">
          {DAY_LABELS.map((day, i) => (
            <label key={i} className="day-check cursor-pointer">
              <input type="checkbox" checked={hours.workDays.includes(i)}
                onChange={() => toggleDay(i)}
                className="w-18 h-18 cursor-pointer" />
              <span className="fs-15 font-600 text-muted">{day}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-16">
        <div className="form-group flex-1">
          <label>{t('staffDashboard.openingHourLabel')}</label>
          <input type="number" className="glass-input" min={0} max={23} value={hours.startHour}
            onChange={e => { setHours(p => ({ ...p, startHour: Number(e.target.value) })); debounceSave(); }} />
        </div>
        <div className="form-group flex-1">
          <label>{t('staffDashboard.closingHourLabel')}</label>
          <input type="number" className="glass-input" min={0} max={23} value={hours.endHour}
            onChange={e => { setHours(p => ({ ...p, endHour: Number(e.target.value) })); debounceSave(); }} />
        </div>
      </div>
    </div>
  );
}
