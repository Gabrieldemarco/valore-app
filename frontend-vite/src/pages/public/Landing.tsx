import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { api } from '../../api/client';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import ScrollReveal from '../../components/ScrollReveal';
import { logger } from '../../services/logger';
import '../../styles/landing.css';
import { PLACEHOLDER_IMG, fixImageUrl } from '../../utils/imageUtils';
import LandingSkeletonLoader from './LandingSkeletonLoader';
import LandingHeroSection from './LandingHeroSection';
import LandingServicesSection from './LandingServicesSection';
import LandingTeamSection from './LandingTeamSection';
import LandingBookingSection from './LandingBookingSection';
import LandingLightbox from './LandingLightbox';

interface TenantData {
  business_name: string;
  slug: string;
  category?: string;
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
  landing_background_color: string | null;
  landing_hero_height: number | null;
  landing_hero_width: number | null;
  landing_primary_text_color: string | null;
  landing_secondary_text_color: string | null;
  landing_primary_font: string | null;
  landing_secondary_font: string | null;
}

interface LayoutBlock {
  id: string;
  type: string;
  enabled: boolean;
  label?: string;
  title?: string;
  content?: string;
}

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

interface ReviewItem {
  id: number;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
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

const DEFAULT_LAYOUT: LayoutBlock[] = [
  { id: 'hero', type: 'hero', enabled: true },
  { id: 'servicios', type: 'services', enabled: true },
  { id: 'resenas', type: 'reviews', enabled: true },
  { id: 'galeria', type: 'gallery', enabled: true },
  { id: 'equipo', type: 'team', enabled: true },
  { id: 'reservar', type: 'booking', enabled: true },
  { id: 'hours', type: 'hours', enabled: true },
];

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const daysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
const firstDayOfMonth = (m: number, y: number) => (new Date(y, m, 1).getDay() + 6) % 7;

export default function Landing() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { slug: slugParam } = useParams();
  const tenantSlug = slugParam || searchParams.get('tenant') || '';
  const quickServiceId = searchParams.get('sid') ? Number(searchParams.get('sid')) : null;
  const quickStaffId = searchParams.get('staff') ? Number(searchParams.get('staff')) : null;
  const isQuickBook = quickServiceId !== null;

