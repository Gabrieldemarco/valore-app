import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PublicSalonStatesProps {
  loading: boolean;
  error: string;
  salonCount: number;
  currentServiceFilter: string;
  currentServiceFilterLabel: string;
  searchQuery: string;
}

export default function PublicSalonStates({
  loading,
  error,
  salonCount,
  currentServiceFilter,
  currentServiceFilterLabel,
  searchQuery,
}: PublicSalonStatesProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        {t('publicIndex.loadingSalons')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state glass-panel">
        <h3 className="text-gradient">{t('publicIndex.noConnection')}</h3>
        <p>{error}</p>
        <Link to="/staff/register" className="btn btn-accent">{t('publicIndex.registerSalon')}</Link>
      </div>
    );
  }

  if (salonCount === 0) {
    return (
      <div className="empty-state glass-panel w-full">
        <h3 className="text-gradient">
          {currentServiceFilter
            ? t('publicIndex.noEstablishmentsForCategory', { category: currentServiceFilterLabel })
            : searchQuery.trim()
              ? t('publicIndex.noResultsForQuery', { query: searchQuery })
              : t('publicIndex.noSalonsFound')}
        </h3>
        <p>{t('publicIndex.noSalonsFoundHint')}</p>
      </div>
    );
  }

  return null;
}
