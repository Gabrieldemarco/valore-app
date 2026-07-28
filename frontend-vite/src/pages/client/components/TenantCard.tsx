import { useTranslation } from 'react-i18next';

interface Tenant {
  id: number;
  slug: string;
  business_name: string;
  business_address: string | null;
}

interface Props {
  tenant: Tenant;
  onClick: (slug: string) => void;
}

export default function TenantCard({ tenant, onClick }: Props) {
  const { t } = useTranslation();
  return (
    <div onClick={() => onClick(tenant.slug)} className="card-border"
         onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
         onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)')}>
      <div className="font-600 mb-4 text-border">{tenant.business_name}</div>
      {tenant.business_address && <div className="text-xs-secondary">{tenant.business_address}</div>}
      <div className="text-secondary mt-8 fs-11">{t('clientDashboard.exploreBookButton')}</div>
    </div>
  );
}
