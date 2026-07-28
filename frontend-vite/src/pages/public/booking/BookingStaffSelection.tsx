import React from "react";
import { useTranslation } from "react-i18next";
import type { StaffMember } from "./types";
import "./booking.css";

interface BookingStaffSelectionProps {
  staff: StaffMember[];
  selectedStaff: number | null;
  fixImageUrl: (url: string | null) => string;
  onSetSelectedStaff: (id: number) => void;
}

const BookingStaffSelection: React.FC<BookingStaffSelectionProps> = ({
  staff,
  selectedStaff,
  fixImageUrl,
  onSetSelectedStaff,
}) => {
  const { t } = useTranslation();

  return (
    <div className="booking-staff-selection">
      <h3 className="staff-section-title">
        {t("booking.selectStaff", "Selecciona un profesional")}
      </h3>
      <div className="staff-grid">
        {staff.map((member) => (
          <div
            key={member.id}
            className={`booking-service-card ${selectedStaff === member.id ? "selected" : ""}`}
            onClick={() => {
              onSetSelectedStaff(member.id);
            }}
          >
            <div className="staff-card-photo">
              {member.photo_url ? (
                <img
                  src={fixImageUrl(member.photo_url)}
                  alt={member.name}
                  className="staff-photo"
                />
              ) : (
                <div className="staff-photo-placeholder">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="staff-card-info">
              <h4 className="staff-name">{member.name}</h4>
              {member.specialties && member.specialties.length > 0 && (
                <div className="staff-specialties">
                  {member.specialties.join(", ")}
                </div>
              )}
              {member.bio && <p className="staff-bio">{member.bio}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingStaffSelection;
