import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { api } from '../../api/client';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import '../../styles/landing.css';
import LandingSkeletonLoader from './LandingSkeletonLoader';
import LandingHeroSection from './LandingHeroSection';
import LandingServicesSection from './LandingServicesSection';
import LandingTeamSection from './LandingTeamSection';
import LandingBookingSection from './LandingBookingSection';

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

const CACHE_BUST = Date.now();
function fixImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return window.location.origin + url + '?v=' + CACHE_BUST;
  return url;
}

const DEFAULT_LAYOUT: LayoutBlock[] = [
  { id: 'hero', type: 'hero', enabled: true },
  { id: 'servicios', type: 'services', enabled: true },
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
  const [msg, setMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [quickBookError, setQuickBookError] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('weekly');
  const [recurringCount, setRecurringCount] = useState(4);

  // ── UI state ──
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const today = new Date().toISOString().split('T')[0];

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
      api.get<{ tenant: TenantData; services: ServiceItem[] }>(`/p/${tenantSlug}/landing`),
      api.get<{ staff: StaffMember[] }>(`/p/${tenantSlug}/staff`).catch(() => ({ staff: [] })),
    ])
      .then(([landing, staffRes]) => {
        setTenant(landing.tenant);
        setServices(landing.services || []);
        setStaff(staffRes.staff || []);
      })
      .catch(() => setError(t('landing.loadError')))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

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
      .catch(() => { setSlotsTimeout(false); setSlots([]); console.warn('Error al cargar slots'); })
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
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null && i < gallery.length - 1 ? i + 1 : i);
      if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null && i > 0 ? i - 1 : i);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx]);

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

  // ── Section renderer ──
  const renderSection = (block: LayoutBlock) => {
    if (!block.enabled) return null;

    switch (block.type) {
      case 'hero':
        return (
          <section key={block.id} id="hero">
            <LandingHeroSection
              businessName={tenant!.business_name}
              description={tenant!.landing_description}
              heroImage={tenant!.landing_hero_image}
              logoUrl={tenant!.brand_logo_url}
              fixImageUrl={fixImageUrl}
              category={tenant!.category}
            />
          </section>
        );

      case 'services':
        return (
          <section key={block.id} id="servicios">
            <LandingServicesSection
              services={services}
              fixImageUrl={fixImageUrl}
              onSelectService={(serviceId) => {
                setSelectedService(serviceId);
                setStep(2);
                document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </section>
        );

      case 'gallery':
        return gallery.length > 0 ? (
          <section key={block.id} id="galeria">
            <h2 className="section-title">{t('landing.galleryTitle')}</h2>
            <p className="section-subtitle">{t('landing.gallerySubtitle')}</p>
            <div className="gallery-grid">
              {gallery.map((g, i) => (
                <div key={i} className="gallery-item" onClick={() => setLightboxIdx(i)}>
                  <img src={fixImageUrl(g)} alt="" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        ) : null;

      case 'team':
        return team.length > 0 ? (
          <section key={block.id} id="equipo">
            <LandingTeamSection
              team={team}
              staff={staff}
              gallery={[]}
              fixImageUrl={fixImageUrl}
              onSelectStaff={(id) => { setSelectedStaff(id); setStep(1); document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' }); }}
              onOpenLightbox={setLightboxIdx}
            />
          </section>
        ) : null;

      case 'booking':
        return (
          <section key={block.id} id="reservar">
            <LandingBookingSection
            staff={staff}
            services={services}
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
          />
          </section>
        );

      case 'hours':
        return (
          <section key={block.id} id="horarios">
            <h2 className="section-title">{t('landing.hoursTitle')}</h2>
            <p className="section-subtitle">{t('landing.hoursSubtitle')}</p>
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              {(() => {
                const h = tenant?.opening_hours as Record<string, unknown> | null;
                const startHour = (h?.startHour as number) ?? 9;
                const endHour = (h?.endHour as number) ?? 19;
                const workDays = (h?.workDays as number[]) ?? [1, 2, 3, 4, 5];
                const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                return dayNames.map((name, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    <span style={{ color: workDays.includes(i) ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {workDays.includes(i) ? `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00` : 'Cerrado'}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </section>
        );

      case 'custom':
        return (
          <section key={block.id} id={block.id}>
            {block.title && <h2 className="section-title">{block.title}</h2>}
            <div className="custom-block-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content || '') }} />
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
          <h2 className="section-title">{t('landing.socialTitle')}</h2>
          <div className="social-links">
            {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialInstagram')}</a>}
            {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialFacebook')}</a>}
            {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialWhatsApp')}</a>}
            {social.tiktok && <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialTikTok')}</a>}
            {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialTwitter')}</a>}
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
            &copy; {new Date().getFullYear()} - {t('landing.footerRights')}
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
