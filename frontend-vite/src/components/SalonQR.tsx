import { useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Props {
  slug: string;
  onClose: () => void;
}

export default function SalonQR({ slug, onClose }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}/p/${slug}`;

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
          title: 'Veloré',
          text: 'Reservá tu turno en esta peluquería',
          url,
          files: [new File([blob], `valore-${slug}.png`, { type: 'image/png' })],
        });
        return;
      } catch { /* fallback to copy */ }
    }
    await navigator.clipboard?.writeText(url);
  }, [slug, url]);

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
            <QRCodeCanvas value={url} size={200} bgColor="#0a0a0c" fgColor="#c5a880" level="M" />
          </div>
          <p style={{ color: '#a1a1aa', fontSize: 13, marginTop: 16, wordBreak: 'break-all' }}>{url}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={download} className="dash-btn dash-btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>Descargar QR</button>
            {navigator.share ? (
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
