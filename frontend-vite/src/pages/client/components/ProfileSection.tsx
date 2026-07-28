import { useTranslation } from 'react-i18next';
import PhoneInput from '../../../components/PhoneInput';

interface Props {
  profileName: string;
  profilePhone: string;
  profileMsg: string;
  profileError: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onSave: () => void;
}

export default function ProfileSection({ profileName, profilePhone, profileMsg, profileError, onNameChange, onPhoneChange, onSave }: Props) {
  const { t } = useTranslation();
  return (
    <div className="glass-panel card-padded">
      <h3 className="m-0 mb-16">{t('clientDashboard.profileTitle')}</h3>
      {profileMsg && <div className="auth-success mb-12">{profileMsg}</div>}
      {profileError && <div className="auth-error mb-12">{profileError}</div>}
      <div className="flex flex-gap-16 flex-wrap">
        <div className="flex-200">
          <label className="block text-xs-secondary mb-4">{t('clientDashboard.profileNameLabel')}</label>
          <input type="text" className="glass-input w-full" value={profileName} onChange={e => onNameChange(e.target.value)} placeholder={t('clientDashboard.profileNamePlaceholder')} />
        </div>
        <div className="flex-200">
          <label className="block text-xs-secondary mb-4">{t('clientDashboard.profilePhoneLabel')}</label>
          <PhoneInput value={profilePhone} onChange={onPhoneChange} placeholder="099 123 456" className="glass-input w-full" />
        </div>
        <button className="btn btn-primary btn-sm" onClick={onSave}>{t('clientDashboard.profileSaveButton')}</button>
      </div>
    </div>
  );
}
