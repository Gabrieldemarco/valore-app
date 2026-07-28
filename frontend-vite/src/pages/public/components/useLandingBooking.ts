import { useTranslation } from 'react-i18next';
import { api } from '../../../api/client';

interface UseLandingBookingParams {
  clientName: string; clientPhone: string; clientEmail: string; clientNotes: string;
  selectedService: number | null; selectedStaff: number | null; selectedDate: string; selectedTime: string;
  tenantSlug: string; couponCode: string; captchaToken: string;
  recurringEnabled: boolean; recurringFrequency: string; recurringCount: number;
  setClientName: (v: string) => void; setClientPhone: (v: string) => void; setClientEmail: (v: string) => void; setClientNotes: (v: string) => void;
  setSelectedService: (v: number | null) => void; setSelectedStaff: (v: number | null) => void; setSelectedDate: (v: string) => void; setSelectedTime: (v: string) => void;
  setMsg: (v: string) => void; setErrMsg: (v: string) => void; setStep: (v: number) => void;
  setRecurringEnabled: (v: boolean) => void; setRecurringFrequency: (v: string) => void; setRecurringCount: (v: number) => void;
  setWaitlistMsg: (v: string) => void; setWaitlistErr: (v: string) => void; setShowWaitlistForm: (v: boolean) => void;
}

export default function useLandingBooking(params: UseLandingBookingParams) {
  const { t } = useTranslation();
  const {
    clientName, clientPhone, clientEmail, clientNotes, selectedService, selectedStaff, selectedDate, selectedTime, tenantSlug,
    couponCode, captchaToken, recurringEnabled, recurringFrequency, recurringCount,
    setClientName, setClientPhone, setClientEmail, setClientNotes,
    setSelectedService, setSelectedStaff, setSelectedDate, setSelectedTime,
    setMsg, setErrMsg, setStep, setRecurringEnabled, setRecurringFrequency, setRecurringCount,
    setWaitlistMsg, setWaitlistErr, setShowWaitlistForm,
  } = params;

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
      const res: Record<string, unknown> = await api.post(`/p/${tenantSlug}/appointments`, body);
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
      setWaitlistMsg(t('landing.waitlistSuccess'));
      setTimeout(() => setShowWaitlistForm(false), 2000);
    } catch (e: unknown) {
      setWaitlistErr(e instanceof Error ? e.message : t('landing.waitlistError'));
    }
  };

  return { handleBook, handleJoinWaitlist };
}
