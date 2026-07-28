import React, { useState } from "react";
import { useTranslation } from "react-i18next";

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
  captchaToken: string;
  onSetCaptchaToken: (val: string) => void;
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
  captchaToken,
  onSetCaptchaToken,
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
        setCouponError(t("booking.invalidCoupon", "Cupon invalido"));
      }
    } catch {
      setCouponError(t("booking.couponError", "Error al validar cupon"));
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div className="booking-client-form">
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
                  : t("booking.priceOnRequest", "Precio a consultar")}
              </p>
              <p className="summary-duration">
                {selectedServiceObj.duration} {t("booking.minutes", "min")}
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

      <form
        className="client-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="form-group">
          <label htmlFor="clientName">
            {t("booking.name", "Nombre")} *
          </label>
          <input
            id="clientName"
            type="text"
            value={clientName}
            onChange={(e) => onSetClientName(e.target.value)}
            required
            className="form-input"
            placeholder={t("booking.namePlaceholder", "Tu nombre")}
          />
        </div>

        <div className="form-group">
          <label htmlFor="clientPhone">
            {t("booking.phone", "Telefono")} *
          </label>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => onSetClientPhone(e.target.value)}
            required
            className="form-input phone-input"
            placeholder={t('booking.phonePlaceholder')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="clientEmail">
            {t("booking.email", "Email")}
          </label>
          <input
            id="clientEmail"
            type="email"
            value={clientEmail}
            onChange={(e) => onSetClientEmail(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="clientNotes">
            {t("booking.notes", "Notas")}
          </label>
          <textarea
            id="clientNotes"
            value={clientNotes}
            onChange={(e) => onSetClientNotes(e.target.value)}
            rows={3}
            className="form-textarea"
          />
        </div>

        <div className="form-group coupon-group">
          <label htmlFor="couponCode">
            {t("booking.coupon", "Cupon")}
          </label>
          <div className="coupon-row">
            <input
              id="couponCode"
              type="text"
              value={couponCode}
              onChange={(e) => {
                onSetCouponCode(e.target.value);
                onSetCouponDiscount(null);
              }}
              className="form-input"
              placeholder={t("booking.couponPlaceholder", "Ingresa tu codigo")}
            />
            <button
              type="button"
              className="booking-btn secondary coupon-btn"
              onClick={validateCoupon}
              disabled={couponLoading}
            >
              {couponLoading ? "..." : t("booking.applyCoupon", "Aplicar")}
            </button>
          </div>
          {couponDiscount && couponDiscount.valid && (
            <span className="coupon-success">
              {t("booking.couponApplied", "Descuento: ")} -${couponDiscount.discount_amount}
            </span>
          )}
          {couponDiscount && !couponDiscount.valid && (
            <span className="coupon-error">{couponDiscount.error || couponError}</span>
          )}
          {!couponDiscount && couponError && <span className="coupon-error">{couponError}</span>}
        </div>

        <div className="form-group recurring-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={recurringEnabled}
              onChange={(e) => onSetRecurringEnabled(e.target.checked)}
            />
            {t("booking.recurring", "Turno recurrente")}
          </label>

          {recurringEnabled && (
            <div className="recurring-options">
              <div className="form-group">
                <label htmlFor="recurringFrequency">
                  {t("booking.frequency", "Frecuencia")}
                </label>
                <select
                  id="recurringFrequency"
                  value={recurringFrequency}
                  onChange={(e) => onSetRecurringFrequency(e.target.value)}
                  className="form-select"
                >
                  <option value="weekly">{t("booking.weekly", "Semanal")}</option>
                  <option value="biweekly">{t("booking.biweekly", "Quincenal")}</option>
                  <option value="monthly">{t("booking.monthly", "Mensual")}</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="recurringCount">
                  {t("booking.repetitions", "Repeticiones")}
                </label>
                <input
                  id="recurringCount"
                  type="number"
                  min={2}
                  max={12}
                  value={recurringCount}
                  onChange={(e) => onSetRecurringCount(Number(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>
          )}
        </div>

        {captchaEnabled && captchaSiteKey && (
          <div className="captcha-group">
            <div className="g-recaptcha" data-sitekey={captchaSiteKey} />
          </div>
        )}

        <div className="booking-actions">
          <button
            type="button"
            className="booking-btn secondary"
            onClick={() => onSetStep(4)}
          >
            {t("booking.back", "Volver")}
          </button>
          <button type="submit" className="booking-btn primary">
            {t("booking.submitButton", "Confirmar turno")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingClientForm;
