import { useTranslation } from "react-i18next";

import type { ServiceItem, StaffMember, SlotItem } from "../types";

interface BookingFormHeaderProps {
  selStaff: StaffMember | null;
  selectedServices: ServiceItem[];
  selectedDate: string;
  selectedSlot: SlotItem | null;
  fixImageUrl: (url: string | null) => string;
}

const BookingFormHeader = ({
  selStaff,
  selectedServices,
  selectedDate,
  selectedSlot,
  fixImageUrl,
}: BookingFormHeaderProps) => {
  const { t } = useTranslation();
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + parseFloat(String(s.price || 0)), 0);

  return (
    <div className="booking-summary">
      {selStaff && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--glass-border)' }}>
          {selStaff.photo_url && (
            <img src={fixImageUrl(selStaff.photo_url)} alt={selStaff.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <div><strong>{selStaff.name}</strong></div>
        </div>
      )}
      {selectedServices.length === 1 && (
        <div className="summary-service">
          <img
            src={fixImageUrl(selectedServices[0].image)}
            alt={selectedServices[0].name}
            className="summary-service-img"
          />
          <div className="summary-service-info">
            <h4>{selectedServices[0].name}</h4>
            <p className="summary-price">
              {selectedServices[0].price != null
                ? `$${selectedServices[0].price}`
                : t('booking.priceOnRequest')}
            </p>
            <p className="summary-duration">
              {selectedServices[0].duration} {t('landingServices.minutes')}
            </p>
          </div>
        </div>
      )}
      {selectedServices.length > 1 && (
        <div className="summary-multiple-services" style={{ width: '100%' }}>
          <h4 style={{ marginBottom: 8 }}>{t('booking.multipleServicesTitle', { count: selectedServices.length })}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {selectedServices.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{s.duration} {t('landingServices.minutes')} · ${formatPrice(s.price)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 8, marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>{t('booking.totalDuration')}</span>
              <span>{totalDuration} {t('landingServices.minutes')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>{t('booking.totalPrice')}</span>
              <span>${formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>
      )}
      {selectedDate && selectedSlot?.time && (
        <div className="summary-datetime">
          <p>
            {selectedDate} - {selectedSlot.time}
          </p>
        </div>
      )}
    </div>
  );
};

const formatPrice = (p: number | string | null | undefined): string => {
  if (p === null || p === undefined) return '';
  const n = typeof p === 'string' ? parseFloat(p) : p;
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
};

export default BookingFormHeader;
