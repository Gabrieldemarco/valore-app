import { useTranslation } from "react-i18next";

interface CouponDiscount {
  valid: boolean;
  discount_amount?: number;
  final_price?: number;
  error?: string;
}

interface BookingFormFieldsProps {
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
  couponLoading: boolean;
  couponError: string;
  validateCoupon: () => void;
  recurringEnabled: boolean;
  onSetRecurringEnabled: (val: boolean) => void;
  recurringFrequency: string;
  onSetRecurringFrequency: (val: string) => void;
  recurringCount: number;
  onSetRecurringCount: (val: number) => void;
}

const BookingFormFields = ({
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
  couponLoading,
  couponError,
  validateCoupon,
  recurringEnabled,
  onSetRecurringEnabled,
  recurringFrequency,
  onSetRecurringFrequency,
  recurringCount,
  onSetRecurringCount,
}: BookingFormFieldsProps) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="form-group">
        <label htmlFor="clientName">
          {t('booking.nameLabel')} *
        </label>
        <input
          id="clientName"
          type="text"
          value={clientName}
          onChange={(e) => onSetClientName(e.target.value)}
          required
          className="form-input"
          placeholder={t('booking.namePlaceholder')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="clientPhone">
          {t('booking.phoneLabel')} *
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
          {t('booking.emailLabel')}
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
          {t('booking.notesLabel')}
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
          {t('booking.couponLabel')}
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
            placeholder={t('booking.couponPlaceholder')}
          />
          <button
            type="button"
            className="booking-btn secondary coupon-btn"
            onClick={validateCoupon}
            disabled={couponLoading}
          >
            {couponLoading ? "..." : t('booking.applyCoupon')}
          </button>
        </div>
        {couponDiscount && couponDiscount.valid && (
          <span className="coupon-success">
            {t('booking.couponApplied')} -${couponDiscount.discount_amount}
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
          {t('booking.recurringLabel')}
        </label>

        {recurringEnabled && (
          <div className="recurring-options">
            <div className="form-group">
              <label htmlFor="recurringFrequency">
                {t('booking.recurringFrequencyLabel')}
              </label>
              <select
                id="recurringFrequency"
                value={recurringFrequency}
                onChange={(e) => onSetRecurringFrequency(e.target.value)}
                className="form-select"
              >
                <option value="weekly">{t('booking.recurringWeekly')}</option>
                <option value="biweekly">{t('booking.recurringBiweekly')}</option>
                <option value="monthly">{t('booking.recurringMonthly')}</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="recurringCount">
                {t('booking.recurringCountLabel')}
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
    </>
  );
};

export default BookingFormFields;
