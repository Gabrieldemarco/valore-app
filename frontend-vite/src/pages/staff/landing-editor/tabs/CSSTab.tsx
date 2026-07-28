import React from 'react';
import { useLandingEditor } from '../landingEditorContext';

export default function CSSTab() {
  const { t, tenant, handleTenantField } = useLandingEditor();

  return (
    <div className="card glass-panel" style={{ padding: '1.5rem' }}>
      <h3 className="text-gradient">{t('staffLandingEditor.cssTitle')}</h3>
      <div className="form-group">
        <textarea className="glass-input" rows={10} placeholder={t('staffLandingEditor.cssPlaceholder')}
          value={(tenant.landing_custom_css as string) || ''}
          onChange={e => handleTenantField('landing_custom_css', e.target.value)} />
        <small style={{ color: 'var(--danger)' }}>{t('staffLandingEditor.cssWarning')}</small>
      </div>
    </div>
  );
}
