import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import { formatPrice } from '../dashboardContext';
import ServiceModal from '../modals/ServiceModal';

export default function ServicesTab() {
  const { t } = useTranslation();
  const { servicesList } = useDashboard();
  const { deleteService, toggleServiceActive } = useDashboardCRUD();
  const [modal, setModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });

  return (
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.servicesTitle')}</h3>
        <button className="dash-btn dash-btn-success" onClick={() => setModal({ open: true, editing: null })}>{t('staffDashboard.servicesNewButton')}</button>
      </div>
      {servicesList.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h3 className="text-gradient">{t('staffDashboard.servicesEmptyTitle')}</h3>
          <p>{t('staffDashboard.servicesEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableName')}</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableCategory')}</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableDuration')}</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTablePrice')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableActive')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {servicesList.map(s => (
                <tr key={s.id}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>{s.category_name || s.category || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{s.duration} {t('landingServices.minutes')}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{t('landingServices.pricePrefix')}{formatPrice(s.price)}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button onClick={() => toggleServiceActive(s)} className={`dash-appointment-status ${s.active ? 'dash-status-confirmed' : 'dash-status-cancelled'}`} style={{ cursor: 'pointer', border: 'none' }}>
                      {s.active ? t('staffDashboard.servicesYes') : t('staffDashboard.servicesNo')}
                    </button>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button className="dash-btn dash-btn-success" style={{ marginRight: 8 }} onClick={() => setModal({ open: true, editing: s })}>{t('staffDashboard.servicesEditButton')}</button>
                    <button className="dash-btn dash-btn-danger" onClick={() => deleteService(s.id, s.name)}>{t('staffDashboard.servicesDeleteButton')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal.open && <ServiceModal editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />}
    </div>
  );
}
