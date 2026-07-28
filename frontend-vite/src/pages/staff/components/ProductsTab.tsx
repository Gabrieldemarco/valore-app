import { useTranslation } from 'react-i18next';

interface ProductItem {
  id: number; name: string; description: string; price: number; cost: number;
  stock: number; min_stock: number; category: string; sku: string; image_url: string;
  active: boolean; created_at: string;
}

interface Props {
  productsList: ProductItem[];
  productsLoading: boolean;
  openProductCreate: () => void;
  openProductEdit: (p: ProductItem) => void;
  deleteProduct: (id: number, name: string) => void;
}

export default function ProductsTab({ productsList, productsLoading, openProductCreate, openProductEdit, deleteProduct }: Props) {
  const { t } = useTranslation();

  return (
    <div className="glass-panel mt-24 p-24">
      <div className="flex-between mb-20">
        <h3 className="text-gradient m-0">{t('staffDashboard.tabProducts')}</h3>
        <button className="dash-btn dash-btn-success" onClick={openProductCreate}>+ {t('staffDashboard.productsNewButton')}</button>
      </div>
      {productsLoading ? (
        <div className="dash-empty-state glass-panel"><p>{t('staffDashboard.loadingAppointments')}</p></div>
      ) : productsList.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h4>{t('staffDashboard.productsEmptyTitle')}</h4>
          <p>{t('staffDashboard.productsEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive overflow-x-auto">
          <table className="table-full">
            <thead>
              <tr>
                <th className="table-cell-left">{t('staffDashboard.servicesTableName')}</th>
                <th className="table-cell-left">{t('staffDashboard.productsTableCategory')}</th>
                <th className="table-cell-right">{t('staffDashboard.productsTablePrice')}</th>
                <th className="table-cell-right">{t('staffDashboard.productsTableCost')}</th>
                <th className="table-cell-right">{t('staffDashboard.productsTableStock')}</th>
                <th className="table-cell-center">{t('staffDashboard.servicesTableActive')}</th>
                <th className="table-cell-center">{t('staffDashboard.staffTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {productsList.map(p => (
                <tr key={p.id}>
                  <td className="table-cell-label">{p.name}</td>
                  <td className="table-cell-pad text-muted">{p.category || '-'}</td>
                  <td className="table-cell-pad-right">${p.price}</td>
                  <td className="table-cell-pad-right text-muted">${p.cost}</td>
                  <td className="table-cell-pad-right">
                    <span style={{ color: p.stock <= p.min_stock ? 'var(--danger-light)' : 'var(--text-secondary)' }}>{p.stock}</span>
                    {p.min_stock > 0 && <span className="text-xs text-secondary ml-4">/ {p.min_stock}</span>}
                  </td>
                  <td className="table-cell-pad-center">
                    <span className={`dash-appointment-status ${p.active ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                      {p.active ? t('staffDashboard.servicesYes') : t('staffDashboard.servicesNo')}
                    </span>
                  </td>
                  <td className="table-cell-pad-center">
                    <button className="dash-btn dash-btn-success mr-8 text-sm-2" onClick={() => openProductEdit(p)}>{t('staffDashboard.servicesEditButton')}</button>
                    <button className="dash-btn dash-btn-danger text-sm-2" onClick={() => deleteProduct(p.id, p.name)}>{t('staffDashboard.servicesDeleteButton')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
