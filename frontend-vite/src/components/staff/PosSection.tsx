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
    } catch (e: unknown) { addToast(e instanceof Error ? e.message : t('staffDashboard.toastPosSaleError'), 'error'); }
  };

  return (
    <div className="glass-panel section-card">
      <div className="flex-between mb-20">
        <h3 className="text-gradient m-0">{t('staffDashboard.posTitle')}</h3>
      </div>
      <div className="flex flex-gap-24 flex-wrap">
        <div style={{ flex: '2 1 400px' }}>
          <input type="text" className="glass-input mb-12 w-full" placeholder={t('staffDashboard.posSearchPlaceholder')} value={posSearch} onChange={e => setPosSearch(e.target.value)} />
          <div className="grid-auto-fill-140 overflow-y-auto max-h-400">
            {products.filter(p => p.active && (p.stock < 1 || p.name.toLowerCase().includes(posSearch.toLowerCase()))).length === 0 && posSearch ? (
              <p className="text-muted grid-full">{t('staffDashboard.posNoResults')}</p>
            ) : products.filter(p => p.active && (!posSearch || p.name.toLowerCase().includes(posSearch.toLowerCase()))).map(p => (
              <div key={p.id} onClick={() => p.stock > 0 && addToCart(p)} style={{
                background: p.stock > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.08)',
                borderRadius: 10, padding: 12, cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                border: '1px solid rgba(99,102,241,0.15)', opacity: p.stock > 0 ? 1 : 0.5,
              }}>
                {p.image_url && (
                  <img src={p.image_url} alt="" className="w-full mb-8 h-80 rounded-6 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="font-600 text-border">{p.name}</div>
                <div className="fs-17 font-700 text-primary mt-4">${p.price}</div>
                <div className="fs-12 mt-4" style={{ color: p.stock <= p.min_stock ? 'var(--danger-light)' : 'var(--text-secondary)' }}>{t('staffDashboard.posStock', { stock: p.stock })}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-300">
          <div className="glass-panel p-16 mb-12">
            <h4 className="m-0 mb-12 text-border">{t('staffDashboard.posCartTitle', { count: posCart.length })}</h4>
            {posCart.length === 0 ? (
              <p className="fs-14">{t('staffDashboard.posCartEmpty')}</p>
            ) : (
              <div className="overflow-y-auto max-h-250">
                {posCart.map((item, idx) => (
                  <div key={idx} className="flex-center flex-gap-8" style={{ padding: '6px 0', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                    <div className="flex-1">
                      <div className="fs-14 font-600">{item.name}</div>
                      <div className="fs-12 text-secondary">{t('staffDashboard.posUnitPrice', { price: item.unit_price })}</div>
                    </div>
                    <div className="flex-center flex-gap-4">
                      <button className="dash-btn" onClick={() => updateCartQty(item.product_id, item.quantity - 1)}>-</button>
                      <span className="fs-14 text-center minw-20">{item.quantity}</span>
                      <button className="dash-btn" onClick={() => updateCartQty(item.product_id, item.quantity + 1)}>+</button>
                    </div>
                    <div className="fs-14 font-700 text-right minw-60">${item.total.toFixed(2)}</div>
                    <button className="dash-btn dash-btn-danger" onClick={() => removeFromCart(item.product_id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-between mt-12 pt-12" style={{ borderTop: '1px solid rgba(148,163,184,0.2)' }}>
              <span className="font-700">{t('staffDashboard.posTotal')}</span>
              <span className="fs-21 font-700 text-primary">${posTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-12">
            <input type="text" className="glass-input w-full mb-6" placeholder={t('staffDashboard.posClientPlaceholder')} value={posClientName} onChange={e => setPosClientName(e.target.value)} />
            <PhoneInput value={posClientPhone} onChange={setPosClientPhone} placeholder={t('staffDashboard.posPhonePlaceholder')} className="glass-input w-full" />
          </div>

          <div className="mb-12">
            <select className="glass-input w-full" value={posPaymentMethod} onChange={e => setPosPaymentMethod(e.target.value as 'cash' | 'card' | 'mp')}>
              <option value="cash">{t('staffDashboard.posPaymentCash')}</option>
              <option value="card">{t('staffDashboard.posPaymentCard')}</option>
              <option value="mp">{t('staffDashboard.posPaymentMP')}</option>
            </select>
          </div>

          <textarea className="glass-input w-full mb-12 minh-50" placeholder={t('staffDashboard.posNotesPlaceholder')} value={posNotes} onChange={e => setPosNotes(e.target.value)} />

          <button className="btn btn-primary w-full p-14" onClick={checkout} disabled={posCart.length === 0}>
            {t('staffDashboard.posCheckout', { total: posTotal.toFixed(2) })}
          </button>
        </div>
      </div>
    </div>
  );
}
