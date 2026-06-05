const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%23334155"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236366f1" font-size="40"%3E📷%3C/text%3E%3C/svg%3E';

interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number | string | null;
  image: string | null;
}

interface StaffMember {
  id: number;
  name: string;
  photo_url: string | null;
  bio: string | null;
  specialties: string[];
}

interface SlotItem {
  time: string;
  available: boolean;
}

interface LandingBookingSectionProps {
  staff: StaffMember[];
  services: ServiceItem[];
  slots: SlotItem[];
  slotsTimeout: boolean;
  step: number;
  selectedStaff: number | null;
  selectedService: number | null;
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientNotes: string;
  msg: string;
  errMsg: string;
  isQuickBook: boolean;
  quickBookError: boolean;
  tenantSlug: string;
  calMonth: number;
  calYear: number;
  today: string;
  monthNames: string[];
  dayNames: string[];
  daysInMonth: (m: number, y: number) => number;
  firstDayOfMonth: (m: number, y: number) => number;
  fixImageUrl: (url: string | null | undefined) => string;
  onSetStep: (step: number) => void;
  onSetSelectedStaff: (id: number | null) => void;
  onSetSelectedService: (id: number | null) => void;
  onSetSelectedDate: (date: string) => void;
  onSetSelectedTime: (time: string) => void;
  onSetClientName: (v: string) => void;
  onSetClientPhone: (v: string) => void;
  onSetClientEmail: (v: string) => void;
  onSetClientNotes: (v: string) => void;
  onSetCalMonth: (m: number) => void;
  onSetCalYear: (y: number) => void;
  onFetchSlots: () => void;
  onSubmit: () => void;
  recurringEnabled: boolean;
  recurringFrequency: string;
  recurringCount: number;
  onSetRecurringEnabled: (v: boolean) => void;
  onSetRecurringFrequency: (v: string) => void;
  onSetRecurringCount: (v: number) => void;
}

