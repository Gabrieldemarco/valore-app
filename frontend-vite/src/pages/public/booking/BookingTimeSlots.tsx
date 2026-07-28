import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SlotItem } from "./types";
import "./booking.css";

interface BookingTimeSlotsProps {
  slots: SlotItem[];
  slotsTimeout: boolean;
  selectedTime: string;
  onSetSelectedTime: (time: string) => void;
  onSetStep: (step: number) => void;
  showWaitlistForm: boolean;
  waitlistMsg: string;
  waitlistErr: string;
  onSetShowWaitlistForm: (show: boolean) => void;
  onJoinWaitlist: () => void;
}

const BookingTimeSlots: React.FC<BookingTimeSlotsProps> = ({
  slots,
  slotsTimeout,
  selectedTime,
  onSetSelectedTime,
  onSetStep,
  showWaitlistForm,
  waitlistMsg,
  waitlistErr,
  onSetShowWaitlistForm,
  onJoinWaitlist,
}) => {
  const { t } = useTranslation();
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");

  const availableSlots = slots.filter((s) => s.available);
  const allUnavailable = slots.length > 0 && availableSlots.length === 0;

  const handleJoinWaitlist = () => {
    onJoinWaitlist();
  };

  return (
    <div className="booking-time-slots">
      <h3 className="slots-title">
        {t('booking.selectTime')}
      </h3>

      {slotsTimeout && (
        <div className="slots-loading">
          <span>{t('booking.loadingSlots')}</span>
        </div>
      )}

      {!slotsTimeout && slots.length === 0 && (
        <div className="slots-empty">
          <p>{t('booking.noSlots')}</p>
        </div>
      )}

      {slots.length > 0 && (
        <div className="slots-grid">
          {slots.map((slot) => (
            <button
              key={slot.time}
              type="button"
              className={`slot-btn ${selectedTime === slot.time ? "selected" : ""} ${!slot.available ? "unavailable" : ""}`}
              disabled={!slot.available}
              onClick={() => {
                onSetSelectedTime(slot.time);
                onSetStep(5);
              }}
            >
              {slot.time}
            </button>
          ))}
        </div>
      )}

      {allUnavailable && (
        <div className="waitlist-section">
          {!showWaitlistForm ? (
            <button
              type="button"
              className="waitlist-btn"
              onClick={() => onSetShowWaitlistForm(true)}
            >
              {t('booking.joinWaitlist')}
            </button>
          ) : (
            <div className="waitlist-form">
              <h4>{t('booking.waitlistFormTitle')}</h4>
              <input
                type="text"
                placeholder={t('booking.nameLabel')}
                value={waitlistName}
                onChange={(e) => setWaitlistName(e.target.value)}
                className="waitlist-input"
              />
              <input
                type="tel"
                placeholder={t('booking.phoneLabel')}
                value={waitlistPhone}
                onChange={(e) => setWaitlistPhone(e.target.value)}
                className="waitlist-input"
              />
              <input
                type="email"
                placeholder={t('booking.emailLabel')}
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                className="waitlist-input"
              />
              <div className="booking-actions">
                <button
                  type="button"
                  className="booking-btn primary"
                  onClick={handleJoinWaitlist}
                >
                  {t('booking.waitlistConfirm')}
                </button>
                <button
                  type="button"
                  className="booking-btn secondary"
                  onClick={() => onSetShowWaitlistForm(false)}
                >
                  {t('common.cancel')}
                </button>
              </div>
              {waitlistMsg && <div className="waitlist-msg success">{waitlistMsg}</div>}
              {waitlistErr && <div className="waitlist-msg error">{waitlistErr}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingTimeSlots;
