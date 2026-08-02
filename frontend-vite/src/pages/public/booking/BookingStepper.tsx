import React from "react";
import { useTranslation } from "react-i18next";
import "./booking.css";

interface BookingStepperProps {
  step: number;
  isQuickBook: boolean;
  onSetStep: (step: number) => void;
  staffLabel?: string;
}

const BookingStepper: React.FC<BookingStepperProps> = ({
  step,
  isQuickBook,
  onSetStep,
  staffLabel,
}) => {
  const { t } = useTranslation();

  const steps = isQuickBook
    ? [
        { label: t('booking.stepServicio'), number: 2 },
        { label: t('booking.stepFecha'), number: 3 },
        { label: t('booking.stepHorario'), number: 4 },
        { label: t('booking.stepTusDatos'), number: 5 },
      ]
    : [
        { label: staffLabel || t('booking.stepPeluquero'), number: 1 },
        { label: t('booking.stepServicio'), number: 2 },
        { label: t('booking.stepFecha'), number: 3 },
        { label: t('booking.stepHorario'), number: 4 },
        { label: t('booking.stepTusDatos'), number: 5 },
      ];

  return (
    <div className="stepper">
      {steps.map((s) => (
        <div
          key={s.number}
          className={`step ${step === s.number ? "active" : ""} ${step > s.number ? "completed" : ""}`}
          onClick={() => {
            if (s.number <= step) onSetStep(s.number);
          }}
        >
          <div className="step-number">{step > s.number ? "✓" : s.number}</div>
          <div className="step-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
};

export default BookingStepper;
