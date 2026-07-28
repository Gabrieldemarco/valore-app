import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import ImageCropModal from '../../../../components/ImageCropModal';
import type { ServiceItem, ServiceImage } from '../dashboardContext';
import { api } from '../../../../api/client';

export default function ServiceModal({ editing, onClose }: { editing: ServiceItem | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { flatCats } = useDashboard();
  const { saveService, addServiceImage, deleteServiceImage, uploadServiceImage } = useDashboardCRUD();

  const [form, setForm] = useState({
    name: editing?.name || '',
    duration: String(editing?.duration || 30),
    price: String(editing?.price || 0),
    category: editing?.category || '',
    category_id: editing?.category_id ? String(editing.category_id) : '',
    description: editing?.description || '',
    image: editing?.image || '',
  });
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [loadedImages, setLoadedImages] = useState(false);

  // Load images on mount if editing
  if (editing && !loadedImages) {
    setLoadedImages(true);
    api.get<{ images: ServiceImage[] }>(`/api/tenant/services/${editing.id}/images`).then(res => {
      setImages(res.images || []);
    }).catch(() => {});
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCropFile(file);
  };

  const handleCropApply = async (dataUrl: string) => {
    if (!cropFile) return;
    const url = await uploadServiceImage(cropFile, dataUrl);
    if (url) setForm(p => ({ ...p, image: url }));
    setCropFile(null);
  };

  const handleAddImage = async () => {
    if (!imageUrl || !editing) return;
    const img = await addServiceImage(editing.id, imageUrl);
    if (img) { setImages(prev => [...prev, img]); setImageUrl(''); }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!editing) return;
    const ok = await deleteServiceImage(editing.id, imageId);
    if (ok) setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSave = async () => {
    const ok = await saveService(form, editing);
    if (ok) onClose();
  };

  return (
    <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
      <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="dash-modal-header">
          <h3 className="text-gradient">{editing ? t('staffDashboard.servicesModalEditTitle') : t('staffDashboard.servicesModalNewTitle')}</h3>
          <button onClick={onClose} className="dash-close-btn">✕</button>
        </div>
        <div className="dash-modal-body">
          <div className="dash-form-group">
            <label>{t('staffDashboard.servicesModalNameLabel')}</label>
            <input type="text" className="glass-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('staffDashboard.servicesModalNamePlaceholder')} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.servicesModalDurationLabel')}</label>
            <input type="number" className="glass-input" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} min="5" step="5" />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.servicesModalPriceLabel')}</label>
            <input type="number" className="glass-input" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} min="0" step="any" />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.servicesModalCategoryLabel')}</label>
            <select className="glass-input" value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
              <option value="">{t('staffDashboard.servicesModalCategoryPlaceholder')}</option>
              {flatCats.map(c => (
                <option key={c.id} value={String(c.id)}>{'── '.repeat(c.depth)}{c.name}</option>
              ))}
            </select>
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.servicesModalDescriptionLabel', 'Descripción')}</label>
            <textarea className="glass-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={t('staffDashboard.servicesModalDescriptionPlaceholder', 'Ej: No incluye diseño')} rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.servicesModalImageLabel')}</label>
            <input type="text" className="glass-input" value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder={t('staffDashboard.servicesModalImagePlaceholder')} />
            <input type="file" accept="image/*" style={{ marginTop: 6, padding: 6, fontSize: 13 }} className="glass-input" onChange={handleImageUpload} />
            {form.image && (
              <div style={{ marginTop: 6 }}>
                <img src={form.image} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
          {editing && (
            <div className="dash-form-group">
              <label>{t('staffDashboard.servicesModalGalleryLabel', 'Galería de imágenes')}</label>
              <div className="service-gallery-staff">
                {images.map(img => (
                  <div key={img.id} className="service-gallery-item">
                    <img src={img.url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <button className="service-gallery-remove" onClick={() => handleDeleteImage(img.id)}>×</button>
                  </div>
                ))}
                <div className="service-gallery-add">
                  <input type="text" className="glass-input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder={t('staffDashboard.servicesModalImageUrlPlaceholder', 'URL de imagen')} style={{ fontSize: 13, padding: '6px 8px' }} />
                  <button className="dash-btn dash-btn-primary" onClick={handleAddImage} style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}>+ {t('staffDashboard.servicesModalAddImage', 'Agregar')}</button>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="dash-btn dash-btn-danger" onClick={onClose}>{t('staffDashboard.servicesModalCancel')}</button>
            <button className="dash-btn dash-btn-success" onClick={handleSave}>{editing ? t('staffDashboard.servicesModalSave') : t('staffDashboard.servicesModalCreate')}</button>
          </div>
        </div>
      </div>
      {cropFile && <ImageCropModal open={true} file={cropFile} aspectRatio={16 / 9} onApply={handleCropApply} onCancel={() => setCropFile(null)} />}
    </div>
  );
}
