import { useLandingEditor } from '../landingEditorContext';
import { SECTION_LABELS, normalizeEmbedUrl, isValidEmbedUrl } from '../landingEditorUtils';
import { GripVertical, X, Home, Sparkles, Image, Users, Calendar, Clock, MapPin } from 'lucide-react';

function sectionIcon(id: string) {
  switch (id) {
    case 'hero': return <Home size={16} className="mr-6 vertical-align-middle" />;
    case 'servicios': return <Sparkles size={16} className="mr-6 vertical-align-middle" />;
    case 'galeria': return <Image size={16} className="mr-6 vertical-align-middle" />;
    case 'equipo': return <Users size={16} className="mr-6 vertical-align-middle" />;
    case 'reservar': return <Calendar size={16} className="mr-6 vertical-align-middle" />;
    case 'hours': return <Clock size={16} className="mr-6 vertical-align-middle" />;
    case 'ubicacion': return <MapPin size={16} className="mr-6 vertical-align-middle" />;
    default: return null;
  }
}

export default function LayoutTab() {
  const { t, layout, toggleLayoutSection, removeCustomBlock, addCustomBlock, dragIndexRef, handleDragStart, handleDragOver, handleDragLeave, handleDrop, modalOpen, setModalOpen, modalLabel, setModalLabel, modalTitle, setModalTitle, modalContent, setModalContent, modalEmbedSrc, handleEmbedSrcChange, saveCustomBlockModal } = useLandingEditor();

  const embedPreviewSrc = (() => {
    const src = normalizeEmbedUrl(modalEmbedSrc);
    return isValidEmbedUrl(src) ? src : '';
  })();

  return (
    <>
      <div className="card glass-panel p-24">
        <h3 className="text-gradient">{t('staffLandingEditor.layoutTitle')}</h3>
        <p className="text-muted-sm mb-16">
          {t('staffLandingEditor.layoutHint')}
        </p>
        <div id="layoutSorter" className="flex flex-col gap-8">
          {layout.map((item, index) => {
            const isCustom = item.type === 'custom';
            const label = isCustom ? (item.label || 'Bloque personalizado') : (SECTION_LABELS[item.id] || item.id);
            return (
              <div key={item.id} className="layout-item" draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={() => { dragIndexRef.current = null; }}>
                <span className="drag-handle"><GripVertical size={16} /></span>
                <label className="layout-label">
                  <input type="checkbox" checked={item.enabled !== false}
                    onChange={e => toggleLayoutSection(index, e.target.checked)} /> {sectionIcon(item.id)}{label}
                </label>
                {isCustom && (
                  <button className="btn btn-danger btn-icon" onClick={() => removeCustomBlock(index)}><X size={14} /></button>
                )}
              </div>
            );
          })}
        </div>
        <hr className="border-subtle mt-16 mb-16" />
        <h3 style={{ fontSize: '1.05rem', marginBottom: 8 }}>{t('staffLandingEditor.customBlocksTitle')}</h3>
        <p className="text-sm text-muted mb-12">
          {t('staffLandingEditor.customBlocksHint')}
        </p>
        <button className="btn btn-secondary" onClick={addCustomBlock} style={{ fontSize: '0.9rem' }}>
          {t('staffLandingEditor.customBlockAddButton')}
        </button>
      </div>

      {/* Modal for custom block */}
      <div className={`modal-overlay${modalOpen ? ' open' : ''}`}>
          <div className="glass-panel rounded-xl" style={{ width: '90%', maxWidth: 600, padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 className="text-gradient mb-24">{t('staffLandingEditor.customBlockModalTitle')}</h3>
          <div className="form-group">
            <label>{t('staffLandingEditor.customBlockNameLabel')}</label>
            <input type="text" className="glass-input" placeholder={t('staffLandingEditor.customBlockNamePlaceholder')} value={modalLabel}
              onChange={e => setModalLabel(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('staffLandingEditor.customBlockTitleLabel')}</label>
            <input type="text" className="glass-input" placeholder={t('staffLandingEditor.customBlockTitlePlaceholder')} value={modalTitle}
              onChange={e => setModalTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('staffLandingEditor.customBlockEmbedLabel')}</label>
            <input type="url" className="glass-input" placeholder={t('staffLandingEditor.customBlockEmbedPlaceholder')} value={modalEmbedSrc}
              onChange={e => handleEmbedSrcChange(e.target.value)} />
            <small className="text-muted">{t('staffLandingEditor.customBlockEmbedHint')}</small>
          </div>
          {embedPreviewSrc && (
            <div className="form-group">
              <label>{t('staffLandingEditor.customBlockEmbedPreview')}</label>
              <div className="embed-preview-wrapper">
                <iframe src={embedPreviewSrc} title={t('staffLandingEditor.customBlockEmbedPreview')} className="embed-preview-frame" loading="lazy" />
              </div>
            </div>
          )}
          <div className="form-group">
            <label>{t('staffLandingEditor.customBlockContentLabel')}</label>
            <textarea className="glass-input" rows={6} placeholder={t('staffLandingEditor.customBlockContentPlaceholder')} value={modalContent}
              onChange={e => setModalContent(e.target.value)} />
            <small className="text-muted">{t('staffLandingEditor.customBlockContentHint')}</small>
          </div>
          <div className="flex gap-10 flex-end mt-16">
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>{t('staffLandingEditor.customBlockCancel')}</button>
            <button className="btn btn-primary" onClick={saveCustomBlockModal}>{t('staffLandingEditor.customBlockAdd')}</button>
          </div>
        </div>
      </div>
    </>
  );
}
