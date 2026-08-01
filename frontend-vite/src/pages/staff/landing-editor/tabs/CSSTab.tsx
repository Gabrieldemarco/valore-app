import { useLandingEditor } from '../landingEditorContext';

export default function CSSTab() {
  const { t, tenant, handleTenantField } = useLandingEditor();

  return (
    <div className="card glass-panel p-24">
      <h3 className="text-gradient">{t('staffLandingEditor.cssTitle')}</h3>
      <div className="form-group">
        <textarea className="glass-input" rows={10} placeholder={t('staffLandingEditor.cssPlaceholder')}
          value={(tenant.landing_custom_css as string) || ''}
          onChange={e => handleTenantField('landing_custom_css', e.target.value)} />
        <small className="text-danger">{t('staffLandingEditor.cssWarning')}</small>
      </div>
    </div>
  );
}
