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
import TreatmentCategories from './components/TreatmentCategories';
import HowItWorksSection from './components/HowItWorksSection';
import { SERVICE_CATEGORIES_DATA } from './components/ServiceCategoriesData';
import { getGenderCategory, type Salon } from './SalonCard';
import '../../styles/index.css';

interface TenantsResponse {
  tenants?: Salon[];
}

export default function PublicIndex() {
  const { t, i18n } = useTranslation();
  const SERVICE_CATEGORIES = useMemo(() => SERVICE_CATEGORIES_DATA.map(c => ({ ...c, label: t(c.labelKey) })), [t]);
  const geo = useGeo(i18n.language);
  const countryName = geo.country;
  const [allSalons, setAllSalons] = useState<Salon[]>([]);
  const [filtered, setFiltered] = useState<Salon[]>([]);
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
  const featuredGridRef = useRef<HTMLDivElement>(null);
  const trendingGridRef = useRef<HTMLDivElement>(null);
  const newGridRef = useRef<HTMLDivElement>(null);
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
  }, [t]);

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
  }, [allSalons, searchQuery, searchProfessional, searchLocation, currentGenderFilter, currentServiceFilter, SERVICE_CATEGORIES]);

  useEffect(() => { filterSalons(); }, [filterSalons]); // eslint-disable-line react-hooks/set-state-in-effect

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

  const categorizedSalons = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => (b.id || 0) - (a.id || 0));
    const total = sorted.length;
    const perCategory = Math.max(2, Math.ceil(total / 3));
    return {
      featured: sorted.slice(0, perCategory),
      trending: sorted.slice(perCategory, perCategory * 2),
      new: sorted.slice(perCategory * 2, perCategory * 3),
    };
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
        currentGenderFilter={currentGenderFilter}
        onSelectGender={handleGenderFilter}
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
        {!loading && !error && categorizedSalons.featured.length > 0 && (
          <SalonGridSection
            title={t('publicIndex.featuredTitle')}
            subtitle={t('publicIndex.featuredSubtitle')}
            salons={categorizedSalons.featured}
            gridRef={featuredGridRef}
            defaultServices={defaultServices}
            dotCount={getDotCount(featuredGridRef, categorizedSalons.featured.length)} // eslint-disable-line react-hooks/refs
            onDotClick={(idx) => scrollToSalon(idx, featuredGridRef)}
          />
        )}

        {!loading && !error && categorizedSalons.trending.length > 0 && (
          <SalonGridSection
            title={t('publicIndex.trendingTitle')}
            subtitle={t('publicIndex.trendingSubtitle')}
            salons={categorizedSalons.trending}
            gridRef={trendingGridRef}
            defaultServices={defaultServices}
            dotCount={getDotCount(trendingGridRef, categorizedSalons.trending.length)} // eslint-disable-line react-hooks/refs
            onDotClick={(idx) => scrollToSalon(idx, trendingGridRef)}
            headerStyle={{ marginTop: 60 }}
          />
        )}

        {!loading && !error && categorizedSalons.new.length > 0 && (
          <SalonGridSection
            title={t('publicIndex.newSalonsTitle')}
            subtitle={t('publicIndex.newSalonsSubtitle')}
            salons={categorizedSalons.new}
            gridRef={newGridRef}
            defaultServices={defaultServices}
            dotCount={getDotCount(newGridRef, categorizedSalons.new.length)} // eslint-disable-line react-hooks/refs
            onDotClick={(idx) => scrollToSalon(idx, newGridRef)}
            headerStyle={{ marginTop: 60 }}
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

      <PublicFooter appointmentsCount={appointmentsCount} />
    </>
  );
}
