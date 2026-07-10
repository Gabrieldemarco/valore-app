import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PhoneInput from '../../components/PhoneInput';
import { ChevronRight, Clock, DollarSign } from 'lucide-react';

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%23334155"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236366f1" font-size="40"%3E📷%3C/text%3E%3C/svg%3E';

interface ServiceImage {
  id: number;
  url: string;
  sort_order: number;
}

interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number | string | null;
  category: string;
  category_id: number | null;
  category_name: string | null;
  category_parent_id: number | null;
  description: string | null;
  image: string | null;
  images?: ServiceImage[];
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

interface CatNode {
  id: number | string;
  name: string;
  children: { id: number; name: string; services: ServiceItem[] }[];
  services: ServiceItem[];
}

function BookingAccordion({ services, selectedService, fixImageUrl, t, onSelect, onOpenServiceLightbox }: {
  services: ServiceItem[];
  selectedService: number | null;
  fixImageUrl: (url: string | null | undefined) => string;
  t: (key: string, fallback?: string) => string;
  onSelect: (id: number) => void;
  onOpenServiceLightbox?: (images: ServiceImage[], idx: number) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const catMap = new Map<number, CatNode>();
  const legacyCats: Record<string, ServiceItem[]> = {};

  for (const s of services) {
    if (s.category_id) {
      if (!catMap.has(s.category_id)) {
        catMap.set(s.category_id, { id: s.category_id, name: s.category_name || s.category, children: [], services: [] });
      }
      const node = catMap.get(s.category_id)!;
      const parentId = s.category_parent_id;
      if (parentId) {
        if (!catMap.has(parentId)) {
          catMap.set(parentId, { id: parentId, name: '', children: [], services: [] });
        }
        catMap.get(parentId)!.name = catMap.get(parentId)!.name || s.category_name || parentId.toString();
        let childGroup = node.children.find(c => c.id === s.category_id);
        if (!childGroup) {
          childGroup = { id: s.category_id, name: s.category_name || s.category, services: [] };
          node.children.push(childGroup);
        }
        childGroup.services.push(s);
      } else {
        node.services.push(s);
      }
    } else {
      const cat = s.category?.trim() || t('landingServices.otherCategory', 'Otros');
      if (!legacyCats[cat]) legacyCats[cat] = [];
      legacyCats[cat].push(s);
    }
  }

  const allGroups: { key: string; label: string; node: CatNode }[] = [];
  for (const node of catMap.values()) {
    if (node.name) allGroups.push({ key: `cat-${node.id}`, label: node.name, node });
  }
  for (const [catName, items] of Object.entries(legacyCats)) {
    allGroups.push({
      key: `legacy-${catName}`,
      label: catName,
      node: { id: catName, name: catName, children: [], services: items },
    });
  }

  allGroups.sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="services-accordion booking-accordion">
      {allGroups.map(group => {
        const isOpen = expanded.has(group.key);
        const node = group.node;
        const hasChildren = node.children.length > 0;
        const hasDirectServices = node.services.length > 0;

        return (
          <div key={group.key} className={`accordion-item ${isOpen ? 'open' : ''}`}>
            <button className="accordion-header" onClick={() => toggle(group.key)}>
              <ChevronRight size={16} className={`accordion-arrow ${isOpen ? 'rotated' : ''}`} />
              <span className="accordion-title">{group.label}</span>
              <span className="accordion-count">{node.services.length + node.children.reduce((s, c) => s + c.services.length, 0)}</span>
            </button>
            <div className={`accordion-body ${isOpen ? 'open' : ''}`}>
              <div className="accordion-body-inner">
                {hasChildren && (
                  <div className="booking-subcategories">
                    {node.children.map(sub => (
                      <div key={`sub-${sub.id}`} className="subcategory-group">
                        <h4 className="subcategory-title">{sub.name}</h4>
                        <div className="booking-services">
                          {sub.services.map(s => (
                            <div key={s.id}
                              className={`booking-service-card ${selectedService === s.id ? 'selected' : ''}`}
                              onClick={() => onSelect(s.id)}>
                              <div className="booking-service-card-image">
                                {s.image && <div className="booking-service-image" style={{ backgroundImage: `url(${fixImageUrl(s.image)})` }} />}
                                {s.images && s.images.length > 0 && (
                                  <div className="service-thumbnails">
                                    {s.images.slice(0, 3).map((img, i) => (
                                      <div key={img.id} className="service-thumb"
                                        onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], i); }}>
                                        <img src={fixImageUrl(img.url)} alt="" />
                                      </div>
                                    ))}
                                    {s.images.length > 3 && (
                                      <div className="service-thumb more"
                                        onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], 3); }}>
                                        <span>+{s.images.length - 3}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="booking-service-info">
                                <div className="booking-service-name">{s.name}</div>
                                <div className="booking-service-meta">
                                  <span className="booking-service-duration"><Clock size={14} /> {s.duration} {t('landingServices.minutes')}</span>
                                  <span className="booking-service-price"><DollarSign size={14} /> {t('landingServices.pricePrefix')}{formatPrice(s.price)}</span>
                                </div>
                                {s.description && <p className="service-description">{s.description}</p>}
                                <button className="service-book-btn"
                                  onClick={e => { e.stopPropagation(); onSelect(s.id); }}>
                                  {t('landingServices.bookButton', 'Agendar servicio')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {hasDirectServices && (
                  <div className="booking-services">
                    {node.services.map(s => (
                      <div key={s.id}
                        className={`booking-service-card ${selectedService === s.id ? 'selected' : ''}`}
                        onClick={() => onSelect(s.id)}>
                        <div className="booking-service-card-image">
                          {s.image && <div className="booking-service-image" style={{ backgroundImage: `url(${fixImageUrl(s.image)})` }} />}
                          {s.images && s.images.length > 0 && (
                            <div className="service-thumbnails">
                              {s.images.slice(0, 3).map((img, i) => (
                                <div key={img.id} className="service-thumb"
                                  onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], i); }}>
                                  <img src={fixImageUrl(img.url)} alt="" />
                                </div>
                              ))}
                              {s.images.length > 3 && (
                                <div className="service-thumb more"
                                  onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], 3); }}>
                                  <span>+{s.images.length - 3}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="booking-service-info">
                          <div className="booking-service-name">{s.name}</div>
                          <div className="booking-service-meta">
                            <span className="booking-service-duration"><Clock size={14} /> {s.duration} {t('landingServices.minutes')}</span>
                            <span className="booking-service-price"><DollarSign size={14} /> {t('landingServices.pricePrefix')}{formatPrice(s.price)}</span>
                          </div>
                          {s.description && <p className="service-description">{s.description}</p>}
                          <button className="service-book-btn"
                            onClick={e => { e.stopPropagation(); onSelect(s.id); }}>
                            {t('landingServices.bookButton', 'Agendar servicio')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface LandingBookingSectionProps {
  staff: StaffMember[];
  services: ServiceItem[];
  slots: SlotItem[];
  onOpenServiceLightbox?: (images: ServiceImage[], idx: number) => void;
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
  couponCode: string;
  couponDiscount: { valid: boolean; discount_amount?: number; final_price?: number; error?: string } | null;
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
  onSetCouponCode: (v: string) => void;
  onSetCouponDiscount: (v: { valid: boolean; discount_amount?: number; final_price?: number; error?: string } | null) => void;
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
  captchaEnabled: boolean;
  captchaSiteKey: string;
  captchaToken: string;
  onSetCaptchaToken: (v: string) => void;
  showWaitlistForm: boolean;
  waitlistMsg: string;
  waitlistErr: string;
  onSetShowWaitlistForm: (v: boolean) => void;
  onJoinWaitlist: () => void;
}

const formatPrice = (p: number | string | null): string => {
  if (p === null || p === undefined) return '';
  const n = typeof p === 'string' ? parseFloat(p) : p;
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
};

export default function LandingBookingSection({
  staff, services, slots, slotsTimeout, onOpenServiceLightbox,
  step, selectedStaff, selectedService, selectedDate, selectedTime,
  clientName, clientPhone, clientEmail, clientNotes,
  couponCode, couponDiscount,
  msg, errMsg, isQuickBook, quickBookError, tenantSlug,
  calMonth, calYear, today, monthNames, dayNames, daysInMonth, firstDayOfMonth,
  fixImageUrl,
  onSetStep, onSetSelectedStaff, onSetSelectedService, onSetSelectedDate, onSetSelectedTime,
  onSetClientName, onSetClientPhone, onSetClientEmail, onSetClientNotes,
  onSetCouponCode, onSetCouponDiscount,
  onSetCalMonth, onSetCalYear, onFetchSlots, onSubmit,
  recurringEnabled, recurringFrequency, recurringCount,
  onSetRecurringEnabled, onSetRecurringFrequency, onSetRecurringCount,
  captchaEnabled, captchaSiteKey, captchaToken, onSetCaptchaToken,
  showWaitlistForm, waitlistMsg, waitlistErr, onSetShowWaitlistForm, onJoinWaitlist,
}: LandingBookingSectionProps) {
  const { t } = useTranslation();
  const selStaff = selectedStaff ? staff.find(s => s.id === selectedStaff) : null;
  const todayObj = new Date();
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!captchaEnabled || !captchaSiteKey || step !== 5 || !turnstileRef.current) return;
    if (captchaToken) return;
    const id = 'turnstile-widget';
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.id = id;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (turnstileRef.current && (window as any).turnstile) {
        (window as any).turnstile.render(turnstileRef.current, {
          sitekey: captchaSiteKey,
          callback: (token: string) => onSetCaptchaToken(token),
        });
      }
    };
    document.body.appendChild(script);
    return () => {
      const s = document.getElementById(id);
      if (s) s.remove();
    };
  }, [captchaEnabled, captchaSiteKey, step, captchaToken, onSetCaptchaToken]);

  const resetBooking = () => {
    if (isQuickBook) {
      onSetStep(3); onSetSelectedDate(''); onSetSelectedTime('');
    } else {
      onSetStep(1); onSetSelectedStaff(null); onSetSelectedService(null);
      onSetSelectedDate(''); onSetSelectedTime('');
    }
  };

  return (
    <>
      <h2 className="section-title">{t('booking.title')}</h2>
      <p className="section-subtitle">{t('booking.subtitle')}</p>

      <div className="booking-container">
        {/* ── Stepper ── */}
        <div className="stepper">
          {isQuickBook ? (
            <>
              <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`} onClick={() => onSetStep(3)}>
                <div className="step-number">1</div>
                <div className="step-label">{t('booking.stepFecha')}</div>
              </div>
              <div className={`step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`} onClick={() => step > 3 ? onSetStep(4) : undefined}>
                <div className="step-number">2</div>
                <div className="step-label">{t('booking.stepHorario')}</div>
              </div>
              <div className={`step ${step >= 5 ? 'active' : ''}`}>
                <div className="step-number">3</div>
                <div className="step-label">{t('booking.stepTusDatos')}</div>
              </div>
            </>
          ) : (
            <>
              <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => onSetStep(1)}>
                <div className="step-number">1</div>
                <div className="step-label">{t('booking.stepPeluquero')}</div>
              </div>
              <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} onClick={() => step > 1 ? onSetStep(2) : undefined}>
                <div className="step-number">2</div>
                <div className="step-label">{t('booking.stepServicio')}</div>
              </div>
              <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`} onClick={() => step > 2 ? onSetStep(3) : undefined}>
                <div className="step-number">3</div>
                <div className="step-label">{t('booking.stepFecha')}</div>
              </div>
              <div className={`step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`} onClick={() => step > 3 ? onSetStep(4) : undefined}>
                <div className="step-number">4</div>
                <div className="step-label">{t('booking.stepHorario')}</div>
              </div>
              <div className={`step ${step >= 5 ? 'active' : ''}`}>
                <div className="step-number">5</div>
                <div className="step-label">{t('booking.stepTusDatos')}</div>
              </div>
            </>
          )}
        </div>

        <form className="booking-form" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
          {/* ── Step 1: Elegí peluquero (opcional) ── */}
          {step === 1 && !isQuickBook && (
            <div className="step-content">
              <label style={{ display: 'block', textAlign: 'center', marginBottom: 16, fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('booking.selectStaff')}
              </label>
              {staff.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('booking.noStaff')}</p>
              ) : (
                <div className="team-grid">
                  {staff.map(s => (
                    <div
                      key={s.id}
                      className={`team-card ${selectedStaff === s.id ? 'selected' : ''}`}
                      style={{ cursor: 'pointer', border: selectedStaff === s.id ? '2px solid var(--primary)' : '1px solid var(--glass-border)' }}
                      onClick={() => { onSetSelectedStaff(s.id); }}
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
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button type="button" className="btn btn-primary" onClick={() => onSetStep(2)}>
                  {t('booking.nextButton') || 'Siguiente'}
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  {selectedStaff ? null : (t('booking.skipStaffHint') || 'Podés elegir un profesional o continuar para asignación automática')}
                </p>
              </div>
            </div>
          )}

          {/* ── QuickBook loading / error ── */}
          {isQuickBook && !quickBookError && step < 3 && (
            <div className="step-content" style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>{t('booking.quickBookLoading')}</p>
            </div>
          )}
          {isQuickBook && quickBookError && (
            <div className="step-content" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#fca5a5' }}>{t('booking.quickBookError')}</p>
              <button type="button" className="btn btn-secondary" onClick={() => { window.location.href = `/p/${tenantSlug}`; }}>
                {t('booking.quickBookNormal')}
              </button>
            </div>
          )}

          {/* ── Step 2: Elegí servicio (acordeón) ── */}
          {step === 2 && !isQuickBook && (
            <div className="step-content">
              <label style={{ display: 'block', textAlign: 'center', marginBottom: 16, fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('booking.selectService')}
              </label>
              <BookingAccordion
                services={services}
                selectedService={selectedService}
                fixImageUrl={fixImageUrl}
                t={t}
                onOpenServiceLightbox={onOpenServiceLightbox}
                onSelect={(id) => { onSetSelectedService(id); onSetStep(3); }}
              />
            </div>
          )}

          {/* ── Step 3: Elegí fecha ── */}
          {step === 3 && (
            <div className="step-content form-group" style={{ textAlign: 'center' }}>
              <label style={{ textAlign: 'center', marginBottom: 16, fontSize: '1rem' }}>{t('booking.selectDate')}</label>
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
                    {t('booking.today')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Elegí horario ── */}
          {step === 4 && (
            <div className="step-content form-group">
              <label>{t('booking.selectTime')}</label>
              {slotsTimeout ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                  <p>{t('booking.slotsTimeout')}{' '}
                    <button className="btn btn-link" onClick={onFetchSlots} style={{ padding: 0, margin: 0, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                      {t('booking.retry')}
                    </button>
                  </p>
                </div>
              ) : showWaitlistForm ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                  <h4 style={{ margin: '0 0 8px' }}>{t('booking.waitlistFormTitle')}</h4>
                  <p style={{ fontSize: 13, marginBottom: 16 }}>{t('booking.waitlistFormHint')}</p>
                  {waitlistMsg ? (
                    <div style={{ color: '#4ade80', fontWeight: 600 }}>{waitlistMsg}</div>
                  ) : (
                    <>
                      {waitlistErr && <div className="result error" style={{ marginBottom: 12 }}>{waitlistErr}</div>}
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button type="button" className="btn btn-primary" onClick={onJoinWaitlist}>
                          {t('booking.waitlistConfirm')}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => { onSetShowWaitlistForm(false); }}>
                          {t('booking.cancelButton')}
                        </button>
                      </div>
                    </>
                  )}
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
                        <div className="booking-summary-sub">{sv.duration} {t('landingServices.minutes')} &middot; {t('landingServices.pricePrefix')}{formatPrice(sv.price)}</div>
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
                  <label>{t('booking.nameLabel')}</label>
                  <input type="text" value={clientName} onChange={e => onSetClientName(e.target.value)} required placeholder={t('booking.namePlaceholder')} />
                </div>
                <div className="form-group">
                  <label>{t('booking.phoneLabel')}</label>
                  <PhoneInput value={clientPhone} onChange={onSetClientPhone} required placeholder={t('booking.phonePlaceholder')} />
                </div>
              </div>
              <div className="form-group">
                <label>{t('booking.emailLabel')}</label>
                <input type="email" value={clientEmail} onChange={e => onSetClientEmail(e.target.value)} placeholder={t('booking.emailPlaceholder')} />
              </div>
              <div className="form-group">
                <label>{t('booking.notesLabel')}</label>
                <textarea value={clientNotes} onChange={e => onSetClientNotes(e.target.value)} placeholder={t('booking.notesPlaceholder')} rows={3} />
              </div>
              <div className="form-group">
                <label>{t('booking.couponLabel')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={couponCode} onChange={e => { onSetCouponCode(e.target.value.toUpperCase()); onSetCouponDiscount(null); }}
                    placeholder={t('booking.couponPlaceholder')} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'inherit' }} />
                </div>
                {couponDiscount && (
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    {couponDiscount.valid ? (
                      <span style={{ color: '#4ade80' }}>
                        {t('booking.couponApplied')} -${couponDiscount.discount_amount}
                      </span>
                    ) : (
                      <span style={{ color: '#fca5a5' }}>{couponDiscount.error || t('booking.couponInvalid')}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={recurringEnabled} onChange={e => onSetRecurringEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
                  {t('booking.recurringLabel')}
                </label>
                {recurringEnabled && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                    <select value={recurringFrequency} onChange={e => onSetRecurringFrequency(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'inherit' }}>
                      <option value="weekly">{t('booking.recurringWeekly')}</option>
                      <option value="biweekly">{t('booking.recurringBiweekly')}</option>
                      <option value="monthly">{t('booking.recurringMonthly')}</option>
                    </select>
                    <select value={recurringCount} onChange={e => onSetRecurringCount(parseInt(e.target.value))}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'inherit' }}>
                      {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <option key={n} value={n}>{n} {t('booking.recurringCount')}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {captchaEnabled && captchaSiteKey && (
                <div className="form-group" style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                  <div ref={turnstileRef} />
                </div>
              )}
              <div className="booking-actions">
                <button type="button" className="btn btn-secondary" onClick={() => onSetStep(4)}>{t('booking.backButton')}</button>
                <button type="submit" className="btn btn-primary btn-lg">{t('booking.submitButton')}</button>
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
                {t('booking.cancelButton')}
              </button>
            </div>
          )}

          {/* ── Éxito ── */}
          {msg && (
            <div className="step-content booking-success">
              <div className="success-checkmark">✓</div>
              <div className="success-title">{msg}</div>
              <div className="success-sub">{t('booking.successReminder')}</div>
              <button type="button" className="btn btn-primary btn-lg" onClick={resetBooking}>
                {t('booking.bookAnother')}
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {errMsg && <div className="result error">{errMsg}</div>}
        </form>
      </div>
    </>
  );
}
