import { useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Share2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  slug: string;
  services: { id: number; name: string }[];
  onClose: () => void;
}

export default function SalonQR({ slug, services, onClose }: Props) {
  const { t } = useTranslation();
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
      } catch { /* silent */ }
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
      <div className="glass-panel w-full p-32 max-w-340" onClick={e => e.stopPropagation()}>
        <div className="flex-between mb-20">
          <h3 className="text-gradient m-0 fs-19">{t('common.shareSalon')}</h3>
          <button onClick={onClose} className="dash-close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 21, cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div className="text-center">
          <div ref={canvasRef}>
            <QRCodeCanvas value={url} size={200} bgColor="var(--bg-deep)" fgColor="var(--primary)" level="M" />
          </div>
          <div className="flex-center-center gap-8 mt-16">
            <button onClick={download} className="dash-btn dash-btn-primary fs-13 px-14 py-8"><Download size={14} className="mr-8 vertical-align-middle" />{t('common.download')}</button>
            <button onClick={share} className="dash-btn btn btn-secondary fs-13 px-14 py-8"><Share2 size={14} className="mr-8 vertical-align-middle" />{t('common.share')}</button>
          </div>
          <p className="text-muted fs-14 mt-16 word-break-all">{url}</p>
          {services.length > 0 && (
            <div className="mt-12 text-left">
              <label className="text-muted fs-14 block mb-4">{t('common.quickServiceOptional')}</label>
              <select
                value={selectedServiceId ?? ''}
                onChange={e => setSelectedServiceId(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: 15, cursor: 'pointer',
                }}
              >
                <option value="">{t('salonQR.noService')}</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-center-center gap-10 flex-wrap mt-16">
            <button onClick={download} className="dash-btn dash-btn-primary fs-14 px-18 py-8">{t('common.downloadQR')}</button>
            {typeof navigator.share === 'function' ? (
              <button onClick={share} className="dash-btn btn btn-secondary fs-14 px-18 py-8 no-underline">{t('common.share')}</button>
            ) : (
              <button onClick={share} className="dash-btn btn btn-secondary fs-14 px-18 py-8 no-underline">{t('common.copyLink')}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}