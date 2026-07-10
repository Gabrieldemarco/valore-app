import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { logger } from '../../services/logger';
import ImageCropModal from '../ImageCropModal';

interface ProductItem {
  id: number; name: string; description: string; price: number; cost: number;
  stock: number; min_stock: number; category: string; sku: string; image_url: string;
  active: boolean; created_at: string;
}

interface ProductsSectionProps {
  products: ProductItem[];
  addToast: (message: string, type: 'success' | 'error') => void;
  refreshProducts: () => Promise<void>;
}

export default function ProductsSection({ products, addToast, refreshProducts }: ProductsSectionProps) {
  const { t } = useTranslation();
  const [productsForm, setProductsForm] = useState({ name: '', description: '', price: '0', cost: '0', stock: '0', min_stock: '0', category: '', sku: '', image_url: '' });
  const [productsModal, setProductsModal] = useState<{ open: boolean; editing: ProductItem | null }>({ open: false, editing: null });
  const [productCropFile, setProductCropFile] = useState<File | null>(null);
  const [productCropAspect, setProductCropAspect] = useState(1 / 1);

  const openProductCreate = () => {
    setProductsForm({ name: '', description: '', price: '0', cost: '0', stock: '0', min_stock: '0', category: '', sku: '', image_url: '' });
    setProductsModal({ open: true, editing: null });
  };

  const openProductEdit = (p: ProductItem) => {
    setProductsForm({ name: p.name, description: p.description, price: String(p.price), cost: String(p.cost), stock: String(p.stock), min_stock: String(p.min_stock), category: p.category, sku: p.sku, image_url: p.image_url || '' });
    setProductsModal({ open: true, editing: p });
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductCropFile(file);
    setProductCropAspect(1 / 1);
  };

  const handleProductCropApply = async (dataUrl: string) => {
    if (!productCropFile) return;
    try {
      const res = await api.post<{ success: boolean; url: string; message: string }>('/api/upload-image', { image: dataUrl, filename: `product-${Date.now()}.jpg` });
      if (res.success && res.url) {
        setProductsForm(p => ({ ...p, image_url: res.url }));
        addToast(t('staffDashboard.toastProductImageUploadSuccess'), 'success');
      } else {
        addToast(t('staffDashboard.toastProductImageUploadError'), 'error');
      }
    } catch {
      logger.error('Error uploading product image:', productCropFile.name);
      addToast(t('staffDashboard.toastProductImageUploadError'), 'error');
    }
    setProductCropFile(null);
  };

  const saveProduct = async () => {
    if (!productsForm.name || !productsForm.price) { addToast(t('staffDashboard.toastProductSaveValidation'), 'error'); return; }
    try {
      const body = { name: productsForm.name, description: productsForm.description, price: parseFloat(productsForm.price), cost: parseFloat(productsForm.cost), stock: parseInt(productsForm.stock, 10), min_stock: parseInt(productsForm.min_stock, 10), category: productsForm.category, sku: productsForm.sku, image_url: productsForm.image_url };
      if (productsModal.editing) {
        await api.put(`/api/tenant/products/${productsModal.editing.id}`, body);
        addToast(t('staffDashboard.toastProductUpdated'), 'success');
      } else {
        await api.post('/api/tenant/products', body);
        addToast(t('staffDashboard.toastProductCreated'), 'success');
      }
      setProductsModal({ open: false, editing: null });
      setProductCropFile(null);
      refreshProducts();
    } catch (e: any) { addToast(e?.message || t('staffDashboard.toastProductSaveError'), 'error'); }
  };

  const deleteProduct = async (id: number, name: string) => {
    if (!confirm(t('staffDashboard.toastProductDeleteConfirm', { name }))) return;
    try {
      await api.delete(`/api/tenant/products/${id}`);
      addToast(t('staffDashboard.toastProductDeleted'), 'success');
      refreshProducts();
    } catch { addToast(t('staffDashboard.toastProductDeleteError'), 'error'); }
  };

  return (
    <>
      <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.tabProducts')}</h3>
          <button className="dash-btn dash-btn-success" onClick={openProductCreate}>{t('staffDashboard.productsNewButton')}</button>
        </div>
        {products.length === 0 ? (
          <div className="dash-empty-state glass-panel">
            <h4>{t('staffDashboard.servicesEmptyTitle')}</h4>
            <p>{t('staffDashboard.servicesEmptyMessage')}</p>
          </div>
        ) : (
          <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableName')}</th>
                  <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.productsTableImage')}</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.productsTableCategory')}</th>
                  <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.productsTablePrice')}</th>
                  <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.productsTableCost')}</th>
                  <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.productsTableStock')}</th>
                  <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableActive')}</th>
                  <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableActions')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 12, color: 'var(--text-muted)' }}>{p.category || '-'}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>${p.price}</td>
                    <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>${p.cost}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <span style={{ color: p.stock <= p.min_stock ? '#fca5a5' : '#94a3b8' }}>{p.stock}</span>
                      {p.min_stock > 0 && <span className="fs-12" style={{ color: '#64748b', marginLeft: 4 }}>/ {p.min_stock}</span>}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <span className={`dash-appointment-status ${p.active ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                        {p.active ? t('staffDashboard.servicesYes') : t('staffDashboard.servicesNo')}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <button className="dash-btn dash-btn-success" onClick={() => openProductEdit(p)}>{t('staffDashboard.servicesEditButton')}</button>
                      <button className="dash-btn dash-btn-danger" onClick={() => deleteProduct(p.id, p.name)}>{t('staffDashboard.servicesDeleteButton')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {productsModal.open && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setProductsModal({ open: false, editing: null })}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">{productsModal.editing ? t('staffDashboard.productsModalEditTitle') : t('staffDashboard.productsModalNewTitle')}</h3>
              <button onClick={() => setProductsModal({ open: false, editing: null })} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-group">
                <label>{t('staffDashboard.productsModalNameLabel')}</label>
                <input type="text" className="glass-input" value={productsForm.name} onChange={e => setProductsForm(p => ({ ...p, name: e.target.value }))} placeholder={t('staffDashboard.productsModalNamePlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.productsModalDescriptionLabel')}</label>
                <textarea className="glass-input" value={productsForm.description} onChange={e => setProductsForm(p => ({ ...p, description: e.target.value }))} placeholder={t('staffDashboard.productsModalDescriptionPlaceholder')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="dash-form-group">
                  <label>{t('staffDashboard.productsModalPriceLabel')}</label>
                  <input type="number" className="glass-input" value={productsForm.price} onChange={e => setProductsForm(p => ({ ...p, price: e.target.value }))} min="0" step="0.01" />
                </div>
                <div className="dash-form-group">
                  <label>{t('staffDashboard.productsModalCostLabel')}</label>
                  <input type="number" className="glass-input" value={productsForm.cost} onChange={e => setProductsForm(p => ({ ...p, cost: e.target.value }))} min="0" step="0.01" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="dash-form-group">
                  <label>{t('staffDashboard.productsModalStockLabel')}</label>
                  <input type="number" className="glass-input" value={productsForm.stock} onChange={e => setProductsForm(p => ({ ...p, stock: e.target.value }))} min="0" />
                </div>
                <div className="dash-form-group">
                  <label>{t('staffDashboard.productsModalMinStockLabel')}</label>
                  <input type="number" className="glass-input" value={productsForm.min_stock} onChange={e => setProductsForm(p => ({ ...p, min_stock: e.target.value }))} min="0" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="dash-form-group">
                  <label>{t('staffDashboard.productsModalSKULabel')}</label>
                  <input type="text" className="glass-input" value={productsForm.sku} onChange={e => setProductsForm(p => ({ ...p, sku: e.target.value }))} placeholder={t('staffDashboard.productsModalSKUPlaceholder')} />
                </div>
                <div className="dash-form-group">
                  <label>{t('staffDashboard.productsModalCategoryLabel')}</label>
                  <input type="text" className="glass-input" value={productsForm.category} onChange={e => setProductsForm(p => ({ ...p, category: e.target.value }))} placeholder={t('staffDashboard.productsModalCategoryPlaceholder')} />
                </div>
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.productsModalImageLabel')}</label>
                <input type="text" className="glass-input" value={productsForm.image_url} onChange={e => setProductsForm(p => ({ ...p, image_url: e.target.value }))} placeholder={t('staffDashboard.productsModalImagePlaceholder')} />
                <input type="file" accept="image/*" style={{ marginTop: 6, padding: 6, fontSize: 13 }} className="glass-input" onChange={handleProductImageUpload} />
                {productsForm.image_url && (
                  <div style={{ marginTop: 6 }}>
                    <img src={productsForm.image_url} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="dash-btn dash-btn-danger" onClick={() => setProductsModal({ open: false, editing: null })}>{t('staffDashboard.productsModalCancel')}</button>
                <button className="dash-btn dash-btn-success" onClick={saveProduct}>{productsModal.editing ? t('staffDashboard.productsModalSave') : t('staffDashboard.productsModalCreate')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {productCropFile && (
        <ImageCropModal
          open={true}
          file={productCropFile}
          aspectRatio={productCropAspect}
          onApply={(dataUrl) => handleProductCropApply(dataUrl)}
          onCancel={() => setProductCropFile(null)}
        />
      )}
    </>
  );
}
