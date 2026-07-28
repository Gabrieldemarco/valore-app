import React from 'react';
import { useLandingEditor } from '../landingEditorContext';
import { fixImageUrl, PLACEHOLDER_IMG } from '../landingEditorUtils';
import { X } from 'lucide-react';

export default function GalleryTab() {
  const { t, gallery, addGalleryUrl, removeGallery, handleImageUpload, showStatus } = useLandingEditor();

  return (
    <div className="card glass-panel" style={{ padding: '1.5rem' }}>
      <h3 className="text-gradient">{t('staffLandingEditor.galleryTitle')}</h3>
      <div className="form-group">
        <input type="url" id="newGalleryUrl" className="glass-input" placeholder={t('staffLandingEditor.galleryUrlPlaceholder')} />
        <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
          <input type="file" id="newGalleryFile" accept="image/*" className="glass-input"
            style={{ flex: 1, padding: 10 }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) {
                showStatus(t('staffLandingEditor.statusImageTooLarge'), false);
                return;
              }
              handleImageUpload('gallery', file);
            }} />
          <button className="btn btn-secondary" onClick={addGalleryUrl}>{t('staffLandingEditor.galleryAddUrlButton')}</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
        {gallery.map((url, i) => (
          <div key={i} className="gallery-item">
            <img src={fixImageUrl(url)} alt={t('galleryTab.altGallery')} onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
            <button className="remove-btn" onClick={() => removeGallery(i)}><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
