import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import type { TwilioConfig } from './types';

interface Props {
  config: TwilioConfig;
  setConfig: React.Dispatch<React.SetStateAction<TwilioConfig>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function TwilioConfigPanel({ config, setConfig, showToast }: Props) {
  const { t } = useTranslation();
  const handleSave = async () => {
    try {
      await api.put('/api/super-admin/config', { key: 'twilio', value: config });
      showToast(t('adminDashboard.toastTwilioSaved'), 'success');
    } catch {
      showToast(t('adminDashboard.toastTwilioError'), 'error');
    }
  };

  return (
    <div className="admin-table-wrapper">
      <div className="admin-table-header">
        <h2>{t('adminDashboard.globalConfigTitle')}</h2>
      </div>
      <div className="admin-config-panel">
        <h3 className="admin-section-title">{t('adminDashboard.twilioTitle')}</h3>
        <div className="admin-config-grid">
          <div className="admin-form-group">
            <label>{t('adminDashboard.twilioAccountSID')}</label>
            <input type="text" value={config.account_sid} onChange={e => setConfig(p => ({ ...p, account_sid: e.target.value }))} placeholder="ACxxxxxxxxxx" />
          </div>
          <div className="admin-form-group">
            <label>{t('adminDashboard.twilioAuthToken')}</label>
            <input type="password" value={config.auth_token} onChange={e => setConfig(p => ({ ...p, auth_token: e.target.value }))} placeholder="••••••••" />
          </div>
          <div className="admin-form-group">
            <label>{t('adminDashboard.twilioFrom')}</label>
            <input type="text" value={config.from} onChange={e => setConfig(p => ({ ...p, from: e.target.value }))} placeholder="whatsapp:+14155238886" />
          </div>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={handleSave}>{t('adminDashboard.twilioSaveButton')}</button>
      </div>
    </div>
  );
}
