import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BookingFormFields from './BookingFormFields';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('BookingFormFields', () => {
  it('requires full name, international phone, and email', () => {
    render(
      <BookingFormFields
        clientName=""
        onSetClientName={vi.fn()}
        clientPhone=""
        onSetClientPhone={vi.fn()}
        clientEmail=""
        onSetClientEmail={vi.fn()}
        clientNotes=""
        onSetClientNotes={vi.fn()}
        couponCode=""
        onSetCouponCode={vi.fn()}
        couponDiscount={null}
        onSetCouponDiscount={vi.fn()}
        couponLoading={false}
        couponError=""
        validateCoupon={vi.fn()}
        recurringEnabled={false}
        onSetRecurringEnabled={vi.fn()}
        recurringFrequency="weekly"
        onSetRecurringFrequency={vi.fn()}
        recurringCount={4}
        onSetRecurringCount={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/booking\.nameLabel/)).toBeRequired();
    expect(screen.getByLabelText(/booking\.phoneLabel/)).toBeRequired();
    expect(screen.getByLabelText(/booking\.emailLabel/)).toBeRequired();
    expect(screen.getByLabelText(/booking\.emailLabel/)).toHaveAttribute('type', 'email');
  });
});
