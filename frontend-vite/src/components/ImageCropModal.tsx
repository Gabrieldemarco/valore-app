import { useState, useRef, useEffect } from 'react';

interface ImageCropModalProps {
  open: boolean;
  file: File | null;
  aspectRatio: number;
  onApply: (dataUrl: string, originalFile: File) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ open, file, aspectRatio, onApply, onCancel }: ImageCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [containerSize, setContainerSize] = useState({ w: 500, h: 400 });

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const lastTouchDist = useRef(0);

  useEffect(() => {
    if (!open || !file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setImgLoaded(false);
    setNatural({ w: 1, h: 1 });
    return () => { URL.revokeObjectURL(url); };
  }, [open, file]);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setContainerSize({ w: Math.round(width), h: Math.round(height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  if (!open || !file) return null;

  const baseScale = Math.max(containerSize.w / natural.w, containerSize.h / natural.h);
  const scale = baseScale * zoom;
  const dispW = natural.w * scale;
  const dispH = natural.h * scale;
  const imgX = (containerSize.w - dispW) / 2 + panX;
  const imgY = (containerSize.h - dispH) / 2 + panY;

  const ca = containerSize.w / containerSize.h;
  let cropW: number, cropH: number;
  if (aspectRatio > ca) {
    cropW = containerSize.w;
    cropH = containerSize.w / aspectRatio;
  } else {
    cropH = containerSize.h;
    cropW = containerSize.h * aspectRatio;
  }
  const cropX = (containerSize.w - cropW) / 2;
  const cropY = (containerSize.h - cropH) / 2;

  const onPointerDown = (clientX: number, clientY: number) => {
    dragging.current = true;
    dragStart.current = { x: clientX, y: clientY, px: panX, py: panY };
  };

  const onPointerMove = (clientX: number, clientY: number) => {
    if (!dragging.current) return;
    setPanX(dragStart.current.px + (clientX - dragStart.current.x));
    setPanY(dragStart.current.py + (clientY - dragStart.current.y));
  };

  const onPointerUp = () => { dragging.current = false; };

  const handleImgLoad = () => {
    if (imgRef.current) {
      setNatural({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
      setImgLoaded(true);
    }
  };

  const handleApply = () => {
    if (!imgRef.current || !imgLoaded) return;
    const canvas = document.createElement('canvas');
    const srcX = (cropX - imgX) / scale;
    const srcY = (cropY - imgY) / scale;
    const srcW = cropW / scale;
    const srcH = cropH / scale;
    const outW = Math.round(Math.max(1, srcW));
    const outH = Math.round(Math.max(1, srcH));
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
    onApply(canvas.toDataURL('image/jpeg', 0.92), file);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setZoom(z => Math.max(0.5, Math.min(5, z + delta)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      onPointerDown(t.clientX, t.clientY);
    } else if (e.touches.length === 2) {
      dragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragging.current) {
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist.current > 0) {
        const factor = dist / lastTouchDist.current;
        setZoom(z => Math.max(0.5, Math.min(5, z * factor)));
      }
      lastTouchDist.current = dist;
    }
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    lastTouchDist.current = 0;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.75)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancel}>
      <div style={{
        background: '#1a1a2e', borderRadius: 16, padding: 20, width: 560, maxWidth: '94vw',
        display: 'flex', flexDirection: 'column', gap: 14,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 19 }}>Ajustar imagen</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 21, padding: '4px 8px' }}>✕</button>
        </div>

        <div ref={containerRef} style={{
          width: '100%', height: 380, maxHeight: '50vh',
          overflow: 'hidden', position: 'relative', borderRadius: 10,
          background: '#0a0a14', cursor: dragging.current ? 'grabbing' : 'grab', touchAction: 'none',
        }}
          onMouseDown={e => onPointerDown(e.clientX, e.clientY)}
          onMouseMove={e => onPointerMove(e.clientX, e.clientY)}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {objectUrl && (
            <img
              ref={imgRef}
              src={objectUrl}
              alt=""
              onLoad={handleImgLoad}
              style={{
                position: 'absolute', left: imgX, top: imgY,
                width: dispW, height: dispH,
                pointerEvents: 'none', userSelect: 'none',
                opacity: imgLoaded ? 1 : 0,
              }}
              draggable={false}
            />
          )}
          {!imgLoaded && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 15,
            }}>Cargando imagen...</div>
          )}
          <div style={{
            position: 'absolute', left: cropX, top: cropY,
            width: cropW, height: cropH,
            border: '2px solid rgba(255,255,255,0.8)',
            borderRadius: aspectRatio === 1 ? '50%' : 4,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            pointerEvents: 'none',
          }} />
        </div>

        {imgLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <input type="range" min={0.5} max={5} step={0.05} value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#667eea' }} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span style={{ fontSize: 13, minWidth: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{zoom.toFixed(1)}x</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={{
            padding: '10px 28px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.25)',
            background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 15,
          }}>Cancelar</button>
          <button onClick={handleApply} disabled={!imgLoaded} style={{
            padding: '10px 28px', borderRadius: 8, border: 'none',
            background: imgLoaded ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(148,163,184,0.15)',
            color: imgLoaded ? '#fff' : '#64748b',
            cursor: imgLoaded ? 'pointer' : 'not-allowed',
            fontSize: 15, fontWeight: 600,
          }}>{imgLoaded ? 'Aplicar' : 'Cargando...'}</button>
        </div>
      </div>
    </div>
  );
}
