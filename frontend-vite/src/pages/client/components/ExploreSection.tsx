import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';
import TenantCard from './TenantCard';

interface Tenant {
  id: number;
  slug: string;
  business_name: string;
  business_address: string | null;
  category: string | null;
}

interface Props {
  tenants: Tenant[];
  loading: boolean;
  onTenantClick: (slug: string) => void;
}

export default function ExploreSection({ tenants, loading, onTenantClick }: Props) {
  const { t } = useTranslation();
  return (
    <div className="glass-panel card-padded">
      <h3 className="m-0 mb-16">{t('clientDashboard.exploreTitle')}</h3>
      {loading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : tenants.length === 0 ? (
        <EmptyState message={t('clientDashboard.exploreEmpty')} />
      ) : (
        <div className="grid-auto-fill">
          {tenants.map(tenant => (
            <TenantCard key={tenant.id} tenant={tenant} onClick={onTenantClick} />
          ))}
        </div>
      )}
    </div>
  );
}
