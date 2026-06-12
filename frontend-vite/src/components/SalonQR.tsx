import { useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Props {
  slug: string;
  services: { id: number; name: string }[];
  onClose: () => void;
}

export default function SalonQR({ slug, services, onClose }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const selectedService = services.find(s => s.id === selectedServiceId);
  const url = `${window.location.origin}/p/${slug}${selectedServiceId ? `?sid=${selectedServiceId}` : ''}`;

  const download = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `valore-${slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [slug]);

  const share = useCallback(async () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(b => r(b), 'image/png'));
    if (!blob) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Velsoie',
          text: `Reservá tu turno en esta peluquería${selectedService ? ` - ${selectedService.name}` : ''}`,
          url,
          files: [new File([blob], `valore-${slug}.png`, { type: 'image/png' })],
        });
        return;
      } catch { /* fallback to copy */ }
    }
    await navigator.clipboard?.writeText(url);
  }, [slug, url, selectedService]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      padding: 20,
    }} onClick={onClose}>
      <div className="glass-panel" style={{ maxWidth: 340, width: '100%', padding: 32 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="text-gradient" style={{ margin: 0, fontSize: 18 }}>Compartir peluquería</h3>
          <button onClick={onClose} className="dash-close-btn" style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div ref={canvasRef}>
            <QRCodeCanvas value={url} size={200} bgColor="#120c0c" fgColor="#c8827d" level="M" />
          </div>
          <p style={{ color: '#a1a1aa', fontSize: 13, marginTop: 16, wordBreak: 'break-all' }}>{url}</p>
          {services.length > 0 && (
            <div style={{ marginTop: 12, textAlign: 'left' }}>
              <label style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginBottom: 4 }}>Servicio rápido (opcional)</label>
              <select
                value={selectedServiceId ?? ''}
                onChange={e => setSelectedServiceId(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: 14, cursor: 'pointer',
                }}
              >
                <option value="">Sin servicio (reserva completa)</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={download} className="dash-btn dash-btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>Descargar QR</button>
            {typeof navigator.share === 'function' ? (
              <button onClick={share} className="dash-btn btn btn-secondary" style={{ fontSize: 13, padding: '8px 18px', textDecoration: 'none' }}>Compartir</button>
            ) : (
              <button onClick={share} className="dash-btn btn btn-secondary" style={{ fontSize: 13, padding: '8px 18px', textDecoration: 'none' }}>Copiar enlace</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}