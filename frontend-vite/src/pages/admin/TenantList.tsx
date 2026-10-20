import { useTranslation } from 'react-i18next';
import type { Tenant } from './types';

interface Props {
  filtered: Tenant[];
  onOpenModal: (id: number) => void;
  onSetTrial: (id: number) => void;
}

export default function TenantList({ filtered, onOpenModal, onSetTrial }: Props) {
  const { t } = useTranslation();
  const now = new Date();

  const getTrialBadge = (tenant: Tenant) => {
    const trialEnd = tenant.trial_end_date ? new Date(tenant.trial_end_date) : null;
    const isExpired = tenant.plan === 'free' && trialEnd && !isNaN(trialEnd.getTime()) && trialEnd < now;
    const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000) : null;

    if (trialEnd && !isNaN(trialEnd.getTime())) {
      if (isExpired) return <span className="badge badge-expired">{t('adminDashboard.badgeExpired')}</span>;
      if (daysLeft !== null && daysLeft <= 3) return <span className="badge badge-suspended">{t('adminDashboard.badgeDays', { days: daysLeft })}</span>;
      return <span className="badge badge-active">{t('adminDashboard.badgeDays', { days: daysLeft })}</span>;
    }
    if (tenant.plan === 'pro' || tenant.plan === 'enterprise') return <span className="badge badge-pro">{t('adminDashboard.badgeNoLimit')}</span>;
    return <span className="badge badge-free">-</span>;
  };

  const getPlanBadge = (tenant: Tenant) =>
    tenant.plan === 'pro' || tenant.plan === 'enterprise'
      ? <span className="badge badge-pro">{tenant.plan}</span>
      : <span className="badge badge-free">{t('adminDashboard.badgeFree')}</span>;

  const getStatusBadge = (tenant: Tenant) => {
    const trialEnd = tenant.trial_end_date ? new Date(tenant.trial_end_date) : null;
    const isExpired = tenant.plan === 'free' && trialEnd && !isNaN(trialEnd.getTime()) && trialEnd < now;
    if (tenant.status === 'suspended') return <span className="badge badge-suspended">{t('adminDashboard.badgeSuspended')}</span>;
    if (isExpired) return <span className="badge badge-expired">{t('adminDashboard.badgeTrialExpired')}</span>;
    return <span className="badge badge-active">{t('adminDashboard.badgeActive')}</span>;
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t('adminDashboard.tenantsTitle')}</h2>
        <span className="panel-count">{t('adminDashboard.tenantCount', { count: filtered.length })}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>{t('adminDashboard.tableBusiness')}</th>
            <th>{t('adminDashboard.tableSlug')}</th>
            <th>{t('adminDashboard.tablePlan')}</th>
            <th>{t('adminDashboard.tableStatus')}</th>
            <th>{t('adminDashboard.tableTrial')}</th>
            <th>{t('adminDashboard.tableActions')}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(tenant => (
            <tr key={tenant.id}>
              <td><strong className="tenant-name">{tenant.business_name || '-'}</strong></td>
              <td><span className="slug">{tenant.slug}</span></td>
              <td>{getPlanBadge(tenant)}</td>
              <td>{getStatusBadge(tenant)}</td>
              <td>{getTrialBadge(tenant)}</td>
              <td>
                <button className="btn btn-primary btn-sm" onClick={() => onOpenModal(tenant.id)}>{t('adminDashboard.viewButton')}</button>
                <button className="btn btn-warning btn-sm" onClick={() => onSetTrial(tenant.id)}>{t('adminDashboard.setTrialButton')}</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={6} className="empty-row">{t('adminDashboard.noTenantsFound')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}