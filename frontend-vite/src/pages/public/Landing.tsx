import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { logger } from '../../services/logger';
import '../../styles/landing.css';
import { fixImageUrl } from '../../utils/imageUtils';
import LandingFooterSection from './LandingFooterSection';
import LandingSocialSection from './LandingSocialSection';
import LandingSkeletonLoader from './LandingSkeletonLoader';
import LandingLightbox from './LandingLightbox';
import LandingNoSlugState from './LandingNoSlugState';
import LandingErrorState from './LandingErrorState';
import LandingSectionRenderer from './LandingSectionRenderer';
import { DEFAULT_LAYOUT, daysInMonth, firstDayOfMonth } from './LandingConstants';
import type { TenantData, ServiceItem, StaffMember, ReviewItem, SlotItem, ServiceImage, TeamItem, LayoutBlock } from './LandingTypes';
import useLandingTheme from './components/useLandingTheme';
import useLandingClientInfo from './components/useLandingClientInfo';
import useLandingKeyboard from './components/useLandingKeyboard';
import useLandingQuickBook from './components/useLandingQuickBook';
import useLandingBooking from './components/useLandingBooking';

declare global {
  interface Window {
    __INITIAL_DATA__?: { tenant: TenantData; services: ServiceItem[] };
    __CAPTCHA_SITE_KEY__?: string;
  }
}

export default function Landing() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { slug: slugParam } = useParams();
  const tenantSlug = slugParam || searchParams.get('tenant') || '';
  const quickServiceId = searchParams.get('sid') ? Number(searchParams.get('sid')) : null;
  const quickStaffId = searchParams.get('staff') ? Number(searchParams.get('staff')) : null;
  const isQuickBook = quickServiceId !== null;

  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [serviceLightboxImages, setServiceLightboxImages] = useState<ServiceImage[]>([]);
  const [serviceLightboxIdx, setServiceLightboxIdx] = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const today = new Date().toISOString().split('T')[0];

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

  useEffect(() => {
    if (!tenantSlug) { setLoading(false); return; } // eslint-disable-line react-hooks/set-state-in-effect
    const initial = window.__INITIAL_DATA__;
    if (initial?.tenant && initial?.services) {
      setTenant(initial.tenant);
      setServices(initial.services || []);
      setLoading(false);
      delete window.__INITIAL_DATA__;
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
  }, [tenantSlug, t]);

  useLandingClientInfo(setClientName, setClientPhone, setClientEmail);

  useLandingQuickBook({ isQuickBook, quickServiceId, quickStaffId, services, quickBookError, setSelectedService, setSelectedStaff, setStep, setQuickBookError });

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

  useLandingTheme(tenant);

  useLandingKeyboard({ lightboxIdx, setLightboxIdx, serviceLightboxIdx, setServiceLightboxIdx, galleryLength: gallery.length, serviceLightboxImagesLength: serviceLightboxImages.length });

  const { handleBook, handleJoinWaitlist } = useLandingBooking({
    clientName, setClientName, clientPhone, setClientPhone,
    clientEmail, setClientEmail, clientNotes, setClientNotes,
    selectedService, setSelectedService, selectedStaff, setSelectedStaff,
    selectedDate, setSelectedDate, selectedTime, setSelectedTime,
    tenantSlug, couponCode, captchaToken,
    recurringEnabled, setRecurringEnabled,
    recurringFrequency, setRecurringFrequency,
    recurringCount, setRecurringCount,
    setMsg, setErrMsg, setStep,
    setWaitlistMsg, setWaitlistErr, setShowWaitlistForm,
  });

  const handleSelectService = useCallback((serviceId: number) => {
    setSelectedService(serviceId);
    setStep(2);
    document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSelectStaff = useCallback((id: number) => {
    setSelectedStaff(id);
    setStep(1);
    document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleOpenServiceLightbox = useCallback((imgs: ServiceImage[], idx: number) => {
    setServiceLightboxImages(imgs);
    setServiceLightboxIdx(idx);
  }, []);

  const captchaEnabled = !!(tenant as { captcha_enabled?: boolean } | null)?.captcha_enabled;
  const captchaSiteKey = window.__CAPTCHA_SITE_KEY__ || '';

  if (!tenantSlug) return <LandingNoSlugState />;
  if (loading) return <LandingSkeletonLoader />;
  if (error || !tenant) return <LandingErrorState t={t} error={error} />;

  return (
    <div className="landing-view">
      <div className="fixed top-12 right-12 z-1000">
        <LanguageSwitcher />
      </div>

      <LandingSectionRenderer
        layout={layout}
        tenant={tenant}
        services={services}
        reviews={reviews}
        gallery={gallery}
        team={team}
        staff={staff}
        fixImageUrl={fixImageUrl}
        onOpenLightbox={setLightboxIdx}
        onSelectService={handleSelectService}
        onSelectStaff={handleSelectStaff}
        onOpenServiceLightbox={handleOpenServiceLightbox}
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
        monthNames={t('landing.monthNames', { returnObjects: true }) as string[]}
        dayNames={t('landing.dayNames', { returnObjects: true }) as string[]}
        daysInMonth={daysInMonth}
        firstDayOfMonth={firstDayOfMonth}
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
        captchaEnabled={captchaEnabled}
        captchaSiteKey={captchaSiteKey}
        captchaToken={captchaToken}
        onSetCaptchaToken={setCaptchaToken}
        showWaitlistForm={showWaitlistForm}
        waitlistMsg={waitlistMsg}
        waitlistErr={waitlistErr}
        onSetShowWaitlistForm={setShowWaitlistForm}
        onJoinWaitlist={handleJoinWaitlist}
      />

      {hasSocial && (
        <section id="redes">
          <LandingSocialSection social={social} hasSocial={hasSocial} />
        </section>
      )}

      <LandingFooterSection
        businessName={tenant.business_name}
        businessAddress={tenant.business_address}
        businessPhone={tenant.business_phone}
        social={social}
        hasSocial={hasSocial}
      />

      <LandingLightbox
        images={gallery}
        currentIndex={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
        onPrev={() => setLightboxIdx(lightboxIdx !== null && lightboxIdx > 0 ? lightboxIdx - 1 : gallery.length - 1)}
        onNext={() => setLightboxIdx(lightboxIdx !== null && lightboxIdx < gallery.length - 1 ? lightboxIdx + 1 : 0)}
      />

      <LandingLightbox
        images={serviceLightboxImages}
        currentIndex={serviceLightboxIdx}
        onClose={() => setServiceLightboxIdx(null)}
        onPrev={() => setServiceLightboxIdx(serviceLightboxIdx !== null && serviceLightboxIdx > 0 ? serviceLightboxIdx - 1 : serviceLightboxImages.length - 1)}
        onNext={() => setServiceLightboxIdx(serviceLightboxIdx !== null && serviceLightboxIdx < serviceLightboxImages.length - 1 ? serviceLightboxIdx + 1 : 0)}
      />
    </div>
  );
}
