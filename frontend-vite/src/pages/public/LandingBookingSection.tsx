import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import BookingStepper from './booking/BookingStepper';
import BookingStaffSelection from './booking/BookingStaffSelection';
import BookingServiceAccordion from './booking/BookingServiceAccordion';
import BookingDatePicker from './booking/BookingDatePicker';
import BookingTimeSlots from './booking/BookingTimeSlots';
import BookingClientForm from './booking/BookingClientForm';
import type { ServiceImage, ServiceItem, StaffMember, SlotItem } from './booking/types';

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
  const selStaff = selectedStaff ? staff.find(s => s.id === selectedStaff) ?? null : null;
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
    return () => { const s = document.getElementById(id); if (s) s.remove(); };
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
        <BookingStepper step={step} isQuickBook={isQuickBook} onSetStep={onSetStep} />

        {/* Step 1: Staff */}
        {step === 1 && !isQuickBook && (
          <div className="step-content">
            <BookingStaffSelection staff={staff} selectedStaff={selectedStaff} fixImageUrl={fixImageUrl} onSetSelectedStaff={(id) => onSetSelectedStaff(id)} />
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button type="button" className="btn btn-primary" onClick={() => onSetStep(2)}>
                {t('booking.nextButton') || 'Siguiente'}
              </button>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                {selectedStaff ? null : (t('booking.skipStaffHint') || 'Podes elegir un profesional o continuar para asignacion automatica')}
              </p>
            </div>
          </div>
        )}

        {/* QuickBook loading / error */}
        {isQuickBook && !quickBookError && step < 3 && (
          <div className="step-content" style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>{t('booking.quickBookLoading')}</p>
          </div>
        )}
        {isQuickBook && quickBookError && (
          <div className="step-content" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--danger-light)' }}>{t('booking.quickBookError')}</p>
            <button type="button" className="btn btn-secondary" onClick={() => { window.location.href = `/p/${tenantSlug}`; }}>
              {t('booking.quickBookNormal')}
            </button>
          </div>
        )}

        {/* Step 2: Service accordion */}
        {step === 2 && !isQuickBook && (
          <div className="step-content">
            <label style={{ display: 'block', textAlign: 'center', marginBottom: 16, fontWeight: 600, color: 'var(--text-muted)' }}>
              {t('booking.selectService')}
            </label>
            <BookingServiceAccordion
              services={services}
              selectedService={selectedService}
              fixImageUrl={fixImageUrl}
              onOpenServiceLightbox={onOpenServiceLightbox}
              onSelect={(id) => { onSetSelectedService(id); onSetStep(3); }}
            />
          </div>
        )}

        {/* Step 3: Date picker */}
        {step === 3 && (
          <div className="step-content form-group" style={{ textAlign: 'center' }}>
            <label style={{ textAlign: 'center', marginBottom: 16, fontSize: '1rem' }}>{t('booking.selectDate')}</label>
            <BookingDatePicker
              calMonth={calMonth}
              calYear={calYear}
              selectedDate={selectedDate}
              today={today}
              monthNames={monthNames}
              dayNames={dayNames}
              daysInMonth={daysInMonth(calMonth, calYear)}
              firstDayOfMonth={firstDayOfMonth(calMonth, calYear)}
              onSetCalMonth={onSetCalMonth}
              onSetCalYear={onSetCalYear}
              onSetSelectedDate={onSetSelectedDate}
              onSetStep={onSetStep}
            />
          </div>
        )}

        {/* Step 4: Time slots */}
        {step === 4 && (
          <div className="step-content form-group">
            <BookingTimeSlots
              slots={slots}
              slotsTimeout={slotsTimeout}
              selectedTime={selectedTime}
              onSetSelectedTime={onSetSelectedTime}
              onSetStep={onSetStep}
              onFetchSlots={onFetchSlots}
              showWaitlistForm={showWaitlistForm}
              waitlistMsg={waitlistMsg}
              waitlistErr={waitlistErr}
              onSetShowWaitlistForm={onSetShowWaitlistForm}
              onJoinWaitlist={onJoinWaitlist}
            />
          </div>
        )}

        {/* Step 5: Client form */}
        {step === 5 && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <BookingClientForm
              clientName={clientName} onSetClientName={onSetClientName}
              clientPhone={clientPhone} onSetClientPhone={onSetClientPhone}
              clientEmail={clientEmail} onSetClientEmail={onSetClientEmail}
              clientNotes={clientNotes} onSetClientNotes={onSetClientNotes}
              couponCode={couponCode} onSetCouponCode={onSetCouponCode}
              couponDiscount={couponDiscount} onSetCouponDiscount={onSetCouponDiscount}
              tenantSlug={tenantSlug}
              captchaEnabled={captchaEnabled} captchaSiteKey={captchaSiteKey}
              captchaToken={captchaToken} onSetCaptchaToken={onSetCaptchaToken}
              recurringEnabled={recurringEnabled} onSetRecurringEnabled={onSetRecurringEnabled}
              recurringFrequency={recurringFrequency} onSetRecurringFrequency={onSetRecurringFrequency}
              recurringCount={recurringCount} onSetRecurringCount={onSetRecurringCount}
              onSetStep={onSetStep} onSubmit={onSubmit}
              services={services} selectedService={selectedService}
              selectedDate={selectedDate} selectedTime={selectedTime}
              selStaff={selStaff} fixImageUrl={fixImageUrl}
            />
            {captchaEnabled && captchaSiteKey && (
              <div className="form-group" style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <div ref={turnstileRef} />
              </div>
            )}
          </div>
        )}

        {/* Cancel */}
        {!msg && !errMsg && step < 5 && (!isQuickBook || step >= 4) && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              type="button" className="btn"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 20px' }}
              onClick={resetBooking}
            >
              {t('booking.cancelButton')}
            </button>
          </div>
        )}

        {/* Success */}
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

        {/* Error */}
        {errMsg && <div className="result error">{errMsg}</div>}
      </div>
    </>
  );
}
