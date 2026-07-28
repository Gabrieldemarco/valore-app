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
    <div className="card glass-panel p-24">
      <h3 className="text-gradient">{t('staffLandingEditor.servicesTitle')}</h3>
      <div id="servicesList">
        {services.map((s, i) => (
          <div key={i} className={`service-item${s._deleted ? ' deleted' : ''}`}>
            <div className="service-fields">
              <div className="form-group mb-8">
                <label className="text-sm text-muted mb-4 block">
                  {t('staffLandingEditor.serviceNameLabel')}
                </label>
                <input type="text" className="glass-input" placeholder={t('staffLandingEditor.serviceNamePlaceholder')} value={s.name}
                  onChange={e => updateService(i, 'name', e.target.value)} />
              </div>
              <div className="flex flex-gap-8 mb-8">
                <div className="form-group flex-1 mb-0">
                  <label className="text-sm text-muted mb-4 block">
                    {t('staffLandingEditor.serviceDurationLabel')}
                  </label>
                  <input type="number" className="glass-input" placeholder={t('staffLandingEditor.serviceDurationPlaceholder')} value={s.duration}
                    onChange={e => updateService(i, 'duration', e.target.value)} />
                </div>
                <div className="form-group flex-1 mb-0">
                  <label className="text-sm text-muted mb-4 block">
                    {t('staffLandingEditor.servicePriceLabel')}
                  </label>
                  <input type="number" className="glass-input" placeholder={t('staffLandingEditor.servicePricePlaceholder')} value={Number(s.price) || 0}
                    onChange={e => updateService(i, 'price', e.target.value)} />
                </div>
                <div className="form-group w-100 m-0">
                  <label className="text-sm text-muted mb-4 block">
                    {t('staffLandingEditor.serviceDepositLabel')}
                  </label>
                  <input type="number" className="glass-input" placeholder={t('staffLandingEditor.serviceDepositPlaceholder')} value={s.deposit_amount ?? ''}
                    onChange={e => updateService(i, 'deposit_amount', e.target.value)} />
                </div>
              </div>
              <div className="form-group mb-0">
                <label className="text-sm text-muted mb-4 block">
                  Categoría
                </label>
                <select className="glass-input" value={s.category_id ?? ''} onChange={e => updateService(i, 'category_id', e.target.value ? parseInt(e.target.value, 10) : null)}>
                  <option value="">Sin categoría</option>
                  {flatten(categories).map(c => (
                    <option key={c.id} value={c.id}>{'── '.repeat(c.depth)}{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="text-sm text-muted mb-4 block">
                  {t('staffLandingEditor.serviceImageLabel')}
                </label>
                <input type="url" className="glass-input" placeholder={t('staffLandingEditor.serviceImagePlaceholder')} value={s.image || ''}
                  onChange={e => updateService(i, 'image', e.target.value)} />
                <input type="file" accept="image/*" className="glass-input mt-4 p-6 fs-14"
                  onChange={e => handleImageUpload('service_image', e.target.files?.[0], i)} />
              </div>
              {s.image && (
                <div className="flex items-center gap-10 mt-5">
                  <img src={fixImageUrl(s.image)} alt="" className="w-40 h-40 object-cover-4" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
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
