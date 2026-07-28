import { Suspense, lazy } from 'react';
import { useDashboard } from '../dashboardContext';

const WaitlistSection = lazy(() => import('../../../../components/staff/WaitlistSection'));

export default function WaitlistTab() {
  const { addToast } = useDashboard();
  return (
    <Suspense fallback={<div className="dash-loading"><div className="dash-loading-spinner"></div></div>}>
      <WaitlistSection addToast={addToast} />
    </Suspense>
  );
}
