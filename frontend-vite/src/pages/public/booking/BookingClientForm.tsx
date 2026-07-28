import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import BookingFormHeader from "./components/BookingFormHeader";
import BookingFormFields from "./components/BookingFormFields";
import BookingCaptcha from "./components/BookingCaptcha";

import type { ServiceItem, StaffMember } from "./types";
import "./booking.css";

interface CouponDiscount {
  valid: boolean;
  discount_amount?: number;
  final_price?: number;
  error?: string;
}

interface BookingClientFormProps {
  clientName: string;
  onSetClientName: (val: string) => void;
  clientPhone: string;
  onSetClientPhone: (val: string) => void;
  clientEmail: string;
  onSetClientEmail: (val: string) => void;
  clientNotes: string;
  onSetClientNotes: (val: string) => void;
  couponCode: string;
  onSetCouponCode: (val: string) => void;
  couponDiscount: CouponDiscount | null;
  onSetCouponDiscount: (val: CouponDiscount | null) => void;
  tenantSlug: string;
  captchaEnabled: boolean;
  captchaSiteKey: string;
  recurringEnabled: boolean;
  onSetRecurringEnabled: (val: boolean) => void;
  recurringFrequency: string;
  onSetRecurringFrequency: (val: string) => void;
  recurringCount: number;
  onSetRecurringCount: (val: number) => void;
  onSetStep: (step: number) => void;
  onSubmit: () => void;
  services: ServiceItem[];
  selectedService: number | null;
  selectedDate: string;
  selectedTime: string;
  selStaff: StaffMember | null;
  fixImageUrl: (url: string | null) => string;
}

const BookingClientForm: React.FC<BookingClientFormProps> = ({
  clientName,
  onSetClientName,
  clientPhone,
  onSetClientPhone,
  clientEmail,
  onSetClientEmail,
  clientNotes,
  onSetClientNotes,
  couponCode,
  onSetCouponCode,
  couponDiscount,
  onSetCouponDiscount,
  tenantSlug,
  captchaEnabled,
  captchaSiteKey,
  recurringEnabled,
  onSetRecurringEnabled,
  recurringFrequency,
  onSetRecurringFrequency,
  recurringCount,
  onSetRecurringCount,
  onSetStep,
  onSubmit,
  services,
  selectedService,
  selectedDate,
  selectedTime,
  selStaff,
  fixImageUrl,
}) => {
  const { t } = useTranslation();
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const selectedServiceObj = services.find((s) => s.id === selectedService);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await fetch(
        `/api/v1/tenants/${tenantSlug}/coupons/validate?code=${encodeURIComponent(couponCode)}`
      );
      const data = await res.json();
      if (res.ok && data.discount) {
        onSetCouponDiscount(data.discount);
        setCouponError("");
      } else {
        onSetCouponDiscount(null);
        setCouponError(t('booking.couponInvalid'));
      }
    } catch {
      setCouponError(t('booking.couponInvalid'));
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div className="booking-client-form">
      <BookingFormHeader
        selStaff={selStaff}
        selectedServiceObj={selectedServiceObj}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        fixImageUrl={fixImageUrl}
      />

      <form
        className="client-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <BookingFormFields
          clientName={clientName}
          onSetClientName={onSetClientName}
          clientPhone={clientPhone}
          onSetClientPhone={onSetClientPhone}
          clientEmail={clientEmail}
          onSetClientEmail={onSetClientEmail}
          clientNotes={clientNotes}
          onSetClientNotes={onSetClientNotes}
          couponCode={couponCode}
          onSetCouponCode={onSetCouponCode}
          couponDiscount={couponDiscount}
          onSetCouponDiscount={onSetCouponDiscount}
          couponLoading={couponLoading}
          couponError={couponError}
          validateCoupon={validateCoupon}
          recurringEnabled={recurringEnabled}
          onSetRecurringEnabled={onSetRecurringEnabled}
          recurringFrequency={recurringFrequency}
          onSetRecurringFrequency={onSetRecurringFrequency}
          recurringCount={recurringCount}
          onSetRecurringCount={onSetRecurringCount}
        />

        {captchaEnabled && captchaSiteKey && (
          <div className="captcha-group">
            <BookingCaptcha captchaSiteKey={captchaSiteKey} />
          </div>
        )}

        <div className="booking-actions">
          <button
            type="button"
            className="booking-btn secondary"
            onClick={() => onSetStep(4)}
          >
            {t('booking.backButton')}
          </button>
          <button type="submit" className="booking-btn primary">
            {t('booking.submitButton')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingClientForm;
