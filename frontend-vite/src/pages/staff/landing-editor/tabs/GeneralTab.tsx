import React from 'react';
import { useLandingEditor } from '../landingEditorContext';
import PhoneInput from '../../../../components/PhoneInput';

export default function GeneralTab() {
  const { t, tenant, handleTenantField } = useLandingEditor();

  return (
    <div className="card glass-panel" style={{ padding: '1.5rem' }}>
      <h3 className="text-gradient">{t('staffLandingEditor.generalTitle')}</h3>
      <div className="form-group">
        <label>{t('staffDashboard.businessNameLabel')}</label>
        <input type="text" className="glass-input" value={(tenant.business_name as string) || ''}
          onChange={e => handleTenantField('business_name', e.target.value)} />
      </div>
      <div className="form-group">
        <label>{t('staffLandingEditor.descriptionLabel')}</label>
        <textarea className="glass-input" rows={3} value={(tenant.landing_description as string) || ''}
          onChange={e => handleTenantField('landing_description', e.target.value)} />
      </div>
      <div className="form-group">
        <label>{t('staffDashboard.addressLabel')}</label>
        <input type="text" className="glass-input" value={(tenant.business_address as string) || ''}
          onChange={e => handleTenantField('business_address', e.target.value)} />
      </div>
      <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>{t('staffLandingEditor.latitudeLabel')}</label>
          <input type="number" step="any" className="glass-input" value={(tenant.lat as number | undefined) ?? ''}
            onChange={e => handleTenantField('lat', e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder="-34.90" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>{t('staffLandingEditor.longitudeLabel')}</label>
          <input type="number" step="any" className="glass-input" value={(tenant.lng as number | undefined) ?? ''}
            onChange={e => handleTenantField('lng', e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder="-56.18" />
        </div>
      </div>
      <div className="form-group">
        <label>{t('staffLandingEditor.phoneLabel')}</label>
        <PhoneInput value={(tenant.business_phone as string) || ''}
          onChange={v => handleTenantField('business_phone', v)} className="glass-input" />
      </div>
      <div className="form-group">
        <label>
          <input type="checkbox" checked={(tenant.landing_enabled as boolean) || false}
            onChange={e => handleTenantField('landing_enabled', e.target.checked)} />{' '}
          {t('staffLandingEditor.landingEnabledLabel')}
        </label>
      </div>
    </div>
  );
}