  // ── Data state ──
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Booking state ──
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
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<{ valid: boolean; discount_amount?: number; final_price?: number; error?: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistMsg, setWaitlistMsg] = useState('');
  const [waitlistErr, setWaitlistErr] = useState('');
  const [msg, setMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [quickBookError, setQuickBookError] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('weekly');
  const [recurringCount, setRecurringCount] = useState(4);

  // ── UI state ──
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [serviceLightboxImages, setServiceLightboxImages] = useState<ServiceImage[]>([]);
  const [serviceLightboxIdx, setServiceLightboxIdx] = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const today = new Date().toISOString().split('T')[0];

  // ── Derived data ──
  const gallery: string[] = Array.isArray(tenant?.landing_gallery) ? tenant.landing_gallery as string[] : [];
  const team: TeamItem[] = staff.length > 0 ? staff : (Array.isArray(tenant?.landing_team) ? tenant.landing_team as TeamItem[] : []);
  const social = tenant?.landing_social_links || {};
  const hasSocial = Object.values(social).some(Boolean);

  const layout = useMemo(() => {
    const l = tenant?.landing_layout;
    const saved = Array.isArray(l) && l.length > 0 ? (l as LayoutBlock[]) : [];
    const savedIds = new Set(saved.map(b => b.id));
    return [...saved, ...DEFAULT_LAYOUT.filter(b => !savedIds.has(b.id))];
  }, [tenant?.landing_layout]);

  // ── Data fetching ──
  useEffect(() => {
    if (!tenantSlug) { setLoading(false); return; }
    const initial = (window as any).__INITIAL_DATA__;
    if (initial?.tenant && initial?.services) {
      setTenant(initial.tenant);
      setServices(initial.services || []);
      setLoading(false);
      delete (window as any).__INITIAL_DATA__;
      return;
    }
    Promise.all([
      api.get<{ tenant: TenantData; services: ServiceItem[]; reviews: ReviewItem[] }>(`/p/${tenantSlug}/landing`),
      api.get<{ staff: StaffMember[] }>(`/p/${tenantSlug}/staff`).catch(() => ({ staff: [] })),
    ])
      .then(([landing, staffRes]) => {
        setTenant(landing.tenant);
        setServices(landing.services || []);
        setStaff(staffRes.staff || []);
        setReviews(landing.reviews || []);
      })
      .catch(() => setError(t('landing.loadError')))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  // ── Auto-fill for logged-in clients ──
  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) return;
    const storedName = localStorage.getItem('clientDisplayName') || localStorage.getItem('clientName');
    const storedPhone = localStorage.getItem('clientPhone');
    const storedEmail = localStorage.getItem('clientEmail');
    if (storedName) setClientName(storedName);
    if (storedPhone) setClientPhone(storedPhone);
    if (storedEmail) setClientEmail(storedEmail);
    if (!storedName || !storedPhone || !storedEmail) {
      fetch('/api/client/me', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(r => r.json())
        .then(data => {
          const displayName = data.user?.name || data.user?.username;
          if (displayName) { setClientName(displayName); localStorage.setItem('clientDisplayName', displayName); }
          if (data.user?.phone) { setClientPhone(data.user.phone); localStorage.setItem('clientPhone', data.user.phone); }
          if (data.user?.email) { setClientEmail(data.user.email); localStorage.setItem('clientEmail', data.user.email); }
        })
        .catch(() => {});
    }
  }, []);

  // ── QuickBook pre-selection ──
  useEffect(() => {
    if (isQuickBook && services.length > 0 && !quickBookError) {
      const found = services.find(s => s.id === quickServiceId);
      if (found) {
        setSelectedService(quickServiceId);
        if (quickStaffId) setSelectedStaff(quickStaffId);
        setStep(3);
      } else {
        setQuickBookError(true);
      }
    }
  }, [isQuickBook, quickServiceId, quickStaffId, services, quickBookError]);

  // ── Slots fetching ──
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
      .catch(() => { setSlotsTimeout(false); setSlots([]); logger.warn('Error al cargar slots'); })
      .finally(() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); });
  }, [selectedDate, selectedService, selectedStaff, tenantSlug]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchSlots, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchSlots]);

  // ── Side effects ──
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const fontsToLoad: string[] = [];
    if (tenant?.landing_primary_font && tenant.landing_primary_font !== 'system') fontsToLoad.push(tenant.landing_primary_font);
    if (tenant?.landing_secondary_font && tenant.landing_secondary_font !== 'system' && tenant.landing_secondary_font !== tenant.landing_primary_font) fontsToLoad.push(tenant.landing_secondary_font);
    for (const font of fontsToLoad) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      links.push(link);
    }
    if (tenant?.landing_custom_css) {
      const el = document.createElement('style');
      el.id = 'landing-custom-css';
      el.textContent = tenant.landing_custom_css;
      document.head.appendChild(el);
      return () => {
        el.remove();
        links.forEach(l => l.remove());
      };
    }
    return () => { links.forEach(l => l.remove()); };
  }, [tenant]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightboxIdx(null); setServiceLightboxIdx(null); }
      if (lightboxIdx !== null) {
        if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null && i < gallery.length - 1 ? i + 1 : i);
        if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null && i > 0 ? i - 1 : i);
      }
      if (serviceLightboxIdx !== null) {
        if (e.key === 'ArrowRight') setServiceLightboxIdx(i => i !== null && i < serviceLightboxImages.length - 1 ? i + 1 : i);
        if (e.key === 'ArrowLeft') setServiceLightboxIdx(i => i !== null && i > 0 ? i - 1 : i);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, serviceLightboxIdx, gallery.length, serviceLightboxImages.length]);

  useEffect(() => {
    if (tenant?.business_name) document.title = `${tenant.business_name} | Velsoie`;
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

  // ── Booking submission ──
  const handleBook = async () => {
    setMsg(''); setErrMsg('');
    if (clientPhone.replace(/[^0-9]/g, '').length < 7) {
      setErrMsg('El teléfono debe tener al menos 7 dígitos');
      return;
    }
    const apptDate = selectedTime ? new Date(`${selectedDate}T${selectedTime}:00`).toISOString() : selectedDate;
    try {
      const body: Record<string, unknown> = {
        clientName, clientPhone,
        clientEmail: clientEmail || undefined,
        serviceId: selectedService,
        appointmentDate: apptDate,
        notes: clientNotes || undefined,
      };
      if (selectedStaff) body.staffId = selectedStaff;
    if (couponCode) body.couponCode = couponCode.toUpperCase();
    if (captchaToken) body.captchaToken = captchaToken;
    if (recurringEnabled) {
        body.recurring = { frequency: recurringFrequency, count: recurringCount };
      }
      const res: any = await api.post(`/p/${tenantSlug}/appointments`, body);
      if (res.deposit_required && res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      setMsg(res.recurring ? `${res.recurring_count} ${t('landing.appointmentsCreated')}` : t('landing.bookSuccess'));
      setStep(1); setSelectedStaff(null); setSelectedService(null); setSelectedDate(''); setSelectedTime('');
      setClientName(''); setClientPhone(''); setClientEmail(''); setClientNotes('');
      setRecurringEnabled(false); setRecurringFrequency('weekly'); setRecurringCount(4);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : t('landing.bookError'));
    }
  };

  const handleJoinWaitlist = async () => {
    setWaitlistMsg(''); setWaitlistErr('');
    if (clientPhone.replace(/[^0-9]/g, '').length < 7) {
      setWaitlistErr('El teléfono debe tener al menos 7 dígitos');
      return;
    }
    if (!selectedService) {
      setWaitlistErr('Seleccioná un servicio primero');
      return;
    }
    try {
      const body: Record<string, unknown> = {
        clientName, clientPhone,
        clientEmail: clientEmail || undefined,
        serviceId: selectedService,
        notes: clientNotes || undefined,
      };
      if (selectedStaff) body.staffId = selectedStaff;
      await api.post(`/p/${tenantSlug}/waitlist`, body);
      setWaitlistMsg(t('landing.waitlistSuccess', 'Te agregamos a la lista de espera'));
      setTimeout(() => setShowWaitlistForm(false), 2000);
    } catch (e: unknown) {
      setWaitlistErr(e instanceof Error ? e.message : t('landing.waitlistError', 'Error al unirse a la lista de espera'));
    }
  };

  // ── Section renderer ──
  const renderSection = (block: LayoutBlock) => {
    if (!block.enabled) return null;

    switch (block.type) {
      case 'hero':
        return (
          <div key={block.id} id="hero">
            <LandingHeroSection
              businessName={tenant!.business_name}
              description={tenant!.landing_description}
              heroImage={tenant!.landing_hero_image}
              logoUrl={tenant!.brand_logo_url}
              fixImageUrl={fixImageUrl}
              category={tenant!.category}
            />
          </div>
        );

      case 'services':
        return (
          <section key={block.id} id="servicios">
            <ScrollReveal>
              <div className="section-divider wide" />
              <h2 className="section-title">{t('landing.servicesTitle', 'Servicios')}</h2>
              <p className="section-subtitle">{t('landing.servicesSubtitle', 'Descubrí nuestra oferta de tratamientos y servicios premium')}</p>
            </ScrollReveal>
            <ScrollReveal delay={2}>
              <LandingServicesSection
                services={services}
                fixImageUrl={fixImageUrl}
                onSelectService={(serviceId) => {
                  setSelectedService(serviceId);
                  setStep(2);
                  document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
                }}
                onOpenServiceLightbox={(imgs, idx) => {
                  setServiceLightboxImages(imgs);
                  setServiceLightboxIdx(idx);
                }}
              />
            </ScrollReveal>
          </section>
        );

      case 'reviews':
        return reviews.length > 0 ? (
          <section key={block.id} id="resenas">
            <ScrollReveal>
              <div className="section-divider" />
              <h2 className="section-title">{t('landing.reviewsTitle', 'Reseñas')}</h2>
            </ScrollReveal>
            <ScrollReveal delay={1}>
              <div className="reviews-summary">
                <span className="reviews-average">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`star ${i < Math.round(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) ? 'filled' : ''}`}>&#9733;</span>
                  ))}
                  <span className="reviews-score">{(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)}</span>
                  <span className="reviews-count">({reviews.length} {t('landing.reviewsCount', 'opiniones')})</span>
                </span>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={2}>
              <div className="reviews-list">
                {reviews.slice(0, 6).map(r => (
                  <div key={r.id} className="review-card">
                    <div className="review-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`star ${i < r.rating ? 'filled' : ''}`}>&#9733;</span>
                      ))}
                    </div>
                    <p className="review-comment">{r.comment}</p>
                    <span className="review-author">- {r.client_name}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </section>
        ) : null;

      case 'gallery':
        return gallery.length > 0 ? (
          <section key={block.id} id="galeria">
            <ScrollReveal>
              <div className="section-divider" />
              <h2 className="section-title">{t('landing.galleryTitle')}</h2>
              <p className="section-subtitle">{t('landing.gallerySubtitle')}</p>
            </ScrollReveal>
            <ScrollReveal delay={1}>
              <div className="gallery-grid">
                {gallery.map((g, i) => (
                  <div key={i} className="gallery-item" onClick={() => setLightboxIdx(i)}>
                    <img src={fixImageUrl(g)} alt="" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} loading="lazy" />
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </section>
        ) : null;

      case 'team':
        return team.length > 0 ? (
          <section key={block.id} id="equipo">
            <ScrollReveal>
              <LandingTeamSection
                team={team}
                staff={staff}
                gallery={[]}
                fixImageUrl={fixImageUrl}
                onSelectStaff={(id) => { setSelectedStaff(id); setStep(1); document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' }); }}
                onOpenLightbox={setLightboxIdx}
              />
            </ScrollReveal>
          </section>
        ) : null;

      case 'booking':
        return (
          <section key={block.id} id="reservar">
            <ScrollReveal>
              <div className="section-divider wide" />
              <h2 className="section-title">{t('landing.bookingTitle', 'Reservá tu turno')}</h2>
              <p className="section-subtitle">{t('landing.bookingSubtitle', 'Elegí el servicio, profesional y horario que prefieras')}</p>
            </ScrollReveal>
            <ScrollReveal delay={1}>
              <LandingBookingSection
            staff={staff}
            services={services}
            onOpenServiceLightbox={(imgs, idx) => {
              setServiceLightboxImages(imgs);
              setServiceLightboxIdx(idx);
            }}
            slots={slots}
            slotsTimeout={slotsTimeout}
            step={step}
            selectedStaff={selectedStaff}
            selectedService={selectedService}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            clientName={clientName}
            clientPhone={clientPhone}
            clientEmail={clientEmail}
            clientNotes={clientNotes}
            couponCode={couponCode}
            couponDiscount={couponDiscount}
            msg={msg}
            errMsg={errMsg}
            isQuickBook={isQuickBook}
            quickBookError={quickBookError}
            tenantSlug={tenantSlug}
            calMonth={calMonth}
            calYear={calYear}
            today={today}
            monthNames={MONTH_NAMES}
            dayNames={DAY_NAMES}
            daysInMonth={daysInMonth}
            firstDayOfMonth={firstDayOfMonth}
            fixImageUrl={fixImageUrl}
            onSetStep={setStep}
            onSetSelectedStaff={setSelectedStaff}
            onSetSelectedService={setSelectedService}
            onSetSelectedDate={setSelectedDate}
            onSetSelectedTime={setSelectedTime}
            onSetClientName={setClientName}
            onSetClientPhone={setClientPhone}
            onSetClientEmail={setClientEmail}
            onSetClientNotes={setClientNotes}
            onSetCouponCode={setCouponCode}
            onSetCouponDiscount={setCouponDiscount}
            onSetCalMonth={setCalMonth}
            onSetCalYear={setCalYear}
            onFetchSlots={fetchSlots}
            onSubmit={handleBook}
            recurringEnabled={recurringEnabled}
            recurringFrequency={recurringFrequency}
            recurringCount={recurringCount}
            onSetRecurringEnabled={setRecurringEnabled}
            onSetRecurringFrequency={setRecurringFrequency}
            onSetRecurringCount={setRecurringCount}
            captchaEnabled={tenant?.captcha_enabled || false}
            captchaSiteKey={(window as any).__CAPTCHA_SITE_KEY__ || ''}
            captchaToken={captchaToken}
            onSetCaptchaToken={setCaptchaToken}
            showWaitlistForm={showWaitlistForm}
            waitlistMsg={waitlistMsg}
            waitlistErr={waitlistErr}
            onSetShowWaitlistForm={setShowWaitlistForm}
            onJoinWaitlist={handleJoinWaitlist}
          />
            </ScrollReveal>
          </section>
        );

      case 'hours':
        return (
          <section key={block.id} id="horarios">
            <ScrollReveal>
              <div className="section-divider" />
              <h2 className="section-title">{t('landing.hoursTitle')}</h2>
              <p className="section-subtitle">{t('landing.hoursSubtitle')}</p>
            </ScrollReveal>
            <ScrollReveal delay={1}>
              <div className="hours-table">
                {(() => {
                  const h = tenant?.opening_hours as Record<string, unknown> | null;
                  const startHour = (h?.startHour as number) ?? 9;
                  const endHour = (h?.endHour as number) ?? 19;
                  const workDays = (h?.workDays as number[]) ?? [1, 2, 3, 4, 5];
                  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  return dayNames.map((name, i) => (
                    <div key={i} className="hours-row">
                      <span className="hours-day">{name}</span>
                      <span className={`hours-time ${workDays.includes(i) ? 'open' : 'closed'}`}>
                        {workDays.includes(i) ? `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00` : t('landing.closed', 'Cerrado')}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </ScrollReveal>
          </section>
        );

      case 'custom':
        return (
          <section key={block.id} id={block.id}>
            {block.title && <h2 className="section-title">{block.title}</h2>}
            <div className="custom-block-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content || '', { ADD_TAGS: ['iframe'], ADD_ATTR: ['src', 'width', 'height', 'style', 'allowfullscreen', 'loading', 'frameborder', 'allow', 'title', 'referrerpolicy'] }) }} />
          </section>
        );

      default:
        return null;
    }
  };

  // ── Guards ──
  if (!tenantSlug) {
    return (
      <div className="landing-view">
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }}>
          <LanguageSwitcher />
        </div>
        <div className="error-page">
          <div className="error-code">{t('landing.errorCode404')}</div>
          <h1>{t('landing.noSlugTitle')}</h1>
          <p>{t('landing.noSlugMessage')}</p>
          <Link to="/" className="btn btn-primary">{t('landing.noSlugBack')}</Link>
        </div>
      </div>
    );
  }

  if (loading) return <LandingSkeletonLoader />;

  if (error || !tenant) {
    return (
      <div className="landing-view">
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }}>
          <LanguageSwitcher />
        </div>
        <div className="error-page">
          <div className="error-code">{t('landing.errorCode')}</div>
          <h1>{t('landing.errorTitle')}</h1>
          <p>{error || t('landing.errorMessage')}</p>
          <Link to="/" className="btn btn-primary">{t('landing.errorBack')}</Link>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="landing-view">
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }}>
        <LanguageSwitcher />
      </div>
      {layout.map(renderSection)}

      {hasSocial && (
        <section id="redes">
          <ScrollReveal>
            <div className="section-divider" />
            <h2 className="section-title">{t('landing.socialTitle')}</h2>
            <div className="social-links">
              {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialInstagram')}</a>}
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialFacebook')}</a>}
              {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialWhatsApp')}</a>}
              {social.tiktok && <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialTikTok')}</a>}
              {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialTwitter')}</a>}
            </div>
          </ScrollReveal>
        </section>
      )}

      <ScrollReveal>
        <footer className="footer">
          <div className="footer-content">
            <p><strong>{tenant.business_name}</strong></p>
            {tenant.business_address && <p>{tenant.business_address}</p>}
            {tenant.business_phone && <p>📞 {tenant.business_phone}</p>}
            {hasSocial && (
              <div className="footer-socials">
                {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="footer-social-link">📷</a>}
                {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="footer-social-link">📘</a>}
                {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="footer-social-link">💬</a>}
                {social.tiktok && <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="footer-social-link">🎵</a>}
                {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="footer-social-link">🐦</a>}
              </div>
            )}
            <p className="footer-copyright">
              &copy; {new Date().getFullYear()} - {t('landing.footerRights')}
            </p>
          </div>
        </footer>
      </ScrollReveal>

      <LandingLightbox
        images={gallery}
        currentIndex={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
        onPrev={() => setLightboxIdx(lightboxIdx > 0 ? lightboxIdx - 1 : gallery.length - 1)}
        onNext={() => setLightboxIdx(lightboxIdx < gallery.length - 1 ? lightboxIdx + 1 : 0)}
      />

      <LandingLightbox
        images={serviceLightboxImages}
        currentIndex={serviceLightboxIdx}
        onClose={() => setServiceLightboxIdx(null)}
        onPrev={() => setServiceLightboxIdx(serviceLightboxIdx > 0 ? serviceLightboxIdx - 1 : serviceLightboxImages.length - 1)}
        onNext={() => setServiceLightboxIdx(serviceLightboxIdx < serviceLightboxImages.length - 1 ? serviceLightboxIdx + 1 : 0)}
      />
    </div>
  );
}
