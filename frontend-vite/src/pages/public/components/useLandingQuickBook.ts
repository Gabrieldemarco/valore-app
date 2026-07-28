import { useEffect } from 'react';
import type { ServiceItem } from '../LandingTypes';

interface UseLandingQuickBookParams {
  isQuickBook: boolean;
  quickServiceId: number | null;
  quickStaffId: number | null;
  services: ServiceItem[];
  quickBookError: boolean;
  setSelectedService: (v: number | null) => void;
  setSelectedStaff: (v: number | null) => void;
  setStep: (v: number) => void;
  setQuickBookError: (v: boolean) => void;
}

export default function useLandingQuickBook(params: UseLandingQuickBookParams) {
  const { isQuickBook, quickServiceId, quickStaffId, services, quickBookError, setSelectedService, setSelectedStaff, setStep, setQuickBookError } = params;

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
  }, [isQuickBook, quickServiceId, quickStaffId, services, quickBookError, setSelectedService, setSelectedStaff, setStep, setQuickBookError]);
}
