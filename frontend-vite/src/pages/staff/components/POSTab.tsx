import { useTranslation } from 'react-i18next';

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
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.posTitle')}</h3>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 400px' }}>
          <input type="text" className="glass-input" placeholder={t('staffDashboard.posSearchPlaceholder')} value={posSearch} onChange={e => setPosSearch(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {productsList.filter(p => p.active && (p.stock < 1 || p.name.toLowerCase().includes(posSearch.toLowerCase()))).length === 0 && posSearch ? (
              <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>{t('staffDashboard.posNoResults')}</p>
            ) : productsList.filter(p => p.active && (!posSearch || p.name.toLowerCase().includes(posSearch.toLowerCase()))).map(p => (
              <div key={p.id} onClick={() => p.stock > 0 && addToCart(p)} style={{
                background: p.stock > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.08)',
                borderRadius: 10, padding: 12, cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                border: '1px solid rgba(99,102,241,0.15)', opacity: p.stock > 0 ? 1 : 0.5,
              }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#e2e8f0' }}>{p.name}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#c8827d', marginTop: 4 }}>${p.price}</div>
                <div style={{ fontSize: 12, color: p.stock <= p.min_stock ? '#fca5a5' : '#64748b', marginTop: 4 }}>{t('staffDashboard.posStock', { stock: p.stock })}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: '1 1 300px' }}>
          <div className="glass-panel" style={{ padding: 16, marginBottom: 12 }}>
            <h4 style={{ margin: '0 0 12px', color: '#e2e8f0' }}>{t('staffDashboard.posCartTitle', { count: posCart.length })}</h4>
            {posCart.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('staffDashboard.posCartEmpty')}</p>
            ) : (
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                {posCart.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>${item.unit_price} c/u</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button className="dash-btn" style={{ padding: '2px 8px', fontSize: 13 }} onClick={() => updateCartQty(item.product_id, item.quantity - 1)}>-</button>
                      <span style={{ fontSize: 14, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                      <button className="dash-btn" style={{ padding: '2px 8px', fontSize: 13 }} onClick={() => updateCartQty(item.product_id, item.quantity + 1)}>+</button>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: 'right' }}>${item.total.toFixed(2)}</div>
                    <button className="dash-btn dash-btn-danger" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => removeFromCart(item.product_id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.2)' }}>
              <span style={{ fontWeight: 700 }}>{t('staffDashboard.posTotal')}</span>
              <span style={{ fontSize: 21, fontWeight: 700, color: '#c8827d' }}>${posTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <input type="text" className="glass-input" placeholder={t('staffDashboard.posClientPlaceholder')} value={posClientName} onChange={e => setPosClientName(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
            <input type="tel" className="glass-input" placeholder={t('staffDashboard.posPhonePlaceholder')} value={posClientPhone} onChange={e => setPosClientPhone(e.target.value)} style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <select className="glass-input" value={posPaymentMethod} onChange={e => setPosPaymentMethod(e.target.value as any)} style={{ width: '100%' }}>
              <option value="cash">{t('staffDashboard.posPaymentCash')}</option>
              <option value="card">{t('staffDashboard.posPaymentCard')}</option>
              <option value="mp">{t('staffDashboard.posPaymentMP')}</option>
            </select>
          </div>

          <textarea className="glass-input" placeholder={t('staffDashboard.posNotesPlaceholder')} value={posNotes} onChange={e => setPosNotes(e.target.value)} style={{ width: '100%', minHeight: 50, marginBottom: 12 }} />

          <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} onClick={checkout} disabled={posCart.length === 0 || posCheckoutLoading}>
            {posCheckoutLoading ? t('staffDashboard.calendarSyncSyncing') : t('staffDashboard.posCheckout', { total: posTotal.toFixed(2) })}
          </button>
        </div>
      </div>
    </div>
  );
}
