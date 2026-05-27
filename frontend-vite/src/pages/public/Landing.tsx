import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import '../../styles/global-premium.css';
import '../../styles/landing.css';

interface TenantData {
  business_name: string;
  slug: string;
  landing_description: string | null;
  landing_hero_image: string | null;
  landing_gallery: unknown[] | null;
  landing_team: unknown[] | null;
  landing_social_links: Record<string, string> | null;
  landing_custom_css: string | null;
  landing_layout: LayoutBlock[] | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_logo_url: string | null;
  business_phone: string | null;
  business_address: string | null;
  opening_hours: Record<string, unknown> | null;
}

interface LayoutBlock {
  id: string;
  type: string;
  enabled: boolean;
  label?: string;
  title?: string;
  content?: string;
}

interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number | string | null;
  image: string | null;
}

interface TeamItem {
  name: string;
  specialties?: string[];
  role?: string;
  bio?: string | null;
  photo_url?: string | null;
  photo?: string;
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

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%23334155"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236366f1" font-size="40"%3E📷%3C/text%3E%3C/svg%3E';

function fixImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return window.location.origin + url;
  return url;
}

const DEFAULT_LAYOUT: LayoutBlock[] = [
  { id: 'hero', type: 'hero', enabled: true },
  { id: 'servicios', type: 'services', enabled: true },
  { id: 'galeria', type: 'gallery', enabled: true },
  { id: 'equipo', type: 'team', enabled: true },
  { id: 'reservar', type: 'booking', enabled: true },
];

