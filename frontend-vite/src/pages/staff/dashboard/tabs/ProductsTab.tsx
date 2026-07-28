import { Suspense, lazy } from 'react';
import { useDashboard } from '../dashboardContext';

const ProductsSection = lazy(() => import('../../../../components/staff/ProductsSection'));

export default function ProductsTab() {
  const { productsList, addToast, loadProducts } = useDashboard();
  return (
    <Suspense fallback={<div className="dash-loading"><div className="dash-loading-spinner"></div></div>}>
      <ProductsSection products={productsList} addToast={addToast} refreshProducts={loadProducts} />
    </Suspense>
  );
}
