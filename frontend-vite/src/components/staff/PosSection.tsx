import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import PhoneInput from '../PhoneInput';

interface ProductItem {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  category: string;
  sku: string;
  image_url: string;
  active: boolean;
}

interface PosSectionProps {
  products: ProductItem[];
  addToast: (message: string, type: 'success' | 'error') => void;
  refreshProducts: () => Promise<void>;
}

export default function PosSection({ products, addToast, refreshProducts }: PosSectionProps) {
  const { t } = useTranslation();
  const [posCart, setPosCart] = useState<{ product_id: number; name: string; quantity: number; unit_price: number; total: number }[]>([]);
  const [posClientName, setPosClientName] = useState('');
  const [posClientPhone, setPosClientPhone] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'card' | 'mp'>('cash');
  const [posNotes, setPosNotes] = useState('');
  const [posSearch, setPosSearch] = useState('');

  const addToCart = (p: ProductItem) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.product_id === p.id);
      if (existing) {
        return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price } : i);
      }
      return [...prev, { product_id: p.id, name: p.name, quantity: 1, unit_price: p.price, total: p.price }];
    });
  };

  const removeFromCart = (productId: number) => {
    setPosCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const updateCartQty = (productId: number, qty: number) => {
    if (qty < 1) return;
    setPosCart(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty, total: qty * i.unit_price } : i));
  };

  const posTotal = posCart.reduce((sum, i) => sum + i.total, 0);

  const checkout = async () => {
    if (posCart.length === 0) { addToast(t('staffDashboard.toastPosEmptyCart'), 'error'); return; }
    try {
      await api.post('/api/tenant/sales', {
        items: posCart,
        total: posTotal,
        payment_method: posPaymentMethod,
        client_name: posClientName,
        client_phone: posClientPhone,
        notes: posNotes,
      });
      addToast(t('staffDashboard.toastPosSaleCreated'), 'success');
      setPosCart([]);
      setPosClientName('');
      setPosClientPhone('');
      setPosNotes('');
      refreshProducts();
    } catch (e: any) { addToast(e?.message || t('staffDashboard.toastPosSaleError'), 'error'); }
  };

  return (
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.posTitle')}</h3>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 400px' }}>
          <input type="text" className="glass-input" placeholder={t('staffDashboard.posSearchPlaceholder')} value={posSearch} onChange={e => setPosSearch(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {products.filter(p => p.active && (p.stock < 1 || p.name.toLowerCase().includes(posSearch.toLowerCase()))).length === 0 && posSearch ? (
              <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>{t('staffDashboard.posNoResults')}</p>
            ) : products.filter(p => p.active && (!posSearch || p.name.toLowerCase().includes(posSearch.toLowerCase()))).map(p => (
              <div key={p.id} onClick={() => p.stock > 0 && addToCart(p)} style={{
                background: p.stock > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.08)',
                borderRadius: 10, padding: 12, cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                border: '1px solid rgba(99,102,241,0.15)', opacity: p.stock > 0 ? 1 : 0.5,
              }}>
                {p.image_url && (
                  <img src={p.image_url} alt="" style={{ width: '100%', height: 80, borderRadius: 6, objectFit: 'cover', marginBottom: 8 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{p.name}</div>
                <div className="fs-17" style={{ fontWeight: 700, color: '#c8827d', marginTop: 4 }}>${p.price}</div>
                <div className="fs-12" style={{ color: p.stock <= p.min_stock ? '#fca5a5' : '#64748b', marginTop: 4 }}>{t('staffDashboard.posStock', { stock: p.stock })}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: '1 1 300px' }}>
          <div className="glass-panel" style={{ padding: 16, marginBottom: 12 }}>
            <h4 style={{ margin: '0 0 12px', color: '#e2e8f0' }}>{t('staffDashboard.posCartTitle', { count: posCart.length })}</h4>
            {posCart.length === 0 ? (
              <p className="fs-14">{t('staffDashboard.posCartEmpty')}</p>
            ) : (
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                {posCart.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                    <div style={{ flex: 1 }}>
                      <div className="fs-14" style={{ fontWeight: 600 }}>{item.name}</div>
                      <div className="fs-12" style={{ color: '#94a3b8' }}>{t('staffDashboard.posUnitPrice', { price: item.unit_price })}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button className="dash-btn" onClick={() => updateCartQty(item.product_id, item.quantity - 1)}>-</button>
                      <span className="fs-14" style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                      <button className="dash-btn" onClick={() => updateCartQty(item.product_id, item.quantity + 1)}>+</button>
                    </div>
                    <div className="fs-14" style={{ fontWeight: 700, minWidth: 60, textAlign: 'right' }}>${item.total.toFixed(2)}</div>
                    <button className="dash-btn dash-btn-danger" onClick={() => removeFromCart(item.product_id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.2)' }}>
              <span style={{ fontWeight: 700 }}>{t('staffDashboard.posTotal')}</span>
              <span className="fs-21" style={{ fontWeight: 700, color: '#c8827d' }}>${posTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <input type="text" className="glass-input" placeholder={t('staffDashboard.posClientPlaceholder')} value={posClientName} onChange={e => setPosClientName(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
            <PhoneInput value={posClientPhone} onChange={setPosClientPhone} placeholder={t('staffDashboard.posPhonePlaceholder')} className="glass-input" style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <select className="glass-input" value={posPaymentMethod} onChange={e => setPosPaymentMethod(e.target.value as any)} style={{ width: '100%' }}>
              <option value="cash">{t('staffDashboard.posPaymentCash')}</option>
              <option value="card">{t('staffDashboard.posPaymentCard')}</option>
              <option value="mp">{t('staffDashboard.posPaymentMP')}</option>
            </select>
          </div>

          <textarea className="glass-input" placeholder={t('staffDashboard.posNotesPlaceholder')} value={posNotes} onChange={e => setPosNotes(e.target.value)} style={{ width: '100%', minHeight: 50, marginBottom: 12 }} />

          <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} onClick={checkout} disabled={posCart.length === 0}>
            {t('staffDashboard.posCheckout', { total: posTotal.toFixed(2) })}
          </button>
        </div>
      </div>
    </div>
  );
}
