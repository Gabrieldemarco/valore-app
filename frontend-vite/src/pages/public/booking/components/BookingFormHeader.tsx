import { useTranslation } from "react-i18next";

import type { ServiceItem, StaffMember } from "../types";

interface BookingFormHeaderProps {
  selStaff: StaffMember | null;
  selectedServiceObj: ServiceItem | undefined;
  selectedDate: string;
  selectedTime: string;
  fixImageUrl: (url: string | null) => string;
}

const BookingFormHeader = ({
  selStaff,
  selectedServiceObj,
  selectedDate,
  selectedTime,
  fixImageUrl,
}: BookingFormHeaderProps) => {
  const { t } = useTranslation();

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
      {selectedServiceObj && (
        <div className="summary-service">
          <img
            src={fixImageUrl(selectedServiceObj.image)}
            alt={selectedServiceObj.name}
            className="summary-service-img"
          />
          <div className="summary-service-info">
            <h4>{selectedServiceObj.name}</h4>
            <p className="summary-price">
              {selectedServiceObj.price != null
                ? `$${selectedServiceObj.price}`
                : t('booking.priceOnRequest')}
            </p>
            <p className="summary-duration">
              {selectedServiceObj.duration} {t('landingServices.minutes')}
            </p>
          </div>
        </div>
      )}
      {selectedDate && selectedTime && (
        <div className="summary-datetime">
          <p>
            {selectedDate} - {selectedTime}
          </p>
        </div>
      )}
    </div>
  );
};

export default BookingFormHeader;
