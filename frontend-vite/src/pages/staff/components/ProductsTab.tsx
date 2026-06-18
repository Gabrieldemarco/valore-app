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
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.tabProducts')}</h3>
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
        <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableName')}</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.productsTableCategory')}</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.productsTablePrice')}</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.productsTableCost')}</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.productsTableStock')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableActive')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {productsList.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>{p.category || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>${p.price}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>${p.cost}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <span style={{ color: p.stock <= p.min_stock ? '#fca5a5' : '#94a3b8' }}>{p.stock}</span>
                    {p.min_stock > 0 && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>/ {p.min_stock}</span>}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <span className={`dash-appointment-status ${p.active ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                      {p.active ? t('staffDashboard.servicesYes') : t('staffDashboard.servicesNo')}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button className="dash-btn dash-btn-success" style={{ marginRight: 8, fontSize: 13 }} onClick={() => openProductEdit(p)}>{t('staffDashboard.servicesEditButton')}</button>
                    <button className="dash-btn dash-btn-danger" style={{ fontSize: 13 }} onClick={() => deleteProduct(p.id, p.name)}>{t('staffDashboard.servicesDeleteButton')}</button>
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
