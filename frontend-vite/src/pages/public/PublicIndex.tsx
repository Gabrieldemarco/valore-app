import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useGeo } from '../../hooks/useGeo';
import '../../styles/index.css';

interface Salon {
  id: number;
  business_name: string;
  slug?: string;
  business_address?: string;
  landing_description?: string;
  brand_logo_url?: string;
  landing_hero_image?: string;
  services?: Array<{ name?: string } | string>;
  lat?: number;
  lng?: number;
  distance?: number;
  category?: string;
}

interface TenantsResponse {
  tenants?: Salon[];
}

const CACHE_BUST = Date.now();
function fixImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return url + '?v=' + CACHE_BUST;
  return url;
}

function getInitials(name: string): string {
  if (!name) return 'AP';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getGenderCategory(salon: Salon): 'hombre' | 'mujer' | 'unisex' {
  const name = (salon.business_name || '').toLowerCase();
  const desc = (salon.landing_description || '').toLowerCase();
  const services = (salon.services || []).map(s => typeof s === 'object' ? (s as { name?: string })?.name || '' : s).join(' ').toLowerCase();
  const allText = `${name} ${desc} ${services}`;
  const menKeywords = ['barber', 'barbería', 'barbero', 'afeitado', 'barba', 'caballero', 'hombre', 'men', 'beard', 'masculino', 'corte de hombre', 'corte masculino'];
  const womenKeywords = ['alisado', 'dama', 'mujer', 'peinado', 'color', 'tintura', 'uñas', 'nails', 'maquillaje', 'makeup', 'balayage', 'mechas', 'femenino', 'corte de dama', 'corte femenino'];
  const hasMen = menKeywords.some(kw => allText.includes(kw));
  const hasWomen = womenKeywords.some(kw => allText.includes(kw));
  if (hasMen && hasWomen) return 'unisex';
  if (hasMen) return 'hombre';
  if (hasWomen) return 'mujer';
  return 'unisex';
}

interface ServiceCategory {
  key: string;
  label: string;
  image: string;
  keywords: string[];
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    key: 'cejas', label: 'Cejas & Pestañas', image: '/uploads/category-cejas.png',
    keywords: ['ceja', 'pestaña', 'henna', 'lifting', 'laminado', 'diseño de ceja']
  },
  {
    key: 'uñas', label: 'Manicura & Pedicura', image: '/uploads/category-unas.png',
    keywords: ['manicura', 'pedicura', 'uña', 'nail', 'esmaltado', 'semipermanente', 'kapping', 'esculpida', 'acrílica', 'gel']
  },
  {
    key: 'maquillaje', label: 'Maquillaje', image: '/uploads/category-maquillaje.jpeg',
    keywords: ['maquillaje', 'makeup', 'social', 'novia']
  },
  {
    key: 'facial', label: 'Cuidado Facial', image: '/uploads/category-facial.png',
    keywords: ['facial', 'limpieza facial', 'hidratación', 'skin care', 'dermaplaning']
  },
  {
    key: 'depilacion', label: 'Depilación', image: '/uploads/category-depilacion.png',
    keywords: ['depilación', 'depilacion', 'cera', 'laser']
  },
  {
    key: 'masajes', label: 'Masajes & Bienestar', image: '/uploads/category-masajes.png',
    keywords: ['masaje', 'masajes', 'bienestar', 'relajación', 'relajante']
  },
];

