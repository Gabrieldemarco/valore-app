import React from 'react';
import { useLandingEditor } from '../landingEditorContext';
import { fixImageUrl, PLACEHOLDER_IMG } from '../landingEditorUtils';
import { RotateCcw, Trash2 } from 'lucide-react';

export default function ServicesTab() {
  const { t, services, categories, updateService, toggleDeleteService, addService, handleImageUpload } = useLandingEditor();

  function flatten(items: { id: number; name: string; children: { id: number; name: string; children: { id: number; name: string; children: { id: number; name: string; children: { id: number; name: string; children: { id: number; name: string; children: { id: number; name: string; children: never[] }[] }[] }[] }[] }[] }[] }[], depth = 0): { id: number; name: string; depth: number }[] {
    const r: { id: number; name: string; depth: number }[] = [];
    for (const c of items) { r.push({ id: c.id, name: c.name, depth }); r.push(...flatten(c.children, depth + 1)); }
    return r;
  }

  return (
    <div className="card glass-panel" style={{ padding: '1.5rem' }}>
      <h3 className="text-gradient">{t('staffLandingEditor.servicesTitle')}</h3>
      <div id="servicesList">
        {services.map((s, i) => (
          <div key={i} className={`service-item${s._deleted ? ' deleted' : ''}`}>
            <div className="service-fields">
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  {t('staffLandingEditor.serviceNameLabel')}
                </label>
                <input type="text" className="glass-input" placeholder={t('staffLandingEditor.serviceNamePlaceholder')} value={s.name}
                  onChange={e => updateService(i, 'name', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    {t('staffLandingEditor.serviceDurationLabel')}
                  </label>
                  <input type="number" className="glass-input" placeholder={t('staffLandingEditor.serviceDurationPlaceholder')} value={s.duration}
                    onChange={e => updateService(i, 'duration', e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    {t('staffLandingEditor.servicePriceLabel')}
                  </label>
                  <input type="number" className="glass-input" placeholder={t('staffLandingEditor.servicePricePlaceholder')} value={Number(s.price) || 0}
                    onChange={e => updateService(i, 'price', e.target.value)} />
                </div>
                <div className="form-group" style={{ width: '100px', marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    {t('staffLandingEditor.serviceDepositLabel')}
                  </label>
                  <input type="number" className="glass-input" placeholder={t('staffLandingEditor.serviceDepositPlaceholder')} value={s.deposit_amount ?? ''}
                    onChange={e => updateService(i, 'deposit_amount', e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Categoría
                </label>
                <select className="glass-input" value={s.category_id ?? ''} onChange={e => updateService(i, 'category_id', e.target.value ? parseInt(e.target.value, 10) : null)}>
                  <option value="">Sin categoría</option>
                  {flatten(categories).map(c => (
                    <option key={c.id} value={c.id}>{'── '.repeat(c.depth)}{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  {t('staffLandingEditor.serviceImageLabel')}
                </label>
                <input type="url" className="glass-input" placeholder={t('staffLandingEditor.serviceImagePlaceholder')} value={s.image || ''}
                  onChange={e => updateService(i, 'image', e.target.value)} />
                <input type="file" accept="image/*" className="glass-input" style={{ marginTop: 4, padding: 6, fontSize: 14 }}
                  onChange={e => handleImageUpload('service_image', e.target.files?.[0], i)} />
              </div>
              {s.image && (
                <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={fixImageUrl(s.image)} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                </div>
              )}
            </div>
            <div className="service-actions">
              <button className="btn btn-danger" onClick={() => toggleDeleteService(i)}>
                {s._deleted ? <RotateCcw size={16} /> : <Trash2 size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" onClick={addService}>{t('staffLandingEditor.serviceNewButton')}</button>
    </div>
  );
}
