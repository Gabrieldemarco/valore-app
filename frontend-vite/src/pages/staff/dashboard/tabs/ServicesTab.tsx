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
  const [modal, setModal] = useState<{ open: boolean; editing: object | null }>({ open: false, editing: null });

  return (
    <div className="glass-panel mt-24 p-24">
      <div className="flex-between mb-20">
        <h3 className="text-gradient m-0">{t('staffDashboard.servicesTitle')}</h3>
        <button className="dash-btn dash-btn-success" onClick={() => setModal({ open: true, editing: null })}>{t('staffDashboard.servicesNewButton')}</button>
      </div>
      {servicesList.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h3 className="text-gradient">{t('staffDashboard.servicesEmptyTitle')}</h3>
          <p>{t('staffDashboard.servicesEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-cell-left">{t('staffDashboard.servicesTableName')}</th>
                <th className="table-cell-left">{t('staffDashboard.servicesTableCategory')}</th>
                <th className="table-cell-right">{t('staffDashboard.servicesTableDuration')}</th>
                <th className="table-cell-right">{t('staffDashboard.servicesTablePrice')}</th>
                <th className="table-cell-center">{t('staffDashboard.servicesTableActive')}</th>
                <th className="table-cell-center">{t('staffDashboard.servicesTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {servicesList.map(s => (
                <tr key={s.id}>
                  <td className="p-12 font-600">{s.name}</td>
                  <td className="p-12 text-muted">{s.category_name || s.category || '-'}</td>
                  <td className="p-12 text-right text-muted">{s.duration} {t('landingServices.minutes')}</td>
                  <td className="p-12 text-right text-muted">{t('landingServices.pricePrefix')}{formatPrice(s.price)}</td>
                  <td className="p-12 text-center">
                    <button onClick={() => toggleServiceActive(s)} className={`dash-appointment-status ${s.active ? 'dash-status-confirmed' : 'dash-status-cancelled'} cursor-pointer border-none`}>
                      {s.active ? t('staffDashboard.servicesYes') : t('staffDashboard.servicesNo')}
                    </button>
                  </td>
                  <td className="p-12 text-center">
                    <button className="dash-btn dash-btn-success mr-8" onClick={() => setModal({ open: true, editing: s })}>{t('staffDashboard.servicesEditButton')}</button>
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