export default function PublicIndex() {
  const { t, i18n } = useTranslation();
  const geo = useGeo(i18n.language);
  const countryName = geo.country;
  const [allSalons, setAllSalons] = useState<Salon[]>([]);
  const [filtered, setFiltered] = useState<Salon[]>([]);
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>('all');
  const [currentServiceFilter, setCurrentServiceFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [allServices, setAllServices] = useState<string[]>([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const featuredGridRef = useRef<HTMLDivElement>(null);
  const trendingGridRef = useRef<HTMLDivElement>(null);
  const newGridRef = useRef<HTMLDivElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const locationPopupRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api.get<TenantsResponse>('/api/tenants')
      .then(data => {
        const salons = data.tenants || [];
        setAllSalons(salons);
        setFiltered(salons);
      })
      .catch(() => setError(t('publicIndex.error')))
      .finally(() => setLoading(false));

    api.get<{ count: number }>('/api/appointments/today-count')
      .then(data => setAppointmentsCount(data.count || 0))
      .catch(() => setAppointmentsCount(0));

    api.get<{ services: string[] }>('/api/services/all')
      .then(data => setAllServices(data.services || []))
      .catch(() => setAllServices([]));
  }, []);

  const filterSalons = useCallback(() => {
    let result = allSalons;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchingCategories = SERVICE_CATEGORIES.filter(cat =>
        cat.keywords.some(kw => q.includes(kw) || kw.includes(q))
      );
      result = result.filter(s =>
        s.business_name?.toLowerCase().includes(q) ||
        s.business_address?.toLowerCase().includes(q) ||
        s.slug?.toLowerCase().includes(q) ||
        (s.services || []).some(sv => {
          const name = typeof sv === 'object' ? (sv as { name?: string })?.name || '' : sv;
          return name.toLowerCase().includes(q);
        }) ||
        matchingCategories.some(cat => {
          const text = [
            s.business_name,
            s.business_address,
            s.landing_description,
            ...(s.services || []).map(sv => typeof sv === 'object' ? (sv as { name?: string })?.name || '' : sv)
          ].filter(Boolean).join(' ').toLowerCase();
          return cat.keywords.some(kw => text.includes(kw));
        })
      );
    }
    if (searchLocation.trim()) {
      const loc = searchLocation.toLowerCase().trim();
      result = result.filter(s =>
        s.business_address?.toLowerCase().includes(loc)
      );
    }
    if (currentGenderFilter !== 'all') {
      result = result.filter(s => getGenderCategory(s) === currentGenderFilter);
    }
    if (currentServiceFilter) {
      const cat = SERVICE_CATEGORIES.find(c => c.key === currentServiceFilter);
      if (cat) {
        result = result.filter(s => {
          if (s.category) return s.category === currentServiceFilter;
          const text = [
            s.business_name,
            s.business_address,
            s.landing_description,
            ...(s.services || []).map(sv => typeof sv === 'object' ? (sv as { name?: string })?.name || '' : sv)
          ].filter(Boolean).join(' ').toLowerCase();
          return cat.keywords.some(kw => text.includes(kw));
        });
      }
    }
    setFiltered(result);
  }, [allSalons, searchQuery, searchLocation, currentGenderFilter, currentServiceFilter]);

  useEffect(() => { filterSalons(); }, [filterSalons]);

  const handleGenderFilter = useCallback((filter: string) => {
    setCurrentGenderFilter(filter);
    setCurrentServiceFilter('');
  }, []);

  const handleServiceFilter = useCallback((key: string) => {
    setCurrentServiceFilter(prev => {
      const next = prev === key ? '' : key;
      return next;
    });
    document.getElementById('salons')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const selectGenderFromHero = useCallback((filter: string) => {
    setCurrentGenderFilter(filter);
    setCurrentServiceFilter('');
    document.getElementById('salons')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToSalon = useCallback((idx: number, ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const cards = ref.current.querySelectorAll<HTMLElement>('.salon-link');
    if (cards[idx]) cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }, []);

  const handleSearch = useCallback(() => {
    filterSalons();
    document.getElementById('salons')?.scrollIntoView({ behavior: 'smooth' });
  }, [filterSalons]);

  const getDotCount = useCallback((ref: React.RefObject<HTMLDivElement | null>, count: number) => {
    if (!ref.current) return Math.min(count, 10);
    const cardWidth = ref.current.querySelector<HTMLElement>('.salon-link')?.offsetWidth || 350;
    const containerWidth = ref.current.offsetWidth || 1200;
    const visible = Math.max(1, Math.floor(containerWidth / cardWidth));
    return Math.max(0, Math.ceil(count / visible));
  }, []);

  // Categorizar salones
  const categorizedSalons = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => (b.id || 0) - (a.id || 0)); // Ordenar por ID descendente (nuevos primero)
    const total = sorted.length;
    
    // Distribuir salones en las tres categorías
    const perCategory = Math.max(2, Math.ceil(total / 3)); // Mínimo 2 por categoría
    
    return {
      featured: sorted.slice(0, perCategory),
      trending: sorted.slice(perCategory, perCategory * 2),
      new: sorted.slice(perCategory * 2, perCategory * 3),
    };
  }, [filtered]);

  return (
    <>
      <div className="blob-container">
        <div className="blur-blob blur-blob--primary"></div>
        <div className="blur-blob blur-blob--amber"></div>
        <div className="blur-blob blur-blob--champagne"></div>
      </div>

      <header className="header">
        <div className="header-content">
          <a href="/" className="logo">
            <span className="logo-monogram">V</span>
            <span className="logo-text">Velsoie</span>
          </a>
          <nav className="nav-links">
            <a href="#salons" style={{ fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 13 }}>{t('publicIndex.navSalones')}</a>
            <Link to="/staff/register" className="btn btn-secondary btn-outline" style={{ padding: '8px 18px', borderRadius: 30, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 11 }}>{t('publicIndex.navSumate')}</Link>
            <Link to="/staff/login" className="btn btn-primary btn-studio-access" style={{ padding: '10px 24px', borderRadius: 30, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 11 }}>{t('publicIndex.navStudioAccess')}</Link>
            <Link to="/client/login" className="btn btn-secondary" style={{ padding: '8px 18px', borderRadius: 30, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}>{t('publicIndex.navClientLogin')}</Link>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-unisex-collage">
          <div className="collage-card card-1" onClick={() => selectGenderFromHero('mujer')}>
            <img src="/uploads/velsoie_hero_model.png" alt="Velsoie female style" loading="lazy" />
            <div className="collage-label">
              <span className="collage-label-title">{t('publicIndex.salonCollection')}</span>
              <span className="collage-label-sub">{t('publicIndex.salonCollectionSub')}</span>
            </div>
          </div>
          <div className="collage-card card-2" onClick={() => selectGenderFromHero('hombre')}>
            <img src="/uploads/velsoie_gentleman_hero.png" alt="Velsoie male style" loading="lazy" />
            <div className="collage-label">
              <span className="collage-label-title">{t('publicIndex.groomingCollection')}</span>
              <span className="collage-label-sub">{t('publicIndex.groomingCollectionSub')}</span>
            </div>
          </div>
        </div>

        <div className="hero-content">
          <h1>{countryName ? t('publicIndex.heroTitle', { country: countryName }) : t('publicIndex.heroTitleNoCountry')}</h1>
          <p>{t('publicIndex.heroSubtitle')}</p>
          <div className="gender-filter-bar">
            {[
              { key: 'all', label: () => t('publicIndex.filterAll') },
              { key: 'hombre', label: () => t('publicIndex.filterCaballeros') },
              { key: 'mujer', label: () => t('publicIndex.filterDamas') },
              { key: 'unisex', label: () => t('publicIndex.filterUnisex') },
            ].map(g => (
              <button key={g.key} className={`filter-btn${currentGenderFilter === g.key ? ' active' : ''}`} onClick={() => handleGenderFilter(g.key)}>
                {g.label()}
              </button>
            ))}
          </div>
        </div>

        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" style={{ position: 'absolute', bottom: -50, right: -50, width: '65%', height: 'auto', opacity: 0.18, zIndex: 1, pointerEvents: 'none' }}>
          <path fill="none" stroke="url(#goldGradient)" strokeWidth="1.8" d="M0,128 C150,140 300,80 450,110 C600,140 750,280 900,260 C1050,240 1200,120 1350,150 L1440,160" />
          <path fill="none" stroke="url(#goldGradient)" strokeWidth="1.0" d="M0,180 C180,150 360,110 540,160 C720,210 900,310 1080,250 C1260,190 1380,120 1440,100" opacity="0.6" />
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cfa86b" />
              <stop offset="100%" stopColor="#dfc293" />
            </linearGradient>
          </defs>
        </svg>
      </section>

      <section className="search-section">
        <div className="container">
          <div className="search-box">
            <div className="search-input-wrapper" ref={serviceDropdownRef}>
              <input
                type="text"
                placeholder={t('publicIndex.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setShowServiceDropdown(true)}
                onBlur={() => setTimeout(() => setShowServiceDropdown(false), 200)}
              />
              {showServiceDropdown && allServices.length > 0 && (
                <div className="search-dropdown">
                  {allServices.map(service => (
                    <button
                      key={service}
                      className="search-dropdown-item"
                      onMouseDown={e => {
                        e.preventDefault();
                        setSearchQuery(service);
                        setShowServiceDropdown(false);
                      }}
                    >
                      {service}
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
                onChange={e => setSearchLocation(e.target.value)}
                onFocus={() => setShowLocationPopup(true)}
                onBlur={() => setTimeout(() => setShowLocationPopup(false), 200)}
              />
              {showLocationPopup && (
                <div className="location-popup">
                  <button
                    className="location-option"
                    onMouseDown={async () => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          async (position) => {
                            const { latitude, longitude } = position.coords;
                            try {
                              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${i18n.language}`);
                              const data = await res.json();
                              const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
                              const country = data.address?.country || '';
                              setSearchLocation(city && country ? `${city}, ${country}` : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                            } catch {
                              setSearchLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                            }
                            setShowLocationPopup(false);
                          },
                          () => {
                            alert('No se pudo obtener la ubicación');
                          }
                        );
                      } else {
                        alert('Geolocalización no soportada');
                      }
                    }}
                  >
                    <span className="location-icon">📍</span> Usar mi ubicación actual
                  </button>
                </div>
              )}
            </div>
            <div className="search-input-wrapper" ref={datePickerRef}>
              <input
                type="text"
                placeholder={t('publicIndex.searchDatePlaceholder')}
                value={searchDate ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(searchDate + 'T12:00:00')) : ''}
                onChange={e => setSearchDate(e.target.value)}
                onFocus={() => setShowDatePicker(true)}
                onBlur={() => setTimeout(() => setShowDatePicker(false), 200)}
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
                                setSearchDate(dateStr);
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
            <button className="btn btn-primary" onClick={handleSearch} aria-label={t('publicIndex.searchButton')}>{t('publicIndex.searchButton')}</button>
          </div>
        </div>
      </section>

      <section className="service-cards-section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 8 }}>Tratamientos</h2>
          <p className="section-subtitle" style={{ textAlign: 'center', marginBottom: 32 }}>Explorá por tipo de servicio</p>
          <div className="service-cards-grid">
            {SERVICE_CATEGORIES.map(cat => (
              <div key={cat.key} className={`service-card${currentServiceFilter === cat.key ? ' active' : ''}`} onClick={() => handleServiceFilter(cat.key)}>
                <img src={cat.image} alt={cat.label} className="service-card-image" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="container salons-section" id="salons">
        {/* Salones Destacados */}
        {!loading && !error && categorizedSalons.featured.length > 0 && (
          <>
            <div className="section-header">
              <h2 className="section-title">{t('publicIndex.featuredTitle')}</h2>
              <p className="section-subtitle">{t('publicIndex.featuredSubtitle')}</p>
            </div>
            <div className="salons-grid" ref={featuredGridRef}>
              {categorizedSalons.featured.map(salon => {
                const imageUrl = salon.brand_logo_url || salon.landing_hero_image;
                const services = salon.services || [t('publicIndex.defaultService1'), t('publicIndex.defaultService2'), t('publicIndex.defaultService3')];
                const gender = getGenderCategory(salon);
                return (
                  <Link to={`/p/${salon.slug}`} key={salon.id} className="salon-link">
                    <div className="salon-card glass-panel">
                      <div className="salon-image-wrapper">
                        {imageUrl
                          ? <img src={fixImageUrl(imageUrl)} alt={salon.business_name} loading="lazy" width="400" height="300" />
                          : <div className="salon-image-fallback"><span className="salon-initials">{getInitials(salon.business_name)}</span></div>
                        }
                        <span className="salon-badge">
                          {gender === 'hombre' ? t('publicIndex.badgeCaballeros') : gender === 'mujer' ? t('publicIndex.badgeDamas') : t('publicIndex.badgeUnisex')}
                        </span>
                      </div>
                      <div className="salon-content">
                        <h3 className="salon-name text-gradient">{salon.business_name}</h3>
                        <div className="salon-location">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, stroke: 'var(--primary)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {salon.business_address || t('publicIndex.locationUnknown')}
                          {salon.distance != null && (
                            <span className="distance-badge">{salon.distance < 1 ? '< 1 km' : `${Math.round(salon.distance)} km`}</span>
                          )}
                        </div>
                        <div className="salon-services">
                          {services.slice(0, 3).map((s, i) => (
                            <span key={i} className="service-tag">{typeof s === 'object' ? (s as { name?: string }).name : s}</span>
                          ))}
                        </div>
                        <div className="salon-footer">
                          <div className="salon-rating">
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13, fill: 'var(--primary)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }}>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            {t('publicIndex.ratingValue')} <small>({t('publicIndex.ratingLabel')})</small>
                          </div>
                          <span className="btn btn-primary">{t('publicIndex.reserveButton')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="slider-pagination-dots">
              {Array.from({ length: getDotCount(featuredGridRef, categorizedSalons.featured.length) }).map((_, idx) => (
                <span key={idx} className="slider-dot" onClick={() => scrollToSalon(idx, featuredGridRef)}></span>
              ))}
            </div>
          </>
        )}

        {/* Tendencias */}
        {!loading && !error && categorizedSalons.trending.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 60 }}>
              <h2 className="section-title">{t('publicIndex.trendingTitle')}</h2>
              <p className="section-subtitle">{t('publicIndex.trendingSubtitle')}</p>
            </div>
            <div className="salons-grid" ref={trendingGridRef}>
              {categorizedSalons.trending.map(salon => {
                const imageUrl = salon.brand_logo_url || salon.landing_hero_image;
                const services = salon.services || [t('publicIndex.defaultService1'), t('publicIndex.defaultService2'), t('publicIndex.defaultService3')];
                const gender = getGenderCategory(salon);
                return (
                  <Link to={`/p/${salon.slug}`} key={salon.id} className="salon-link">
                    <div className="salon-card glass-panel">
                      <div className="salon-image-wrapper">
                        {imageUrl
                          ? <img src={fixImageUrl(imageUrl)} alt={salon.business_name} loading="lazy" width="400" height="300" />
                          : <div className="salon-image-fallback"><span className="salon-initials">{getInitials(salon.business_name)}</span></div>
                        }
                        <span className="salon-badge">
                          {gender === 'hombre' ? t('publicIndex.badgeCaballeros') : gender === 'mujer' ? t('publicIndex.badgeDamas') : t('publicIndex.badgeUnisex')}
                        </span>
                      </div>
                      <div className="salon-content">
                        <h3 className="salon-name text-gradient">{salon.business_name}</h3>
                        <div className="salon-location">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, stroke: 'var(--primary)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {salon.business_address || t('publicIndex.locationUnknown')}
                          {salon.distance != null && (
                            <span className="distance-badge">{salon.distance < 1 ? '< 1 km' : `${Math.round(salon.distance)} km`}</span>
                          )}
                        </div>
                        <div className="salon-services">
                          {services.slice(0, 3).map((s, i) => (
                            <span key={i} className="service-tag">{typeof s === 'object' ? (s as { name?: string }).name : s}</span>
                          ))}
                        </div>
                        <div className="salon-footer">
                          <div className="salon-rating">
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13, fill: 'var(--primary)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }}>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            {t('publicIndex.ratingValue')} <small>({t('publicIndex.ratingLabel')})</small>
                          </div>
                          <span className="btn btn-primary">{t('publicIndex.reserveButton')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="slider-pagination-dots">
              {Array.from({ length: getDotCount(trendingGridRef, categorizedSalons.trending.length) }).map((_, idx) => (
                <span key={idx} className="slider-dot" onClick={() => scrollToSalon(idx, trendingGridRef)}></span>
              ))}
            </div>
          </>
        )}

        {/* Nuevos Salones */}
        {!loading && !error && categorizedSalons.new.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 60 }}>
              <h2 className="section-title">{t('publicIndex.newSalonsTitle')}</h2>
              <p className="section-subtitle">{t('publicIndex.newSalonsSubtitle')}</p>
            </div>
            <div className="salons-grid" ref={newGridRef}>
              {categorizedSalons.new.map(salon => {
                const imageUrl = salon.brand_logo_url || salon.landing_hero_image;
                const services = salon.services || [t('publicIndex.defaultService1'), t('publicIndex.defaultService2'), t('publicIndex.defaultService3')];
                const gender = getGenderCategory(salon);
                return (
                  <Link to={`/p/${salon.slug}`} key={salon.id} className="salon-link">
                    <div className="salon-card glass-panel">
                      <div className="salon-image-wrapper">
                        {imageUrl
                          ? <img src={fixImageUrl(imageUrl)} alt={salon.business_name} loading="lazy" width="400" height="300" />
                          : <div className="salon-image-fallback"><span className="salon-initials">{getInitials(salon.business_name)}</span></div>
                        }
                        <span className="salon-badge">
                          {gender === 'hombre' ? t('publicIndex.badgeCaballeros') : gender === 'mujer' ? t('publicIndex.badgeDamas') : t('publicIndex.badgeUnisex')}
                        </span>
                      </div>
                      <div className="salon-content">
                        <h3 className="salon-name text-gradient">{salon.business_name}</h3>
                        <div className="salon-location">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, stroke: 'var(--primary)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {salon.business_address || t('publicIndex.locationUnknown')}
                          {salon.distance != null && (
                            <span className="distance-badge">{salon.distance < 1 ? '< 1 km' : `${Math.round(salon.distance)} km`}</span>
                          )}
                        </div>
                        <div className="salon-services">
                          {services.slice(0, 3).map((s, i) => (
                            <span key={i} className="service-tag">{typeof s === 'object' ? (s as { name?: string }).name : s}</span>
                          ))}
                        </div>
                        <div className="salon-footer">
                          <div className="salon-rating">
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13, fill: 'var(--primary)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }}>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            {t('publicIndex.ratingValue')} <small>({t('publicIndex.ratingLabel')})</small>
                          </div>
                          <span className="btn btn-primary">{t('publicIndex.reserveButton')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="slider-pagination-dots">
              {Array.from({ length: getDotCount(newGridRef, categorizedSalons.new.length) }).map((_, idx) => (
                <span key={idx} className="slider-dot" onClick={() => scrollToSalon(idx, newGridRef)}></span>
              ))}
            </div>
          </>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            {t('publicIndex.loadingSalons')}
          </div>
        )}
        {error && (
          <div className="empty-state glass-panel">
            <h3 className="text-gradient">{t('publicIndex.noConnection')}</h3>
            <p>{error}</p>
            <Link to="/staff/register" className="btn btn-accent">{t('publicIndex.registerSalon')}</Link>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state glass-panel" style={{ width: '100%' }}>
            <h3 className="text-gradient">
              {currentServiceFilter
                ? `No se encontraron establecimientos de ${SERVICE_CATEGORIES.find(c => c.key === currentServiceFilter)?.label || currentServiceFilter}`
                : searchQuery.trim()
                  ? `No se encontraron resultados para "${searchQuery}"`
                  : t('publicIndex.noSalonsFound')}
            </h3>
            <p>{t('publicIndex.noSalonsFoundHint')}</p>
          </div>
        )}
      </main>

      <section className="container features-section">
        <div className="section-header">
          <h2 className="section-title">{t('publicIndex.howItWorksTitle')}</h2>
          <p className="section-subtitle">{t('publicIndex.howItWorksSubtitle')}</p>
        </div>
        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h3>{t('publicIndex.step1Title')}</h3>
            <p>{t('publicIndex.step1Desc')}</p>
          </div>
          <div className="feature-card glass-panel">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
                <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
                <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
              </svg>
            </div>
            <h3>{t('publicIndex.step2Title')}</h3>
            <p>{t('publicIndex.step2Desc')}</p>
          </div>
          <div className="feature-card glass-panel">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <polyline points="8 14 11 17 16 12"></polyline>
              </svg>
            </div>
            <h3>{t('publicIndex.step3Title')}</h3>
            <p>{t('publicIndex.step3Desc')}</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>{t('publicIndex.footerCopyright')}</p>
        <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 20, lineHeight: 1.6 }}>
          {t('publicIndex.footerCTA')}
        </p>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--primary)' }}>
          {t('publicIndex.appointmentsCounter', { count: appointmentsCount })}
        </div>
        <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 16, opacity: 0.8, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Link to="/terms#terms" style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>{t('publicIndex.termsLink')}</Link>
          <span style={{ color: 'rgba(197, 168, 128, 0.2)' }}>|</span>
          <Link to="/terms#privacy" style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>{t('publicIndex.privacyLink')}</Link>
          <span style={{ color: 'rgba(197, 168, 128, 0.2)' }}>|</span>
          <Link to="/terms#cancellations" style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>{t('publicIndex.cancellationPolicyLink')}</Link>
        </div>
      </footer>
    </>
  );
}
