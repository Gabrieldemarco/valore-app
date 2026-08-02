interface AppointmentActionsProps {
  t: (key: string) => string;
  canCancel: boolean;
  canReschedule: boolean;
  actionLoading: boolean;
  rescheduling: boolean;
  newDate: string;
  newTime: string;
  availableSlots: { time: string; available: boolean }[];
  onCancel: () => void;
  onStartReschedule: () => void;
  onCancelReschedule: () => void;
  onDateChange: (date: string) => void;
  onTimeSelect: (time: string) => void;
  onConfirmReschedule: () => void;
}

export default function AppointmentActions({
  t, canCancel, canReschedule, actionLoading,
  rescheduling, newDate, newTime, availableSlots,
  onCancel, onStartReschedule, onCancelReschedule,
  onDateChange, onTimeSelect, onConfirmReschedule,
}: AppointmentActionsProps) {
  return (
    <>
      {!rescheduling && (
        <div className="flex-gap-12 flex-wrap">
          {canReschedule && (
            <button onClick={onStartReschedule}
              className="btn btn-secondary">
              {t('appointmentManage.rescheduleButton')}
            </button>
          )}
          {canCancel && (
            <button onClick={onCancel} disabled={actionLoading}
              className="btn btn-secondary" style={{ opacity: actionLoading ? 0.6 : 1 }}>
              {actionLoading ? t('appointmentManage.cancelling') : t('appointmentManage.cancelButton')}
            </button>
          )}
        </div>
      )}

      {rescheduling && (
        <div className="p-24 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <h3 className="text-main m-0 mb-16 text-lg-2">{t('appointmentManage.rescheduleTitle')}</h3>
          <div className="flex-col flex-gap-12">
            <label className="text-muted">{t('appointmentManage.newDateLabel')}</label>
            <input type="date"
              value={newDate}
              onChange={e => onDateChange(e.target.value)}
              style={inputStyle()} />
            {availableSlots.length > 0 && (
              <>
                <label className="text-muted mt-8">{t('appointmentManage.newTimeLabel')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                  {availableSlots.map(slot => (
                    <button key={slot.time}
                      onClick={() => onTimeSelect(slot.time)}
                      style={{
                        ...slotStyle(slot.time === newTime),
                        opacity: slot.available ? 1 : 0.4,
                        cursor: slot.available ? 'pointer' : 'not-allowed',
                      }}>
                      {slot.time}
                    </button>
                  ))}
                </div>
              </>
            )}
            {availableSlots.length === 0 && newDate && (
              <p className="text-danger fs-14">{t('appointmentManage.noSlots')}</p>
            )}
            <div className="flex-gap-12 mt-16">
              <button onClick={onConfirmReschedule} disabled={!newDate || !newTime || actionLoading}
                className="btn btn-primary" style={{ opacity: !newDate || !newTime || actionLoading ? 0.6 : 1 }}>
                {actionLoading ? t('appointmentManage.rescheduling') : t('appointmentManage.confirmNewDate')}
              </button>
              <button onClick={onCancelReschedule}
                className="btn btn-accent">
                {t('appointmentManage.backButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function inputStyle() {
  return {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid var(--border-color, var(--text-dark))',
    background: 'var(--input-bg, var(--bg-card))',
    color: 'var(--text-main, #fff)',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };
}

function slotStyle(selected: boolean) {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: selected ? `2px solid var(--success)` : '1px solid var(--border-color, var(--text-dark))',
    background: selected ? 'rgba(16,185,129,0.15)' : 'var(--input-bg, var(--bg-card))',
    color: 'var(--text-main, #fff)',
    fontSize: 13,
    fontWeight: selected ? 600 : 400,
    cursor: 'pointer',
    textAlign: 'center' as const,
  };
}
