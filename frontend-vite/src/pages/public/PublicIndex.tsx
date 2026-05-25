import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import '../../styles/global-premium.css';
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
}

interface TenantsResponse {
  tenants?: Salon[];
}

function fixImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return url;
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

export default function PublicIndex() {
  const [allSalons, setAllSalons] = useState<Salon[]>([]);
  const [filtered, setFiltered] = useState<Salon[]>([]);
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    api.get<TenantsResponse>('/api/tenants')
      .then(data => {
        const salons = data.tenants || [];
        setAllSalons(salons);
        setFiltered(salons);
      })
      .catch(() => setError('No pudimos cargar las peluquerías.'))
      .finally(() => setLoading(false));
  }, []);

  const filterSalons = useCallback(() => {
    let result = allSalons;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        s.business_name?.toLowerCase().includes(q) ||
        s.business_address?.toLowerCase().includes(q) ||
        s.slug?.toLowerCase().includes(q)
      );
    }
    if (currentGenderFilter !== 'all') {
      result = result.filter(s => getGenderCategory(s) === currentGenderFilter);
    }
    setFiltered(result);
  }, [allSalons, searchQuery, currentGenderFilter]);

  useEffect(() => { filterSalons(); }, [filterSalons]);

  const handleGenderFilter = (filter: string) => {
    setCurrentGenderFilter(filter);
  };

  const selectGenderFromHero = (filter: string) => {
    setCurrentGenderFilter(filter);
    document.getElementById('salons')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSalon = (idx: number) => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>('.salon-link');
    if (cards[idx]) cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  const getDotCount = () => {
    if (!gridRef.current) return filtered.length;
    const cardWidth = gridRef.current.querySelector<HTMLElement>('.salon-link')?.offsetWidth || 350;
    const containerWidth = gridRef.current.offsetWidth;
    const visible = Math.max(1, Math.floor(containerWidth / cardWidth));
    return Math.max(0, Math.ceil(filtered.length / visible));
  };

  return (
    <>
      <div className="blob-container">
        <div className="blur-blob"></div>
      </div>

      <header className="header">
        <div className="header-content">
          <a href="/" className="logo">
            <span className="logo-monogram">V</span>
            <span className="logo-text">Veloré</span>
          </a>
          <nav className="nav-links">
            <a href="#salons" style={{ fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 13 }}>Salones</a>
            <Link to="/staff/register" className="btn btn-secondary btn-outline" style={{ padding: '8px 18px', borderRadius: 30, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 11 }}>Sumate a Veloré</Link>
            <Link to="/staff/login" className="btn btn-primary btn-studio-access" style={{ padding: '10px 24px', borderRadius: 30, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 11 }}>Studio Access</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-unisex-collage">
          <div className="collage-card card-1" onClick={() => selectGenderFromHero('mujer')}>
            <img src="/uploads/velore_hero_model.png" alt="Veloré female style" loading="lazy" />
            <div className="collage-label">
              <span className="collage-label-title">Salon Collection</span>
              <span className="collage-label-sub">Color, estilo y estética premium</span>
            </div>
          </div>
          <div className="collage-card card-2" onClick={() => selectGenderFromHero('hombre')}>
            <img src="/uploads/velore_gentleman_hero.png" alt="Veloré male style" loading="lazy" />
            <div className="collage-label">
              <span className="collage-label-title">Grooming Collection</span>
              <span className="collage-label-sub">Barberías y experiencias de autor</span>
            </div>
          </div>
        </div>

        <div className="hero-content">
          <h1>Reservá en los mejores <span className="text-gradient" style={{ fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>salones</span> de Uruguay</h1>
          <p>Encontrá tu próximo turno en segundos.</p>
          <div className="search-box">
            <input type="text" placeholder="Buscar por nombre o ubicación..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <button className="btn btn-primary" onClick={filterSalons}>Buscar ❯</button>
          </div>
          <div className="gender-filter-bar">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'hombre', label: 'Caballeros' },
              { key: 'mujer', label: 'Damas' },
              { key: 'unisex', label: 'Unisex' },
            ].map(g => (
              <button key={g.key} className={`filter-btn${currentGenderFilter === g.key ? ' active' : ''}`} onClick={() => handleGenderFilter(g.key)}>
                {g.label}
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

      <main className="container salons-section" id="salons">
        <div className="section-header">
          <h2 className="section-title">Salones Destacados en Estética Capilar</h2>
          <p className="section-subtitle">Explorá las firmas boutique de mayor prestigio en el país.</p>
        </div>

        <div className="salons-slider-container">
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              Cargando peluquerías...
            </div>
          )}
          {error && (
            <div className="empty-state glass-panel">
              <h3 className="text-gradient">⚠️ Sin conexión</h3>
              <p>{error}</p>
              <Link to="/staff/register" className="btn btn-accent">Registrar mi peluquería</Link>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="empty-state glass-panel" style={{ width: '100%' }}>
              <h3 className="text-gradient">🔍 No se encontraron peluquerías</h3>
              <p>Probá ajustando tus filtros de búsqueda.</p>
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="salons-grid" ref={gridRef}>
              {filtered.map(salon => {
                const imageUrl = salon.brand_logo_url || salon.landing_hero_image;
                const services = salon.services || ['Corte', 'Color', 'Alisado'];
                const gender = getGenderCategory(salon);
                return (
                  <Link to={`/landing?tenant=${salon.slug}`} key={salon.id} className="salon-link">
                    <div className="salon-card glass-panel">
                      <div className="salon-image-wrapper">
                        {imageUrl
                          ? <img src={fixImageUrl(imageUrl)} alt={salon.business_name} />
                          : <div className="salon-image-fallback"><span className="salon-initials">{getInitials(salon.business_name)}</span></div>
                        }
                        <span className="salon-badge">
                          {gender === 'hombre' ? 'Caballeros' : gender === 'mujer' ? 'Damas' : 'Unisex'}
                        </span>
                      </div>
                      <div className="salon-content">
                        <h3 className="salon-name text-gradient">{salon.business_name}</h3>
                        <div className="salon-location">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, stroke: 'var(--primary)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {salon.business_address || 'Ubicación no especificada'}
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
                            5.0 <small>(Excelente)</small>
                          </div>
                          <span className="btn btn-primary">Reservar →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {!loading && !error && filtered.length > 0 && (
          <div className="slider-pagination-dots" id="sliderDots">
            {Array.from({ length: getDotCount() }).map((_, idx) => (
              <span key={idx} className="slider-dot" onClick={() => scrollToSalon(idx)}></span>
            ))}
          </div>
        )}
      </main>

      <section className="container features-section">
        <div className="section-header">
          <h2 className="section-title">¿Cómo funciona?</h2>
          <p className="section-subtitle">Reservá tu turno de forma rápida, simple y totalmente digital</p>
        </div>
        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h3>1. Buscá tu Peluquería</h3>
            <p>Explorá los salones mejor calificados, compará sus servicios y elegí tu preferido en nuestra web.</p>
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
            <h3>2. Elegí el Servicio</h3>
            <p>Seleccioná el corte, tratamiento o peinado que desees, junto con tu estilista y horario favorito.</p>
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
            <h3>3. Confirmá en Segundos</h3>
            <p>Tu turno queda agendado de inmediato y recibirás una notificación de confirmación instantánea.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2026 Veloré. Todos los derechos reservados.</p>
        <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 20, lineHeight: 1.6 }}>
          Empezá a recibir reservas online hoy mismo. <br />
          <Link to="/staff/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: 12, display: 'inline-block', marginTop: 8, borderBottom: '1px solid rgba(197, 168, 128, 0.4)', paddingBottom: 2 }}>Acceso completo durante 15 días.</Link>
        </p>
        <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 16, opacity: 0.8, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Link to="/terms" style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>Términos y Condiciones</Link>
          <span style={{ color: 'rgba(197, 168, 128, 0.2)' }}>|</span>
          <Link to="/terms" style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>Política de Privacidad</Link>
          <span style={{ color: 'rgba(197, 168, 128, 0.2)' }}>|</span>
          <Link to="/terms" style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>Política de Cancelaciones</Link>
        </div>
      </footer>
    </>
  );
}
