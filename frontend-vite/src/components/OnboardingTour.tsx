import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  beforeEnter?: () => void;
}

interface Props {
  tourId: string;
  steps: TourStep[];
  enabled: boolean;
  onComplete: () => void;
}

const DFlag = (id: string) => `tour_${id}_dismissed`;

export default function OnboardingTour({ tourId, steps, enabled, onComplete }: Props) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [spotRect, setSpotRect] = useState<{ top: number; left: number; width: number; height: number; radius: number } | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const completedRef = useRef(false);
  const scrollingRef = useRef(false);

  const dismissed = localStorage.getItem(DFlag(tourId));

  useEffect(() => {
    if (enabled && !dismissed) setShowButton(true);
  }, [enabled, tourId, dismissed]);

  const updatePosition = useCallback(() => {
    const step = steps[currentStep];
    if (!step || step.target === '') {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: 320,
      });
      setSpotRect(null);
      return;
    }

    const el = document.querySelector(step.target) as HTMLElement;
    if (!el) {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: 320,
      });
      setSpotRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const pos = step.position || 'auto';
    const gap = 10;
    const tooltipH = 180;
    const tooltipW = 280;

    const centerX = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - 16));

    let top = Math.max(gap, Math.min(window.innerHeight - tooltipH, (rect.top + rect.bottom) / 2 - tooltipH / 2));

    if ((pos === 'top' || pos === 'auto') && rect.top >= tooltipH + gap + gap) {
      top = rect.top - tooltipH - gap;
    } else if ((pos === 'bottom' || pos === 'auto') && rect.bottom + gap + tooltipH <= window.innerHeight) {
      top = rect.bottom + gap;
    }

    setTooltipStyle({ position: 'fixed', top, left: centerX, maxWidth: tooltipW });

    const br = parseFloat(getComputedStyle(el).borderRadius) || 6;
    setSpotRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, radius: br });
  }, [currentStep, steps]);

  const scrollAndUpdate = useCallback(() => {
    const step = steps[currentStep];
    if (!step || step.target === '') { updatePosition(); return; }
    const el = document.querySelector(step.target) as HTMLElement;
    if (!el) { updatePosition(); return; }
    scrollingRef.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      scrollingRef.current = false;
      updatePosition();
    }, 450);
  }, [currentStep, steps, updatePosition]);

  useEffect(() => {
    if (!visible) return;
    scrollAndUpdate();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTour(); };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('keydown', onKey);
    };
  }, [visible, scrollAndUpdate, updatePosition]);

  const closeTour = useCallback((completed = false) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setVisible(false);
    if (dontShowAgain || completed) {
      localStorage.setItem(DFlag(tourId), 'true');
      setShowButton(false);
    }
    onComplete();
  }, [dontShowAgain, onComplete, tourId]);

  const openTour = useCallback(() => {
    completedRef.current = false;
    setDontShowAgain(false);
    setCurrentStep(0);
    const step = steps[0];
    if (step?.beforeEnter) step.beforeEnter();
    setVisible(true);
  }, [steps]);

  const goTo = useCallback((idx: number) => {
    const step = steps[idx];
    if (step?.beforeEnter) step.beforeEnter();
    setCurrentStep(idx);
  }, [steps]);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      goTo(currentStep + 1);
    } else {
      closeTour(true);
    }
  }, [currentStep, steps.length, goTo, closeTour]);

  const prev = useCallback(() => {
    if (currentStep > 0) goTo(currentStep - 1);
  }, [currentStep, goTo]);

  if (!enabled) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <>
      {showButton && !visible && (
        <button onClick={openTour} title={t('onboardingTour.trigger', 'Ayuda')} style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent))',
          border: 'none', color: 'var(--bg-deep)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(207,168,107,0.35)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(207,168,107,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(207,168,107,0.35)'; }}
        >
          <HelpCircle size={22} />
        </button>
      )}

      {visible && (
        <>
          <div style={{
            position: 'fixed', inset: 0, zIndex: 99998,
            pointerEvents: 'none',
          }}>
            {spotRect ? (
              <div style={{
                position: 'absolute',
                top: spotRect.top - 4,
                left: spotRect.left - 4,
                width: spotRect.width + 8,
                height: spotRect.height + 8,
                borderRadius: spotRect.radius + 2,
                boxShadow: `
                  0 0 0 3px rgba(207, 168, 107, 0.45),
                  0 0 0 1.5px rgba(207, 168, 107, 0.15) inset,
                  0 0 0 9999px rgba(0, 0, 0, 0.55)
                `,
                transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
              }} />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.55)',
              }} />
            )}
          </div>

          <div style={{
            ...tooltipStyle,
            zIndex: 100000,
            background: 'rgba(20, 20, 25, 0.97)',
            border: '1px solid rgba(207, 168, 107, 0.3)',
            borderRadius: 12,
            padding: '16px 18px 14px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(207,168,107,0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: 'var(--text-main)',
            pointerEvents: 'auto',
            width: 280,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent))',
                color: 'var(--bg-deep)', borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>{currentStep + 1}</span>
              <h3 style={{ flex: 1, margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--accent)', fontFamily: "'Cormorant Garamond', serif" }}>
                {step.title}
              </h3>
              <button onClick={() => closeTour(false)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 0 0 8px',
                transition: 'color 0.2s',
              }} onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}>✕</button>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }}>
              {step.content}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                color: 'rgba(255,255,255,0.45)', fontSize: 11, userSelect: 'none',
              }}>
                <input type="checkbox" checked={dontShowAgain}
                  onChange={e => setDontShowAgain(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }} />
                {t('onboardingTour.dontShowAgain', 'No mostrar más')}
              </label>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {!isFirst && (
                  <button onClick={prev} style={{
                    background: 'transparent', border: '1px solid rgba(207,168,107,0.2)',
                    color: 'var(--accent)', borderRadius: 6, padding: '6px 12px',
                    cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  }}>{t('onboardingTour.back', 'Atrás')}</button>
                )}
                <button onClick={next} style={{
                  background: 'linear-gradient(135deg, var(--accent), var(--accent))',
                  border: 'none', color: 'var(--bg-deep)', borderRadius: 6,
                  padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}>
                  {isLast ? t('onboardingTour.done', 'Finalizar') : t('onboardingTour.next', 'Siguiente')}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 12 }}>
              {steps.map((_, i) => (
                <div key={i} style={{
                  width: i === currentStep ? 16 : 5, height: 5,
                  borderRadius: 2.5,
                  background: i === currentStep ? 'linear-gradient(135deg, var(--accent), var(--accent))' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
