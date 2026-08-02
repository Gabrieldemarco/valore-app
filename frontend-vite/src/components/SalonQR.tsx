import { useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Share2, Download, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
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

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }, [url]);

  const share = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('salonQR.shareTitle'),
          text: `${t('salonQR.shareText')}${selectedService ? ` - ${selectedService.name}` : ''}`,
          url,
        });
        return;
      } catch { /* user cancelled or error */ }
    }
    await copyLink();
  }, [t, url, selectedService, copyLink]);

  const canShare = typeof navigator.share === 'function';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      padding: 20,
    }} onClick={onClose}>
      <div className="glass-panel w-full p-32 max-w-340" onClick={e => e.stopPropagation()}>
        <div className="flex-between mb-20">
          <h3 className="text-gradient m-0 fs-19">{t('salonQR.title')}</h3>
          <button onClick={onClose} className="dash-close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 21, cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div className="text-center">
          <div ref={canvasRef}>
            <QRCodeCanvas value={url} size={200} bgColor="var(--bg-deep)" fgColor="var(--primary)" level="M" />
          </div>
          {services.length > 0 && (
            <div className="mt-16 text-left">
              <label className="text-muted fs-14 block mb-4">{t('salonQR.quickServiceLabel')}</label>
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
          <div className="flex-center-center gap-10 flex-wrap mt-20">
            <button onClick={download} className="dash-btn dash-btn-primary fs-14 px-18 py-8">
              <Download size={14} className="mr-8 vertical-align-middle" />{t('salonQR.downloadButton')}
            </button>
            <button onClick={share} className="dash-btn btn btn-secondary fs-14 px-18 py-8 no-underline">
              {copied
                ? <><Check size={14} className="mr-8 vertical-align-middle" />{t('salonQR.linkCopied')}</>
                : <><Share2 size={14} className="mr-8 vertical-align-middle" />{canShare ? t('salonQR.shareButton') : t('salonQR.copyLinkButton')}</>}
            </button>
          </div>
          <p className="text-muted fs-14 mt-16 word-break-all">{url}</p>
        </div>
      </div>
    </div>
  );
}
