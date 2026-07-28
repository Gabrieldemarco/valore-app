import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PublicSearchBarProps {
  searchQuery: string;
  searchProfessional: string;
  searchLocation: string;
  searchDate: string;
  allServices: string[];
  allProfessionals: string[];
  onSearchQueryChange: (v: string) => void;
  onSearchProfessionalChange: (v: string) => void;
  onSearchLocationChange: (v: string) => void;
  onSearchDateChange: (v: string) => void;
  onSearch: () => void;
}

export default function PublicSearchBar({
  searchQuery,
  searchProfessional,
  searchLocation,
  searchDate,
  allServices,
  allProfessionals,
  onSearchQueryChange,
  onSearchProfessionalChange,
  onSearchLocationChange,
  onSearchDateChange,
  onSearch,
}: PublicSearchBarProps) {
  const { t, i18n } = useTranslation();
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showProfessionalDropdown, setShowProfessionalDropdown] = useState(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const professionalDropdownRef = useRef<HTMLDivElement>(null);
  const locationPopupRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node)) {
        setShowServiceDropdown(false);
      }
      if (professionalDropdownRef.current && !professionalDropdownRef.current.contains(e.target as Node)) {
        setShowProfessionalDropdown(false);
      }
      if (locationPopupRef.current && !locationPopupRef.current.contains(e.target as Node)) {
        setShowLocationPopup(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <section className="search-section">
      <div className="container">
        <div className="search-box">
          <div className="search-input-wrapper" ref={serviceDropdownRef}>
            <input
              type="text"
              placeholder={t('publicIndex.searchPlaceholder')}
              value={searchQuery}
              onChange={e => onSearchQueryChange(e.target.value)}
              onFocus={() => setShowServiceDropdown(true)}
            />
            {showServiceDropdown && allServices.length > 0 && (
              <div className="search-dropdown">
                {allServices.map(service => (
                  <button
                    key={service}
                    className="search-dropdown-item"
                    onMouseDown={e => {
                      e.preventDefault();
                      onSearchQueryChange(service);
                      setShowServiceDropdown(false);
                    }}
                  >
                    {service}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="search-input-wrapper" ref={professionalDropdownRef}>
            <input
              type="text"
              placeholder={t('publicIndex.searchProfessionalPlaceholder', 'Profesional')}
              value={searchProfessional}
              onChange={e => onSearchProfessionalChange(e.target.value)}
              onFocus={() => setShowProfessionalDropdown(true)}
            />
            {showProfessionalDropdown && allProfessionals.length > 0 && (
              <div className="search-dropdown">
                {allProfessionals.map(prof => (
                  <button
                    key={prof}
                    className="search-dropdown-item"
                    onMouseDown={e => {
                      e.preventDefault();
                      onSearchProfessionalChange(prof);
                      setShowProfessionalDropdown(false);
                    }}
                  >
                    {prof}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="search-input-wrapper" ref={locationPopupRef}>
            <input
              type="text"
              placeholder={t('publicIndex.searchLocationPlaceholder')}
              value={searchLocation}
              onChange={e => onSearchLocationChange(e.target.value)}
              onFocus={() => setShowLocationPopup(true)}
            />
            {showLocationPopup && (
              <div className="location-popup">
                <button
                  className="location-option"
                  onMouseDown={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const { latitude, longitude } = position.coords;
                          try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${i18n.language}`);
                            const data = await res.json();
                            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
                            const country = data.address?.country || '';
                            onSearchLocationChange(city && country ? `${city}, ${country}` : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                          } catch {
                            onSearchLocationChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                          }
                          setShowLocationPopup(false);
                        },
                        () => { alert(t('publicIndex.locationError', 'No se pudo obtener la ubicación')); }
                      );
                    } else {
                      alert(t('publicIndex.locationNotSupported', 'Geolocalización no soportada'));
                    }
                  }}
                >
                  <span className="location-icon">📍</span> {t('publicIndex.useMyLocation', 'Usar mi ubicación actual')}
                </button>
              </div>
            )}
          </div>
          <div className="search-input-wrapper" ref={datePickerRef}>
            <input
              type="text"
              placeholder={t('publicIndex.searchDatePlaceholder')}
              value={searchDate ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(searchDate + 'T12:00:00')) : ''}
              onChange={e => onSearchDateChange(e.target.value)}
              onFocus={() => setShowDatePicker(true)}
              readOnly
            />
            {showDatePicker && (
              <div className="date-picker-popup">
                <div className="custom-calendar">
                  <div className="calendar-header">
                    <button
                      className="calendar-nav"
                      onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                    >
                      ‹
                    </button>
                    <span className="calendar-month-year">
                      {new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(calendarViewDate)}
                    </span>
                    <button
                      className="calendar-nav"
                      onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                    >
                      ›
                    </button>
                  </div>
                  <div className="calendar-weekdays">
                    {Array.from({ length: 7 }, (_, i) => (
                      <span key={i} className="calendar-weekday">
                        {new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(new Date(2024, 0, i + 1))}
                      </span>
                    ))}
                  </div>
                  <div className="calendar-days">
                    {(() => {
                      const year = calendarViewDate.getFullYear();
                      const month = calendarViewDate.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const days = [];
                      for (let i = 0; i < firstDay; i++) {
                        days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
                      }
                      for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const isSelected = searchDate === dateStr;
                        const isToday = dateStr === todayStr;
                        days.push(
                          <div
                            key={d}
                            className={`calendar-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                            onClick={() => {
                              onSearchDateChange(dateStr);
                              setShowDatePicker(false);
                            }}
                          >
                            {d}
                          </div>
                        );
                      }
                      return days;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={onSearch} aria-label={t('publicIndex.searchButton')}>
            {t('publicIndex.searchButton')}
          </button>
        </div>
      </div>
    </section>
  );
}