export default function Landing() {
  const [searchParams] = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || '';
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [step, setStep] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [slotsTimeout, setSlotsTimeout] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const todayObj = new Date();
  const daysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (m: number, y: number) => (new Date(y, m, 1).getDay() + 6) % 7; // 0=Mon
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  useEffect(() => {
    if (!tenantSlug) { setLoading(false); return; }
    Promise.all([
      api.get<{ tenant: TenantData; services: ServiceItem[] }>(`/p/${tenantSlug}/landing`),
      api.get<{ staff: StaffMember[] }>(`/p/${tenantSlug}/staff`).catch(() => ({ staff: [] })),
    ])
      .then(([landing, staffRes]) => {
        setTenant(landing.tenant);
        setServices(landing.services || []);
        setStaff(staffRes.staff || []);
      })
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fetchSlots = useCallback(() => {
    if (!selectedDate || !selectedService) { setSlots([]); return; }
    setSlotsTimeout(false);
    const url = selectedStaff
      ? `/p/${tenantSlug}/staff/${selectedStaff}/availability?date=${selectedDate}&serviceId=${selectedService}`
      : `/p/${tenantSlug}/availability?date=${selectedDate}&serviceId=${selectedService}`;
    timeoutRef.current = setTimeout(() => setSlotsTimeout(true), 8000);
    api.get<{ slots: SlotItem[] }>(url)
      .then(r => { setSlotsTimeout(false); setSlots(r.slots || []); })
      .catch(() => { setSlotsTimeout(false); setSlots([]); console.warn('Error al cargar slots'); })
      .finally(() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); });
  }, [selectedDate, selectedService, selectedStaff, tenantSlug]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchSlots, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchSlots]);

  const gallery: string[] = Array.isArray(tenant?.landing_gallery) ? tenant.landing_gallery as string[] : [];
  const team: TeamItem[] = staff.length > 0 ? staff : (Array.isArray(tenant?.landing_team) ? tenant.landing_team as TeamItem[] : []);
  const social = tenant?.landing_social_links || {};
  const hasSocial = Object.values(social).some(Boolean);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (tenant?.landing_custom_css) {
      const el = document.createElement('style');
      el.id = 'landing-custom-css';
      el.textContent = tenant.landing_custom_css;
      document.head.appendChild(el);
      return () => { const s = document.getElementById('landing-custom-css'); if (s) s.remove(); };
    }
  }, [tenant]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null && i < gallery.length - 1 ? i + 1 : i);
      if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null && i > 0 ? i - 1 : i);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, gallery.length]);

  useEffect(() => {
    if (tenant?.business_name) document.title = `${tenant.business_name} | Veloré`;
  }, [tenant]);

  useEffect(() => {
    if (!tenant?.brand_primary_color && !tenant?.brand_secondary_color) return;
    const root = document.documentElement;
    if (tenant.brand_primary_color) root.style.setProperty('--primary', tenant.brand_primary_color);
    if (tenant.brand_secondary_color) root.style.setProperty('--accent', tenant.brand_secondary_color);
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
    };
  }, [tenant?.brand_primary_color, tenant?.brand_secondary_color]);

  const handleBook = async () => {
    setMsg(''); setErrMsg('');
    if (clientPhone.replace(/[^0-9]/g, '').length < 7) {
      setErrMsg('El teléfono debe tener al menos 7 dígitos');
      return;
    }
    const apptDate = selectedTime ? new Date(`${selectedDate}T${selectedTime}:00`).toISOString() : selectedDate;
    try {
      const body: Record<string, unknown> = {
        clientName,
        clientPhone,
        clientEmail: clientEmail || undefined,
        serviceId: selectedService,
        appointmentDate: apptDate,
        notes: clientNotes || undefined,
      };
      if (selectedStaff) body.staffId = selectedStaff;
      await api.post(`/p/${tenantSlug}/appointments`, body);
      setMsg('Turno reservado con éxito');
      setStep(1); setSelectedStaff(null); setSelectedService(null); setSelectedDate(''); setSelectedTime('');
      setClientName(''); setClientPhone(''); setClientEmail(''); setClientNotes('');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Error al reservar');
    }
  };

  const layout = useMemo(() => {
    const l = tenant?.landing_layout;
    return Array.isArray(l) && l.length > 0 ? l : DEFAULT_LAYOUT;
  }, [tenant?.landing_layout]);

  const renderSection = (block: LayoutBlock) => {
    if (!block.enabled) return null;

    switch (block.type) {
      case 'hero':
        return (
          <section key={block.id} className="hero">
            {tenant!.landing_hero_image && <div className="hero-image" style={{ backgroundImage: `url(${fixImageUrl(tenant!.landing_hero_image)})` }} />}
            <div className="hero-content">
              {tenant!.brand_logo_url && <img src={fixImageUrl(tenant!.brand_logo_url)} alt={tenant!.business_name} className="hero-logo" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />}
              <h1>{tenant!.business_name}</h1>
              {tenant!.landing_description && <p>{tenant!.landing_description}</p>}
              <a href="#reservar" className="btn btn-primary btn-lg">Reservar turno</a>
              <div className="hero-trust">
                <span>Atención personalizada</span>
                <span>Resultados garantizados</span>
              </div>
            </div>
          </section>
        );

      case 'services':
        if (services.length === 0) return null;
        return (
          <section key={block.id} id="servicios">
            <h2 className="section-title">Servicios</h2>
            <p className="section-subtitle">Elegí el servicio que mejor se adapte a vos</p>
            <div className="services-grid">
              {services.map(s => (
                <div key={s.id} className="service-card">
                  {s.image && <div className="service-image" style={{ backgroundImage: `url(${fixImageUrl(s.image)})`, height: 180 }} />}
                  <div className="service-content">
                    <h3 className="service-name">{s.name}</h3>
                    <div className="service-meta">
                      <span className="service-duration">{s.duration} min</span>
                      <span className="service-price">${s.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'gallery':
        if (gallery.length === 0) return null;
        return (
          <section key={block.id} id="galeria">
            <h2 className="section-title">Galería</h2>
            <p className="section-subtitle">Conocé nuestro trabajo</p>
            <div className="gallery-grid">
              {gallery.map((g, i) => (
                <div key={i} className="gallery-item" onClick={() => setLightboxIdx(i)}>
                  <img src={fixImageUrl(g)} alt="" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        );

      case 'team':
        if (team.length === 0) return null;
        return (
          <section key={block.id} id="equipo">
            <h2 className="section-title">Nuestro Equipo</h2>
            <p className="section-subtitle">Conocé a los profesionales</p>
            <div className="team-grid">
              {team.map((m, i) => {
                const staffMember = staff.find(s => s.name === m.name);
                const staffId = staffMember?.id || (m as StaffMember).id;
                return (
                <div key={i} className="team-card" style={staffId ? { cursor: 'pointer' } : undefined}
                  onClick={() => { if (staffId) { setSelectedStaff(staffId); setStep(1); document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' }); } }}>
                {(m.photo_url || m.photo) && <img src={fixImageUrl(m.photo_url || m.photo || '')} alt={m.name} className="team-photo" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} loading="lazy" />}
                <h3 className="team-name">{m.name}</h3>
                {(m.specialties?.join(', ') || m.role) && <p className="team-role">{m.specialties?.join(', ') || m.role}</p>}
                  {m.bio && <p className="team-bio">{m.bio}</p>}
                </div>
              );
              })}
            </div>
          </section>
        );

      case 'booking':
        const selStaff = selectedStaff ? staff.find(s => s.id === selectedStaff) : null;
        return (
          <section key={block.id} id="reservar" className="booking-section">
            <h2 className="section-title">Reservá tu turno</h2>
            <p className="section-subtitle">Completá los pasos para agendar</p>

            <div className="booking-container">
              <div className="stepper">
                <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => setStep(1)}>
                  <div className="step-number">1</div>
                  <div className="step-label">Peluquero</div>
                </div>
                <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} onClick={() => step > 1 ? setStep(2) : undefined}>
                  <div className="step-number">2</div>
                  <div className="step-label">Servicio</div>
                </div>
                <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`} onClick={() => step > 2 ? setStep(3) : undefined}>
                  <div className="step-number">3</div>
                  <div className="step-label">Fecha</div>
                </div>
                <div className={`step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`} onClick={() => step > 3 ? setStep(4) : undefined}>
                  <div className="step-number">4</div>
                  <div className="step-label">Horario</div>
                </div>
                <div className={`step ${step >= 5 ? 'active' : ''}`}>
                  <div className="step-number">5</div>
                  <div className="step-label">Tus datos</div>
                </div>
              </div>

              <form className="booking-form" onSubmit={e => { e.preventDefault(); handleBook(); }}>
                {step === 1 && (
                  <div className="step-content">
                    <label style={{ display: 'block', textAlign: 'center', marginBottom: 16, fontWeight: 600, color: 'var(--text-muted)' }}>Elegí tu peluquero</label>
                    {staff.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay peluqueros disponibles</p>
                    ) : (
                      <div className="team-grid">
                        {staff.map(s => (
                          <div key={s.id} className={`team-card ${selectedStaff === s.id ? 'selected' : ''}`}
                            style={{ cursor: 'pointer', border: selectedStaff === s.id ? '2px solid var(--primary)' : '1px solid var(--glass-border)' }}
                            onClick={() => { setSelectedStaff(s.id); setStep(2); }}>
                            {s.photo_url && <img src={fixImageUrl(s.photo_url)} alt={s.name} className="team-photo" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />}
                            <h3 className="team-name">{s.name}</h3>
                            {s.specialties?.length ? <p className="team-role">{s.specialties.join(', ')}</p> : null}
                            {s.bio && <p className="team-bio">{s.bio}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="step-content">
                    <label style={{ display: 'block', textAlign: 'center', marginBottom: 16, fontWeight: 600, color: 'var(--text-muted)' }}>Elegí un servicio</label>
                    <div className="booking-services">
                      {services.map(s => (
                        <div key={s.id}
                          className={`booking-service-card ${selectedService === s.id ? 'selected' : ''}`}
                          onClick={() => { setSelectedService(s.id); setStep(3); }}>
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

                {step === 3 && (
                  <div className="step-content form-group" style={{ textAlign: 'center' }}>
                    <label style={{ textAlign: 'center', marginBottom: 16, fontSize: '1rem' }}>Elegí una fecha disponible</label>
                    <div className="custom-calendar" style={{ margin: '0 auto' }}>
                      <div className="cal-header">
                        <button type="button" className="cal-nav" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else { setCalMonth(calMonth - 1); } }}>&lsaquo;</button>
                        <span className="cal-month-year">{monthNames[calMonth]} {calYear}</span>
                        <button type="button" className="cal-nav" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else { setCalMonth(calMonth + 1); } }}>&rsaquo;</button>
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
                            <div key={day} className={cls}
                              onClick={() => { if (!isPast) { setSelectedDate(dateStr); setStep(4); } }}>
                              {day}
                            </div>
                          );
                        })}
                      </div>
                      <div className="cal-footer">
                        <button type="button" className="cal-today-btn" onClick={() => { setCalMonth(todayObj.getMonth()); setCalYear(todayObj.getFullYear()); }}>Hoy</button>
                      </div>
                    </div>
                  </div>
                )}

                    {step === 4 && (
                      <div className="step-content form-group">
                        <label>Elegí un horario</label>
                        {slotsTimeout ? (
                          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                            <p>La consulta está demorando más de lo normal. <button className="btn btn-link" onClick={fetchSlots} style={{ padding: 0, margin: 0, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>Reintentar</button></p>
                          </div>
                        ) : slots.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div>
                        <p>No hay horarios disponibles para esta fecha</p>
                      </div>
                    ) : (
                      <div className="slots-grid" style={{ marginTop: 6 }}>
                        {slots.map(s => (
                          <button key={s.time} type="button" className={`slot-btn ${selectedTime === s.time ? 'selected' : ''} ${!s.available ? 'disabled' : ''}`}
                            disabled={!s.available} onClick={() => { setSelectedTime(s.time); setStep(5); }}>
                            {s.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {step === 5 && (
                  <div className="step-content" style={{ maxWidth: 480, margin: '0 auto' }}>
                    <div className="booking-summary">
                      {selStaff && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--glass-border)' }}>
                        {selStaff.photo_url && <img src={fixImageUrl(selStaff.photo_url)} alt={selStaff.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />}
                        <div><strong>{selStaff.name}</strong></div>
                      </div>}
                      {(() => { const sv = services.find(s => s.id === selectedService); return sv ? (
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
                      ) : null })()}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nombre</label>
                        <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} required placeholder="Tu nombre" />
                      </div>
                      <div className="form-group">
                        <label>Teléfono</label>
                        <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} required placeholder="099 123 456" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Email (opcional)</label>
                      <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="mail@ejemplo.com" />
                    </div>
                    <div className="form-group">
                      <label>Notas (opcional)</label>
                      <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} placeholder="Algún comentario..." rows={3} />
                    </div>
                    <div className="booking-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setStep(4)}>Volver</button>
                      <button type="submit" className="btn btn-primary btn-lg">Confirmar turno</button>
                    </div>
                  </div>
                )}

                {!msg && !errMsg && step < 5 && (
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 20px' }}
                      onClick={() => { setStep(1); setSelectedStaff(null); setSelectedService(null); setSelectedDate(''); setSelectedTime(''); }}>
                      Cancelar
                    </button>
                  </div>
                )}

                {msg && (
                  <div className="step-content booking-success">
                    <div className="success-checkmark">✓</div>
                    <div className="success-title">{msg}</div>
                    <div className="success-sub">Te enviamos un recordatorio antes del turno.</div>
                    <button type="button" className="btn btn-primary btn-lg" onClick={() => { setMsg(''); setErrMsg(''); setStep(1); setSelectedStaff(null); setSelectedService(null); setSelectedDate(''); setSelectedTime(''); }}>
                      Reservar otro turno
                    </button>
                  </div>
                )}
                {errMsg && <div className="result error">{errMsg}</div>}
              </form>
            </div>
          </section>
        );

      case 'custom':
        return (
          <section key={block.id} id={block.id}>
            {block.title && <h2 className="section-title">{block.title}</h2>}
            <div className="custom-block-content" dangerouslySetInnerHTML={{ __html: block.content || '' }} />
          </section>
        );

      default:
        return null;
    }
  };

  if (!tenantSlug) {
    return (
      <div className="landing-view">
        <div className="error-page">
          <div className="error-code">404</div>
          <h1>Salón no encontrado</h1>
          <p>No se especificó un salón.</p>
          <Link to="/" className="btn btn-primary">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="landing-view">
        <style>{`@keyframes skel{0%{opacity:.3}50%{opacity:.6}100%{opacity:.3}}`}</style>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'center', marginBottom: 60 }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ height: 40, width: '70%', background: 'rgba(148,163,184,0.15)', borderRadius: 8, marginBottom: 16, animation: 'skel 1.5s ease-in-out infinite' }} />
              <div style={{ height: 20, width: '90%', background: 'rgba(148,163,184,0.1)', borderRadius: 6, marginBottom: 10, animation: 'skel 1.5s ease-in-out infinite' }} />
              <div style={{ height: 20, width: '60%', background: 'rgba(148,163,184,0.1)', borderRadius: 6, animation: 'skel 1.5s ease-in-out infinite' }} />
            </div>
            <div style={{ width: '100%', maxWidth: 500, height: 320, background: 'rgba(148,163,184,0.08)', borderRadius: 16, animation: 'skel 1.5s ease-in-out infinite' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 60 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 180, background: 'rgba(148,163,184,0.08)', borderRadius: 12, animation: 'skel 1.5s ease-in-out infinite' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ width: 160, height: 180, background: 'rgba(148,163,184,0.08)', borderRadius: 12, animation: 'skel 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="landing-view">
        <div className="error-page">
          <div className="error-code">Error</div>
          <h1>No pudimos cargar esta página</h1>
          <p>{error || 'El salón no existe o no está disponible.'}</p>
          <Link to="/" className="btn btn-primary">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-view">
      {layout.map(renderSection)}

      {hasSocial && (
        <section id="redes">
          <h2 className="section-title">Seguinos</h2>
          <div className="social-links">
            {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="social-link">📷 Instagram</a>}
            {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="social-link">📘 Facebook</a>}
            {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="social-link">💬 WhatsApp</a>}
            {social.tiktok && <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="social-link">🎵 TikTok</a>}
            {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="social-link">🐦 Twitter</a>}
          </div>
        </section>
      )}

      <footer className="footer">
        <div className="footer-content">
          <p><strong>{tenant.business_name}</strong></p>
          {tenant.business_address && <p>{tenant.business_address}</p>}
          {tenant.business_phone && <p>📞 {tenant.business_phone}</p>}
          {hasSocial && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>📷</a>}
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>📘</a>}
              {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>💬</a>}
              {social.tiktok && <a href={social.tiktok} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>🎵</a>}
              {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>🐦</a>}
            </div>
          )}
          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} - Todos los derechos reservados
          </p>
        </div>
      </footer>

      {lightboxIdx !== null && gallery.length > 0 && (
        <div className="lightbox-overlay" onClick={() => setLightboxIdx(null)}>
          <button className="lightbox-close" onClick={() => setLightboxIdx(null)}>&times;</button>
          <button className="lightbox-prev" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx > 0 ? lightboxIdx - 1 : gallery.length - 1); }}>&lsaquo;</button>
          <img src={fixImageUrl(gallery[lightboxIdx])} alt="" className="lightbox-image" onClick={e => e.stopPropagation()} onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
          <button className="lightbox-next" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx < gallery.length - 1 ? lightboxIdx + 1 : 0); }}>&rsaquo;</button>
          <div className="lightbox-counter">{lightboxIdx + 1} / {gallery.length}</div>
        </div>
      )}
    </div>
  );
}
