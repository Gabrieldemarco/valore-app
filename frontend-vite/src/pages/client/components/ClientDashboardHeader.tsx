import { useTranslation } from 'react-i18next';

interface Props {
  clientName: string;
  onLogout: () => void;
}

export default function ClientDashboardHeader({ clientName, onLogout }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex-between mb-24">
      <h2 className="text-gradient m-0">{t('clientDashboard.welcome', { name: clientName })}</h2>
      <div className="flex-gap-8">
        <button className="dash-btn dash-btn-danger" onClick={onLogout}>{t('clientDashboard.logout')}</button>
      </div>
    </div>
  );
}
