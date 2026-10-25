import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useGeo } from '../../hooks/useGeo';
import PublicHeader from './PublicHeader';
import PublicHero from './PublicHero';
import PublicSearchBar from './PublicSearchBar';
import PublicSalonStates from './PublicSalonStates';
import PublicFooter from './PublicFooter';
import SalonGridSection from './SalonGridSection';
import FeaturedServicesSection from './FeaturedServicesSection';
import TreatmentCategories from './components/TreatmentCategories';
import HowItWorksSection from './components/HowItWorksSection';
import AboutVelsoieSection from './components/AboutVelsoieSection';
import EmptyStateIcon from './components/EmptyStateIcon';
import PricingSection from './components/PricingSection';
import { SERVICE_CATEGORIES_DATA } from './components/ServiceCategoriesData';
import { getGenderCategory, type Salon } from './SalonCard';
import '../../styles/index.css';

interface TenantsResponse {
  tenants?: Salon[];
}

interface FeaturedService {
  id: number;
  name: string;
  price: number;
  duration: number;
  salon_name: string;
  slug: string;
  service_image?: string;
  salon_logo?: string;
}

export default function PublicIndex() {
  const { t, i18n } = useTranslation();
  const SERVICE_CATEGORIES = useMemo(() => SERVICE_CATEGORIES_DATA.map(c => ({ ...c, label: t(c.labelKey) })), [t]);
  const geo = useGeo(i18n.language);
  const countryName = geo.country;
  const [allSalons, setAllSalons] = useState<Salon[]>([]);
  const [filtered, setFiltered] = useState<Salon[]>([]);
  const [newProfessionals, setNewProfessionals] = useState<Salon[]>([]);
  const [featuredServices, setFeaturedServices] = useState<FeaturedService[]>([]);
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>('all');
  const [currentServiceFilter, setCurrentServiceFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchProfessional, setSearchProfessional] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [allProfessionals, setAllProfessionals] = useState<string[]>([]);
  const [allServices, setAllServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const discoverGridRef = useRef<HTMLDivElement>(null);
  const newProfessionalsGridRef = useRef<HTMLDivElement>(null);
  const featuredServicesGridRef = useRef<HTMLDivElement>(null);
  const femCollectionGridRef = useRef<HTMLDivElement>(null);
  const menCollectionGridRef = useRef<HTMLDivElement>(null);
  const allSalonsGridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api.get<TenantsResponse>('/api/tenants')
      .then(data => {
        const salons = data.tenants || [];
        setAllSalons(salons);
        setFiltered(salons);
        const profSet = new Set<string>();
        salons.forEach(s => (s.staff_names || []).forEach(n => profSet.add(n)));
        setAllProfessionals(Array.from(profSet).sort());
      })
      .catch(() => setError(t('publicIndex.error')))
      .finally(() => setLoading(false));

    api.get<{ count: number }>('/api/appointments/today-count')
      .then(data => setAppointmentsCount(data.count || 0))
      .catch(() => setAppointmentsCount(0));

     api.get<{ services: string[] }>('/api/services/all')
      .then(data => setAllServices(data.services || []))
      .catch(() => setAllServices([]));

    api.get<{ tenants: Salon[] }>('/api/tenants/new-professionals')
      .then(data => setNewProfessionals(data.tenants || []))
      .catch(() => setNewProfessionals([]));

    api.get<{ services: FeaturedService[] }>('/api/services/featured')
      .then(data => setFeaturedServices(data.services || []))
      .catch(() => setFeaturedServices([]));
  }, [i18n.language]);

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
    if (searchProfessional.trim()) {
      const pq = searchProfessional.toLowerCase().trim();
      result = result.filter(s =>
        (s.staff_names || []).some(n => n.toLowerCase().includes(pq))
      );
    }
    if (searchLocation.trim()) {
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const tokens = normalize(searchLocation.trim()).split(/\s+/).filter(Boolean);
      result = result.filter(s => {
        const addr = normalize(s.business_address || '');
        return tokens.every(token => addr.includes(token));
      });
    }
    if (currentGenderFilter !== 'all') {
      result = result.filter(s => getGenderCategory(s) === currentGenderFilter);
    }
    if (currentServiceFilter) {
      const cat = SERVICE_CATEGORIES.find(c => c.key === currentServiceFilter);
      if (cat) {
        result = result.filter(s => {
          if (s.category === currentServiceFilter) return true;
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
  }, [allSalons, searchQuery, searchProfessional, searchLocation, currentGenderFilter, currentServiceFilter, SERVICE_CATEGORIES]);

  useEffect(() => { filterSalons(); }, [filterSalons]); // eslint-disable-line react-hooks/set-state-in-effect

  const handleServiceFilter = useCallback((key: string) => {
    setCurrentGenderFilter('all');
    setCurrentServiceFilter(prev => {
      const next = prev === key ? '' : key;
      return next;
    });
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

  const discoverSalons = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => (b.id || 0) - (a.id || 0));
    const total = sorted.length;
    const perCategory = Math.max(2, Math.ceil(total / 3));
    const slices = [
      sorted.slice(0, perCategory),
      sorted.slice(perCategory, perCategory * 2),
      sorted.slice(perCategory * 2, perCategory * 3),
    ];
    const seen = new Set<number>();
    const merged: Salon[] = [];
    for (const group of slices) {
      for (const salon of group) {
        if (!seen.has(salon.id)) {
          seen.add(salon.id);
          merged.push(salon);
        }
      }
    }
    return merged;
  }, [filtered]);

  const collectionSalons = useMemo(() => {
    const fem = filtered.filter(s => getGenderCategory(s) === 'mujer');
    const men = filtered.filter(s => getGenderCategory(s) === 'hombre');
    return { fem, men };
  }, [filtered]);

  const defaultServices = useMemo(() => [
    t('publicIndex.defaultService1'),
    t('publicIndex.defaultService2'),
    t('publicIndex.defaultService3'),
  ], [t]);

  const currentServiceFilterLabel = currentServiceFilter
    ? SERVICE_CATEGORIES.find(c => c.key === currentServiceFilter)?.label || currentServiceFilter
    : '';

  return (
    <>
      <div className="blob-container">
        <div className="blur-blob blur-blob--primary"></div>
        <div className="blur-blob blur-blob--amber"></div>
        <div className="blur-blob blur-blob--champagne"></div>
      </div>

      <PublicHeader />

      <PublicHero
        countryName={countryName}
      />

      <PublicSearchBar
        searchQuery={searchQuery}
        searchProfessional={searchProfessional}
        searchLocation={searchLocation}
        searchDate={searchDate}
        allServices={allServices}
        allProfessionals={allProfessionals}
        onSearchQueryChange={setSearchQuery}
        onSearchProfessionalChange={setSearchProfessional}
        onSearchLocationChange={setSearchLocation}
        onSearchDateChange={setSearchDate}
        onSearch={handleSearch}
      />

      <TreatmentCategories
        categories={SERVICE_CATEGORIES}
        activeCategory={currentServiceFilter}
        onCategoryClick={handleServiceFilter}
      />

      <main className="container salons-section" id="salons">
        {!loading && !error && discoverSalons.length > 0 && (
          <SalonGridSection
            title={t('publicIndex.featuredTitle')}
            subtitle={t('publicIndex.featuredSubtitle')}
            salons={discoverSalons}
            gridRef={discoverGridRef}
            defaultServices={defaultServices}
            dotCount={getDotCount(discoverGridRef, discoverSalons.length)} // eslint-disable-line react-hooks/refs
            onDotClick={(idx) => scrollToSalon(idx, discoverGridRef)}
          />
        )}

        {!loading && !error && newProfessionals.length > 0 && (
          <SalonGridSection
            title={t('publicIndex.newProfessionalsTitle')}
            subtitle={t('publicIndex.newProfessionalsSubtitle')}
            salons={newProfessionals}
            gridRef={newProfessionalsGridRef}
            defaultServices={defaultServices}
            dotCount={getDotCount(newProfessionalsGridRef, newProfessionals.length)} // eslint-disable-line react-hooks/refs
            onDotClick={(idx) => scrollToSalon(idx, newProfessionalsGridRef)}
            showNewBadge
            variant="alt"
          />
        )}
        {!loading && !error && newProfessionals.length === 0 && (
          <section className="section-empty" aria-hidden="true">
            <div className="empty-state-card">
              <EmptyStateIcon variant="salon" />
              <h3>{t('publicIndex.noFeaturedSalons')}</h3>
              <p>{t('publicIndex.noFeaturedSalonsDesc')}</p>
            </div>
          </section>
        )}

        {!loading && !error && featuredServices.length > 0 && (
          <FeaturedServicesSection
            title={t('publicIndex.serviceSaleTitle')}
            subtitle={t('publicIndex.serviceSaleSubtitle')}
            services={featuredServices}
            gridRef={featuredServicesGridRef}
          />
        )}
        {!loading && !error && featuredServices.length === 0 && (
          <section className="section-empty" aria-hidden="true">
            <div className="empty-state-card">
              <EmptyStateIcon variant="service" />
              <h3>{t('publicIndex.noFeaturedServices')}</h3>
              <p>{t('publicIndex.noFeaturedServicesDesc')}</p>
            </div>
          </section>
        )}

        {!loading && !error && collectionSalons.fem.length > 0 && (
          <SalonGridSection
            eyebrow={t('publicIndex.collectionFemSectionTitle')}
            title={t('publicIndex.salonCollection')}
            subtitle={t('publicIndex.salonCollectionSub')}
            salons={collectionSalons.fem}
            gridRef={femCollectionGridRef}
            defaultServices={defaultServices}
            dotCount={getDotCount(femCollectionGridRef, collectionSalons.fem.length)} // eslint-disable-line react-hooks/refs
            onDotClick={(idx) => scrollToSalon(idx, femCollectionGridRef)}
            variant="alt"
          />
        )}

        {!loading && !error && collectionSalons.men.length > 0 && (
          <SalonGridSection
            eyebrow={t('publicIndex.collectionMenSectionTitle')}
            title={t('publicIndex.groomingCollection')}
            subtitle={t('publicIndex.groomingCollectionSub')}
            salons={collectionSalons.men}
            gridRef={menCollectionGridRef}
            defaultServices={defaultServices}
            dotCount={getDotCount(menCollectionGridRef, collectionSalons.men.length)} // eslint-disable-line react-hooks/refs
            onDotClick={(idx) => scrollToSalon(idx, menCollectionGridRef)}
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <SalonGridSection
            title={t('publicIndex.allSalonsTitle')}
            subtitle={t('publicIndex.allSalonsSubtitle')}
            salons={filtered}
            gridRef={allSalonsGridRef}
            defaultServices={defaultServices}
            dotCount={getDotCount(allSalonsGridRef, filtered.length)} // eslint-disable-line react-hooks/refs
            onDotClick={(idx) => scrollToSalon(idx, allSalonsGridRef)}
            variant="alt"
          />
        )}

        <PublicSalonStates
          loading={loading}
          error={error}
          salonCount={filtered.length}
          currentServiceFilter={currentServiceFilter}
          currentServiceFilterLabel={currentServiceFilterLabel}
          searchQuery={searchQuery}
        />
      </main>

      <HowItWorksSection />

      <AboutVelsoieSection />

      <PricingSection />

      <PublicFooter appointmentsCount={appointmentsCount} />
    </>
  );
}
