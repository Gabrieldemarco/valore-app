import React from "react";
import { useTranslation } from "react-i18next";
import "./booking.css";

interface BookingDatePickerProps {
  calMonth: number;
  calYear: number;
  selectedDate: string;
  today: string;
  monthNames: string[];
  dayNames: string[];
  daysInMonth: number;
  firstDayOfMonth: number;
  onSetCalMonth: (month: number) => void;
  onSetCalYear: (year: number) => void;
  onSetSelectedDate: (date: string) => void;
  onSetStep: (step: number) => void;
}

const BookingDatePicker: React.FC<BookingDatePickerProps> = ({
  calMonth,
  calYear,
  selectedDate,
  today,
  monthNames,
  dayNames,
  daysInMonth,
  firstDayOfMonth,
  onSetCalMonth,
  onSetCalYear,
  onSetSelectedDate,
  onSetStep,
}) => {
  const { t } = useTranslation();

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      onSetCalMonth(11);
      onSetCalYear(calYear - 1);
    } else {
      onSetCalMonth(calMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      onSetCalMonth(0);
      onSetCalYear(calYear + 1);
    } else {
      onSetCalMonth(calMonth + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const mm = String(calMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${calYear}-${mm}-${dd}`;
    if (dateStr >= today) {
      onSetSelectedDate(dateStr);
      onSetStep(4);
    }
  };

  return (
    <div className="booking-date-picker">
      <div className="cal-header">
        <button className="cal-nav" onClick={handlePrevMonth} type="button">
          ‹
        </button>
        <div className="cal-month-year">
          {monthNames[calMonth]} {calYear}
        </div>
        <button className="cal-nav" onClick={handleNextMonth} type="button">
          ›
        </button>
      </div>

      <div className="cal-weekdays">
        {dayNames.map((d) => (
          <div key={d} className="cal-weekday">
            {d}
          </div>
        ))}
      </div>

      <div className="cal-days">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="cal-day empty" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const mm = String(calMonth + 1).padStart(2, "0");
          const dd = String(day).padStart(2, "0");
          const dateStr = `${calYear}-${mm}-${dd}`;
          const isDisabled = dateStr < today;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;

          return (
            <button
              key={day}
              type="button"
              className={`cal-day ${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${isDisabled ? "disabled" : ""}`}
              onClick={() => handleSelectDate(day)}
              disabled={isDisabled}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="cal-footer">
        <button
          type="button"
          className="cal-today-btn"
          onClick={() => {
            const now = new Date();
            onSetCalMonth(now.getMonth());
            onSetCalYear(now.getFullYear());
          }}
        >
          {t("booking.today", "Hoy")}
        </button>
      </div>
    </div>
  );
};

export default BookingDatePicker;
