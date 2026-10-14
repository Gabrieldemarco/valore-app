import { useTranslation } from 'react-i18next';
import { api } from '../../../api/client';
import type { SlotItem } from '../LandingTypes';

interface UseLandingBookingParams {
  clientName: string; clientPhone: string; clientEmail: string; clientNotes: string;
  selectedService: number | null; selectedServices: number[]; selectedStaff: number | null; selectedDate: string; selectedSlot: SlotItem | null;
  tenantSlug: string; couponCode: string; captchaToken: string;
  recurringEnabled: boolean; recurringFrequency: string; recurringCount: number;
  setClientName: (v: string) => void; setClientPhone: (v: string) => void; setClientEmail: (v: string) => void; setClientNotes: (v: string) => void;
   setSelectedService: (v: number | null) => void; setSelectedServices: (v: number[]) => void; setSelectedStaff: (v: number | null) => void; setSelectedDate: (v: string) => void; setSelectedSlot: (v: SlotItem | null) => void;
  setMsg: (v: string) => void; setErrMsg: (v: string) => void; setStep: (v: number) => void;
  setRecurringEnabled: (v: boolean) => void; setRecurringFrequency: (v: string) => void; setRecurringCount: (v: number) => void;
  setWaitlistMsg: (v: string) => void; setWaitlistErr: (v: string) => void; setShowWaitlistForm: (v: boolean) => void;
}

export default function useLandingBooking(params: UseLandingBookingParams) {
  const { t } = useTranslation();
  const {
    clientName, clientPhone, clientEmail, clientNotes,   selectedService, selectedServices, selectedStaff, selectedDate, selectedSlot, tenantSlug,
    couponCode, captchaToken, recurringEnabled, recurringFrequency, recurringCount,
    setClientName, setClientPhone, setClientEmail, setClientNotes,
    setSelectedService, setSelectedServices, setSelectedStaff, setSelectedDate, setSelectedSlot,
    setMsg, setErrMsg, setStep, setRecurringEnabled, setRecurringFrequency, setRecurringCount,
    setWaitlistMsg, setWaitlistErr, setShowWaitlistForm,
  } = params;

  const handleBook = async () => {
    setMsg(''); setErrMsg('');
    if (clientPhone.replace(/[^0-9]/g, '').length < 7) {
      setErrMsg('El teléfono debe tener al menos 7 dígitos');
      return;
    }
    const apptDate = selectedSlot?.datetime || selectedDate;
    try {
       const body: Record<string, unknown> = {
         clientName, clientPhone,
         clientEmail: clientEmail || undefined,
         serviceId: selectedService,
         appointmentDate: apptDate,
         notes: clientNotes || undefined,
       };
       if (selectedServices && selectedServices.length > 1) {
         body.serviceIds = selectedServices;
       }
      if (selectedStaff) body.staffId = selectedStaff;
      if (couponCode) body.couponCode = couponCode.toUpperCase();
      if (captchaToken) body.captchaToken = captchaToken;
      if (recurringEnabled) {
        body.recurring = { frequency: recurringFrequency, count: recurringCount };
      }
      const res: Record<string, unknown> = await api.post(`/p/${tenantSlug}/appointments`, body);
      if (res.deposit_required && res.checkout_url) {
        window.location.href = res.checkout_url as string;
        return;
      }
      setMsg(res.recurring ? `${res.recurring_count} ${t('landing.appointmentsCreated')}` : t('landing.bookSuccess'));
      setStep(1); setSelectedStaff(null); setSelectedService(null); setSelectedServices([]); setSelectedDate(''); setSelectedSlot(null);
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
       if (selectedServices && selectedServices.length > 1) {
         body.serviceIds = selectedServices;
       }
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