export default function LandingBookingSection({
  staff, services, slots, slotsTimeout,
  step, selectedStaff, selectedService, selectedDate, selectedTime,
  clientName, clientPhone, clientEmail, clientNotes,
  msg, errMsg, isQuickBook, quickBookError, tenantSlug,
  calMonth, calYear, today, monthNames, dayNames, daysInMonth, firstDayOfMonth,
  fixImageUrl,
  onSetStep, onSetSelectedStaff, onSetSelectedService, onSetSelectedDate, onSetSelectedTime,
  onSetClientName, onSetClientPhone, onSetClientEmail, onSetClientNotes,
  onSetCalMonth, onSetCalYear, onFetchSlots, onSubmit,
  recurringEnabled, recurringFrequency, recurringCount,
  onSetRecurringEnabled, onSetRecurringFrequency, onSetRecurringCount,
}: LandingBookingSectionProps) {
  const selStaff = selectedStaff ? staff.find(s => s.id === selectedStaff) : null;
  const todayObj = new Date();

  const resetBooking = () => {
    if (isQuickBook) {
      onSetStep(3); onSetSelectedDate(''); onSetSelectedTime('');
    } else {
      onSetStep(1); onSetSelectedStaff(null); onSetSelectedService(null);
      onSetSelectedDate(''); onSetSelectedTime('');
    }
  };

  return (
    <section id="reservar" className="booking-section">
      <h2 className="section-title">Reservá tu turno</h2>
      <p className="section-subtitle">Completá los pasos para agendar</p>

      <div className="booking-container">
        {/* ── Stepper ── */}
        <div className="stepper">
          {isQuickBook ? (
            <>
              <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`} onClick={() => onSetStep(3)}>
                <div className="step-number">1</div>
                <div className="step-label">Fecha</div>
              </div>
              <div className={`step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`} onClick={() => step > 3 ? onSetStep(4) : undefined}>
                <div className="step-number">2</div>
                <div className="step-label">Horario</div>
              </div>
              <div className={`step ${step >= 5 ? 'active' : ''}`}>
                <div className="step-number">3</div>
                <div className="step-label">Tus datos</div>
              </div>
            </>
          ) : (
            <>
              <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => onSetStep(1)}>
                <div className="step-number">1</div>
                <div className="step-label">Peluquero</div>
              </div>
              <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} onClick={() => step > 1 ? onSetStep(2) : undefined}>
                <div className="step-number">2</div>
                <div className="step-label">Servicio</div>
              </div>
              <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`} onClick={() => step > 2 ? onSetStep(3) : undefined}>
                <div className="step-number">3</div>
                <div className="step-label">Fecha</div>
              </div>
              <div className={`step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`} onClick={() => step > 3 ? onSetStep(4) : undefined}>
                <div className="step-number">4</div>
                <div className="step-label">Horario</div>
              </div>
              <div className={`step ${step >= 5 ? 'active' : ''}`}>
                <div className="step-number">5</div>
                <div className="step-label">Tus datos</div>
              </div>
            </>
          )}
        </div>

        <form className="booking-form" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
          {/* ── Step 1: Elegí peluquero ── */}
          {step === 1 && !isQuickBook && (
            <div className="step-content">
              <label style={{ display: 'block', textAlign: 'center', marginBottom: 16, fontWeight: 600, color: 'var(--text-muted)' }}>
                Elegí tu peluquero
              </label>
              {staff.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay peluqueros disponibles</p>
              ) : (
                <div className="team-grid">
                  {staff.map(s => (
                    <div
                      key={s.id}
                      className={`team-card ${selectedStaff === s.id ? 'selected' : ''}`}
                      style={{ cursor: 'pointer', border: selectedStaff === s.id ? '2px solid var(--primary)' : '1px solid var(--glass-border)' }}
                      onClick={() => { onSetSelectedStaff(s.id); onSetStep(2); }}
                    >
                      {s.photo_url && (
                        <img
                          src={fixImageUrl(s.photo_url)}
                          alt={s.name}
                          className="team-photo"
                          onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                        />
                      )}
                      <h3 className="team-name">{s.name}</h3>
                      {s.specialties?.length ? <p className="team-role">{s.specialties.join(', ')}</p> : null}
                      {s.bio && <p className="team-bio">{s.bio}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── QuickBook loading / error ── */}
          {isQuickBook && !quickBookError && step < 3 && (
            <div className="step-content" style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Preparando reserva rápida...</p>
            </div>
          )}
          {isQuickBook && quickBookError && (
            <div className="step-content" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#fca5a5' }}>Servicio no disponible para reserva rápida</p>
              <button type="button" className="btn btn-secondary" onClick={() => { window.location.href = `/p/${tenantSlug}`; }}>
                Ir a reserva normal
              </button>
            </div>
          )}

          {/* ── Step 2: Elegí servicio ── */}
          {step === 2 && !isQuickBook && (
            <div className="step-content">
              <label style={{ display: 'block', textAlign: 'center', marginBottom: 16, fontWeight: 600, color: 'var(--text-muted)' }}>
                Elegí un servicio
              </label>
              <div className="booking-services">
                {services.map(s => (
                  <div
                    key={s.id}
                    className={`booking-service-card ${selectedService === s.id ? 'selected' : ''}`}
                    onClick={() => { onSetSelectedService(s.id); onSetStep(3); }}
                  >
                    {s.image && <div className="booking-service-image" style={{ backgroundImage: `url(${fixImageUrl(s.image)})` }} />}
                    <div className="booking-service-info">
                      <div className="booking-service-name">{s.name}</div>
                      <div className="booking-service-meta">
                        <span className="booking-service-duration">{s.duration} min</span>
                        <span className="booking-service-price">${s.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Elegí fecha ── */}
          {step === 3 && (
            <div className="step-content form-group" style={{ textAlign: 'center' }}>
              <label style={{ textAlign: 'center', marginBottom: 16, fontSize: '1rem' }}>Elegí una fecha disponible</label>
              <div className="custom-calendar" style={{ margin: '0 auto' }}>
                <div className="cal-header">
                  <button type="button" className="cal-nav" onClick={() => {
                    if (calMonth === 0) { onSetCalMonth(11); onSetCalYear(calYear - 1); }
                    else { onSetCalMonth(calMonth - 1); }
                  }}>&lsaquo;</button>
                  <span className="cal-month-year">{monthNames[calMonth]} {calYear}</span>
                  <button type="button" className="cal-nav" onClick={() => {
                    if (calMonth === 11) { onSetCalMonth(0); onSetCalYear(calYear + 1); }
                    else { onSetCalMonth(calMonth + 1); }
                  }}>&rsaquo;</button>
                </div>
                <div className="cal-weekdays">
                  {dayNames.map((d, i) => <span key={i} className={i >= 5 ? 'cal-weekend' : ''}>{d}</span>)}
                </div>
                <div className="cal-days">
                  {Array.from({ length: firstDayOfMonth(calMonth, calYear) }).map((_, i) => (
                    <div key={`e${i}`} className="cal-day empty" />
                  ))}
                  {Array.from({ length: daysInMonth(calMonth, calYear) }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isPast = new Date(dateStr) < new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
                    const isToday = dateStr === today;
                    const isSelected = dateStr === selectedDate;
                    const d = new Date(calYear, calMonth, day);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    let cls = 'cal-day';
                    if (isPast) cls += ' disabled';
                    if (isToday) cls += ' today';
                    if (isSelected) cls += ' selected';
                    if (!isPast && isWeekend) cls += ' weekend';
                    return (
                      <div key={day} className={cls} onClick={() => { if (!isPast) { onSetSelectedDate(dateStr); onSetStep(4); } }}>
                        {day}
                      </div>
                    );
                  })}
                </div>
                <div className="cal-footer">
                  <button type="button" className="cal-today-btn" onClick={() => { onSetCalMonth(todayObj.getMonth()); onSetCalYear(todayObj.getFullYear()); }}>
                    Hoy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Elegí horario ── */}
          {step === 4 && (
            <div className="step-content form-group">
              <label>Elegí un horario</label>
              {slotsTimeout ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                  <p>La consulta está demorando más de lo normal.{' '}
                    <button className="btn btn-link" onClick={onFetchSlots} style={{ padding: 0, margin: 0, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                      Reintentar
                    </button>
                  </p>
                </div>
              ) : slots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div>
                  <p>No hay horarios disponibles para esta fecha</p>
                </div>
              ) : (
                <div className="slots-grid" style={{ marginTop: 6 }}>
                  {slots.map(s => (
                    <button
                      key={s.time}
                      type="button"
                      className={`slot-btn ${selectedTime === s.time ? 'selected' : ''} ${!s.available ? 'disabled' : ''}`}
                      disabled={!s.available}
                      onClick={() => { onSetSelectedTime(s.time); onSetStep(5); }}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Datos del cliente ── */}
          {step === 5 && (
            <div className="step-content" style={{ maxWidth: 480, margin: '0 auto' }}>
              <div className="booking-summary">
                {selStaff && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--glass-border)' }}>
                    {selStaff.photo_url && (
                      <img src={fixImageUrl(selStaff.photo_url)} alt={selStaff.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                    <div><strong>{selStaff.name}</strong></div>
                  </div>
                )}
                {(() => {
                  const sv = services.find(s => s.id === selectedService);
                  return sv ? (
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div className="booking-summary-icon">✂️</div>
                      <div className="booking-summary-details">
                        <div className="booking-summary-title">{sv.name}</div>
                        <div className="booking-summary-sub">{sv.duration} min &middot; ${sv.price}</div>
                      </div>
                      <div className="booking-summary-right">
                        <div>{selectedDate}</div>
                        <div>{selectedTime}</div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input type="text" value={clientName} onChange={e => onSetClientName(e.target.value)} required placeholder="Tu nombre" />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={clientPhone} onChange={e => onSetClientPhone(e.target.value)} required placeholder="099 123 456" />
                </div>
              </div>
              <div className="form-group">
                <label>Email (opcional)</label>
                <input type="email" value={clientEmail} onChange={e => onSetClientEmail(e.target.value)} placeholder="mail@ejemplo.com" />
              </div>
              <div className="form-group">
                <label>Notas (opcional)</label>
                <textarea value={clientNotes} onChange={e => onSetClientNotes(e.target.value)} placeholder="Algún comentario..." rows={3} />
              </div>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={recurringEnabled} onChange={e => onSetRecurringEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
                  Repetir turno
                </label>
                {recurringEnabled && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                    <select value={recurringFrequency} onChange={e => onSetRecurringFrequency(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'inherit' }}>
                      <option value="weekly">Todas las semanas</option>
                      <option value="biweekly">Cada 2 semanas</option>
                      <option value="monthly">Todos los meses</option>
                    </select>
                    <select value={recurringCount} onChange={e => onSetRecurringCount(parseInt(e.target.value))}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'inherit' }}>
                      {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <option key={n} value={n}>{n} turnos</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="booking-actions">
                <button type="button" className="btn btn-secondary" onClick={() => onSetStep(4)}>Volver</button>
                <button type="submit" className="btn btn-primary btn-lg">Confirmar turno</button>
              </div>
            </div>
          )}

          {/* ── Cancelar ── */}
          {!msg && !errMsg && step < 5 && (!isQuickBook || step >= 4) && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                type="button"
                className="btn"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 20px' }}
                onClick={resetBooking}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* ── Éxito ── */}
          {msg && (
            <div className="step-content booking-success">
              <div className="success-checkmark">✓</div>
              <div className="success-title">{msg}</div>
              <div className="success-sub">Te enviamos un recordatorio antes del turno.</div>
              <button type="button" className="btn btn-primary btn-lg" onClick={resetBooking}>
                Reservar otro turno
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {errMsg && <div className="result error">{errMsg}</div>}
        </form>
      </div>
    </section>
  );
}
