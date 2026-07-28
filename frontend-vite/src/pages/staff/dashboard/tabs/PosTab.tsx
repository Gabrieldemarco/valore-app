import { Suspense, lazy } from 'react';
import { useDashboard } from '../dashboardContext';

const PosSection = lazy(() => import('../../../../components/staff/PosSection'));

export default function PosTab() {
  const { productsList, addToast, loadProducts } = useDashboard();
  return (
    <Suspense fallback={<div className="dash-loading"><div className="dash-loading-spinner"></div></div>}>
      <PosSection products={productsList} addToast={addToast} refreshProducts={loadProducts} />
    </Suspense>
  );
}
