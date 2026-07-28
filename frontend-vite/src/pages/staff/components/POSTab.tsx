import { useTranslation } from 'react-i18next';
import PhoneInput from '../../../components/PhoneInput';

interface ProductItem {
  id: number; name: string; description: string; price: number; cost: number;
  stock: number; min_stock: number; category: string; sku: string; image_url: string;
  active: boolean; created_at: string;
}

interface CartItem {
  product_id: number; name: string; quantity: number; unit_price: number; total: number;
}

interface Props {
  productsList: ProductItem[];
  posCart: CartItem[];
  posSearch: string;
  posClientName: string;
  posClientPhone: string;
  posPaymentMethod: string;
  posNotes: string;
  posCheckoutLoading: boolean;
  posTotal: number;
  setPosSearch: (v: string) => void;
  setPosClientName: (v: string) => void;
  setPosClientPhone: (v: string) => void;
  setPosPaymentMethod: (v: any) => void;
  setPosNotes: (v: string) => void;
  addToCart: (p: ProductItem) => void;
  removeFromCart: (productId: number) => void;
  updateCartQty: (productId: number, qty: number) => void;
  checkout: () => void;
}

export default function POSTab({
  productsList, posCart, posSearch, posClientName, posClientPhone,
  posPaymentMethod, posNotes, posCheckoutLoading, posTotal,
  setPosSearch, setPosClientName, setPosClientPhone, setPosPaymentMethod, setPosNotes,
  addToCart, removeFromCart, updateCartQty, checkout,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="glass-panel section-card">
      <div className="flex-between mb-20">
        <h3 className="text-gradient m-0">{t('staffDashboard.posTitle')}</h3>
      </div>
      <div className="flex flex-gap-24 flex-wrap">
        <div style={{ flex: '2 1 400px' }}>
          <input type="text" className="glass-input mb-12 w-full" placeholder={t('staffDashboard.posSearchPlaceholder')} value={posSearch} onChange={e => setPosSearch(e.target.value)} />
          <div className="grid-auto-fill-140 overflow-y-auto" style={{ maxHeight: 400 }}>
            {productsList.filter(p => p.active && (p.stock < 1 || p.name.toLowerCase().includes(posSearch.toLowerCase()))).length === 0 && posSearch ? (
              <p className="text-muted" style={{ gridColumn: '1 / -1' }}>{t('staffDashboard.posNoResults')}</p>
            ) : productsList.filter(p => p.active && (!posSearch || p.name.toLowerCase().includes(posSearch.toLowerCase()))).map(p => (
              <div key={p.id} onClick={() => p.stock > 0 && addToCart(p)} style={{
                background: p.stock > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.08)',
                borderRadius: 10, padding: 12, cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                border: '1px solid rgba(99,102,241,0.15)', opacity: p.stock > 0 ? 1 : 0.5,
              }}>
                <div className="font-600" style={{ fontSize: 15, color: 'var(--border-color)' }}>{p.name}</div>
                <div className="font-700 text-primary mt-4" style={{ fontSize: 17 }}>${p.price}</div>
                <div className="text-xs mt-4" style={{ color: p.stock <= p.min_stock ? 'var(--danger-light)' : 'var(--text-secondary)' }}>{t('staffDashboard.posStock', { stock: p.stock })}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: '1 1 300px' }}>
          <div className="glass-panel p-16 mb-12">
            <h4 className="m-0 mb-12" style={{ color: 'var(--border-color)' }}>{t('staffDashboard.posCartTitle', { count: posCart.length })}</h4>
            {posCart.length === 0 ? (
              <p className="text-muted">{t('staffDashboard.posCartEmpty')}</p>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: 250 }}>
                {posCart.map((item, idx) => (
                  <div key={idx} className="flex-center flex-gap-8" style={{ padding: '6px 0', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                    <div className="flex-1">
                      <div className="font-600">{item.name}</div>
                      <div className="text-xs-secondary">${item.unit_price} c/u</div>
                    </div>
                    <div className="flex-center flex-gap-4">
                      <button className="dash-btn" style={{ padding: '2px 8px', fontSize: 13 }} onClick={() => updateCartQty(item.product_id, item.quantity - 1)}>-</button>
                      <span className="text-center" style={{ minWidth: 20 }}>{item.quantity}</span>
                      <button className="dash-btn" style={{ padding: '2px 8px', fontSize: 13 }} onClick={() => updateCartQty(item.product_id, item.quantity + 1)}>+</button>
                    </div>
                    <div className="font-700 text-right" style={{ minWidth: 60 }}>${item.total.toFixed(2)}</div>
                    <button className="dash-btn dash-btn-danger" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => removeFromCart(item.product_id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-between mt-12 pt-12" style={{ borderTop: '1px solid rgba(148,163,184,0.2)' }}>
              <span className="font-700">{t('staffDashboard.posTotal')}</span>
              <span className="font-700 text-primary" style={{ fontSize: 21 }}>${posTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-12">
            <input type="text" className="glass-input w-full" placeholder={t('staffDashboard.posClientPlaceholder')} value={posClientName} onChange={e => setPosClientName(e.target.value)} style={{ marginBottom: 6 }} />
            <PhoneInput value={posClientPhone} onChange={setPosClientPhone} placeholder={t('staffDashboard.posPhonePlaceholder')} className="glass-input w-full" />
          </div>

          <div className="mb-12">
            <select className="glass-input w-full" value={posPaymentMethod} onChange={e => setPosPaymentMethod(e.target.value as any)}>
              <option value="cash">{t('staffDashboard.posPaymentCash')}</option>
              <option value="card">{t('staffDashboard.posPaymentCard')}</option>
              <option value="mp">{t('staffDashboard.posPaymentMP')}</option>
            </select>
          </div>

          <textarea className="glass-input w-full mb-12" placeholder={t('staffDashboard.posNotesPlaceholder')} value={posNotes} onChange={e => setPosNotes(e.target.value)} style={{ minHeight: 50 }} />

          <button className="btn btn-primary w-full" style={{ padding: 14 }} onClick={checkout} disabled={posCart.length === 0 || posCheckoutLoading}>
            {posCheckoutLoading ? t('staffDashboard.calendarSyncSyncing') : t('staffDashboard.posCheckout', { total: posTotal.toFixed(2) })}
          </button>
        </div>
      </div>
    </div>
  );
}
