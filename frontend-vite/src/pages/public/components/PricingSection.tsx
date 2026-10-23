import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../api/client';

interface PlanPrice {
  plan_name: string;
  price: number | string;
  price_usd?: number | string | null;
  currency?: string | null;
  currency_usd?: string | null;
  promo_price?: number | string | null;
  promo_price_usd?: number | string | null;
  promo_months?: number | null;
  name?: string;
  limits?: {
    staff?: number | null;
    services?: number | null;
    products?: number | null;
    appointmentsPerDay?: number | null;
  };
}

export default function PricingSection() {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [currencyMode, setCurrencyMode] = useState<'local' | 'usd'>('local');

  useEffect(() => {
    api.get<{ prices: PlanPrice[] }>("/api/pricing")
      .then((data) => {
        setPrices(data.prices || []);
      })
      .catch(() => {
        setPrices([]);
      });
  }, []);

  const getPlanInfo = (planKey: string) => {
    const key = planKey.toLowerCase();
    if (key.includes("estandar") || key.includes("standard")) {
      return {
        label: t("publicIndex.pricingPlanStandardLabel") || "Estándar",
        desc: t("publicIndex.pricingPlanStandardDesc") || "Para salones boutique y estudios en crecimiento.",
        isPopular: true,
        features: [
          t("publicIndex.pricingFeatureStaff3") || "Hasta 3 profesionales",
          t("publicIndex.pricingFeatureServices30") || "Hasta 30 servicios y productos",
          t("publicIndex.pricingFeatureUnlimitedBookings") || "Turnos online 24/7 sin límite",
          t("publicIndex.pricingFeatureRemindersFull") || "Recordatorios por WhatsApp y Email",
          t("publicIndex.pricingFeatureClientHistory") || "Fichas e historial de clientes",
          t("publicIndex.pricingFeatureFinancialReports") || "Control de caja y reportes",
          t("publicIndex.pricingFeaturePrioritySupport") || "Soporte prioritario por WhatsApp",
        ],
      };
    }
    if (key.includes("premium")) {
      return {
        label: t("publicIndex.pricingPlanPremiumLabel") || "Premium",
        desc: t("publicIndex.pricingPlanPremiumDesc") || "Para grandes salones, franquicias y spas de alta demanda.",
        isPopular: false,
        features: [
          t("publicIndex.pricingFeatureStaffUnlimited") || "Profesionales y staff ilimitados",
          t("publicIndex.pricingFeatureServicesUnlimited") || "Servicios y productos ilimitados",
          t("publicIndex.pricingFeatureUnlimitedBookings") || "Turnos online 24/7 sin límite",
          t("publicIndex.pricingFeatureRemindersOmnichannel") || "Recordatorios inteligentes multicanal",
          t("publicIndex.pricingFeatureAdvancedAnalytics") || "Métricas avanzadas de ocupación",
          t("publicIndex.pricingFeatureCustomLanding") || "Página web propia con diseño exclusivo",
          t("publicIndex.pricingFeatureVipSupport") || "Soporte VIP 24/7 y asesoría estratégica",
        ],
      };
    }
    return {
      label: t("publicIndex.pricingPlanBasicLabel") || "Básico",
      desc: t("publicIndex.pricingPlanBasicDesc") || "Para profesionales independientes y barberos individuales.",
      isPopular: false,
      features: [
        t("publicIndex.pricingFeatureStaff1") || "1 profesional / barbero",
        t("publicIndex.pricingFeatureServices10") || "Hasta 10 servicios en carta",
        t("publicIndex.pricingFeatureUnlimitedBookings") || "Turnos online 24/7 sin límite",
        t("publicIndex.pricingFeatureRemindersBasic") || "Notificaciones por email",
        t("publicIndex.pricingFeatureClientHistory") || "Fichas de clientes e historial",
      ],
    };
  };

  const formatNumber = (val: number | string | null | undefined) => {
    if (val === null || val === undefined) return "0";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0";
    return num % 1 === 0 ? num.toLocaleString('es-UY') : num.toFixed(2);
  };

  const planMap = new Map(prices.map(p => [p.plan_name?.toLowerCase(), p]));
  const basico = planMap.get("basico") || planMap.get("basic");
  const estandar = planMap.get("estandar") || planMap.get("standard");
  const premium = planMap.get("premium");

  const plans: Array<PlanPrice & { key: string }> = [];
  if (basico) plans.push({ ...basico, key: "basico" });
  if (estandar) plans.push({ ...estandar, key: "estandar" });
  if (premium) plans.push({ ...premium, key: "premium" });

  // Fallback if API hasn't loaded plans yet or returned empty
  if (plans.length === 0) {
    plans.push(
      { plan_name: "basico", price: 400, price_usd: 10, currency: "UYU", promo_price: 280, promo_price_usd: 7, promo_months: 3, key: "basico" },
      { plan_name: "estandar", price: 760, price_usd: 19, currency: "UYU", promo_price: 560, promo_price_usd: 14, promo_months: 3, key: "estandar" },
      { plan_name: "premium", price: 1160, price_usd: 29, currency: "UYU", promo_price: 840, promo_price_usd: 21, promo_months: 3, key: "premium" }
    );
  }

  const hasUsdOption = plans.some(p => p.price_usd != null && Number(p.price_usd) > 0);

  return (
    <section className="pricing-section" id="pricing">
      {/* Decorative top ambient glow line */}
      <div className="pricing-glow-divider" aria-hidden="true" />

      <div className="container pricing-container">
        <div className="pricing-header">
          <span className="pricing-eyebrow">
            {t("publicIndex.pricingEyebrow") || "Planes y Tarifas"}
          </span>
          <h2 className="pricing-title">
            {t("publicIndex.pricingTitle") || "Precios transparentes para tu salón"}
          </h2>
          <p className="pricing-subtitle">
            {t("publicIndex.pricingSubtitle") || "Elegí el plan perfecto para gestionar tus turnos, profesionales y clientes. 15 días de prueba gratis, sin tarjeta de crédito."}
          </p>

          {hasUsdOption && (
            <div className="pricing-currency-toggle" role="group" aria-label="Selector de Moneda">
              <button
                type="button"
                className={`pricing-currency-btn ${currencyMode === 'local' ? 'active' : ''}`}
                onClick={() => setCurrencyMode('local')}
              >
                {t("publicIndex.pricingCurrencyLocal") || "UYU ($)"}
              </button>
              <button
                type="button"
                className={`pricing-currency-btn ${currencyMode === 'usd' ? 'active' : ''}`}
                onClick={() => setCurrencyMode('usd')}
              >
                {t("publicIndex.pricingCurrencyUSD") || "USD ($)"}
              </button>
            </div>
          )}
        </div>

        <div className={`pricing-grid ${plans.length === 2 ? 'pricing-grid--two' : ''}`}>
          {plans.map((plan) => {
            const planInfo = getPlanInfo(plan.plan_name);
            const isUsd = currencyMode === 'usd';

            const rawOriginal = isUsd ? (plan.price_usd ?? plan.price) : plan.price;
            const rawPromo = isUsd ? (plan.promo_price_usd ?? plan.promo_price) : plan.promo_price;

            const hasPromo = rawPromo != null && Number(rawPromo) > 0 && Number(rawPromo) < Number(rawOriginal);
            const priceToShow = hasPromo ? rawPromo : rawOriginal;
            const originalPrice = hasPromo ? rawOriginal : null;

            const numOriginal = originalPrice != null ? Number(originalPrice) : 0;
            const numCurrent = priceToShow != null ? Number(priceToShow) : 0;
            const discountPercent = (numOriginal > 0 && numCurrent > 0 && numOriginal > numCurrent)
              ? Math.round(((numOriginal - numCurrent) / numOriginal) * 100)
              : 0;

            const currencySymbol = isUsd ? "US$" : "$";
            const currencyCode = isUsd ? "USD" : (plan.currency || "UYU");

            return (
              <div
                key={plan.key}
                className={`pricing-card ${planInfo.isPopular ? 'pricing-card--popular' : ''}`}
              >
                {planInfo.isPopular && (
                  <div className="pricing-popular-badge">
                    <span className="badge-sparkle" aria-hidden="true">✨</span>
                    <span>{t("publicIndex.pricingBadgePopular") || "Más Popular"}</span>
                  </div>
                )}

                <div className="pricing-card-top">
                  <div className="pricing-card-title-row">
                    <h3 className="pricing-plan-name">{planInfo.label}</h3>
                    {hasPromo && discountPercent > 0 && (
                      <span className="pricing-discount-chip">
                        -{discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  <p className="pricing-plan-desc">{planInfo.desc}</p>
                </div>

                <div className="pricing-price-box">
                  {hasPromo && plan.promo_months ? (
                    <div className="pricing-promo-banner">
                      <span className="promo-badge-icon" aria-hidden="true">🏷️</span>
                      <span className="promo-badge-text">
                        {t("publicIndex.pricingPromoMonths", { months: plan.promo_months }) || `Promo primeros ${plan.promo_months} meses`}
                      </span>
                    </div>
                  ) : (
                    <div className="pricing-promo-placeholder" aria-hidden="true" />
                  )}

                  <div className="pricing-main-price-row">
                    <span className="pricing-currency-symbol">{currencySymbol}</span>
                    <span className="pricing-price-amount">{formatNumber(priceToShow)}</span>
                    <span className="pricing-price-suffix">
                      <span className="pricing-currency-code">{currencyCode}</span>
                      <span className="pricing-period">{t("publicIndex.pricingPerMonth") || "/mes"}</span>
                    </span>
                  </div>

                  {originalPrice != null && (
                    <div className="pricing-strikethrough-row">
                      <span className="pricing-strike-label">
                        {t("publicIndex.pricingOriginalPrice") || "Antes"}:
                      </span>
                      <del className="pricing-strike-value">
                        {currencySymbol} {formatNumber(originalPrice)} {currencyCode}
                      </del>
                    </div>
                  )}
                </div>

                <div className="pricing-cta-box">
                  <Link
                    to={`/staff/register?plan=${plan.key}`}
                    className={`btn ${planInfo.isPopular ? 'btn-pricing-primary' : 'btn-pricing-outline'}`}
                  >
                    {t("publicIndex.pricingCta") || "Comenzar 15 días gratis"}
                    <svg className="btn-arrow-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                  <p className="pricing-cta-trial-hint">
                    {t("publicIndex.pricingTrialNote") || "15 días gratis • Sin tarjeta requerida • Cancelás cuando quieras"}
                  </p>
                </div>

                <div className="pricing-card-divider" aria-hidden="true" />

                <div className="pricing-features-box">
                  <div className="pricing-features-title">
                    {t("publicIndex.pricingIncludes") || "Todo lo que incluye:"}
                  </div>
                  <ul className="pricing-features-list">
                    {planInfo.features.map((feature, idx) => (
                      <li key={idx} className="pricing-feature-item">
                        <span className="pricing-feature-check" aria-hidden="true">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="pricing-feature-text">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reassuring trust row */}
        <div className="pricing-trust-banner">
          <div className="pricing-trust-item">
            <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>{t("publicIndex.pricingTrustNoContract") || "Sin permanencia ni contratos"}</span>
          </div>
          <div className="pricing-trust-item">
            <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{t("publicIndex.pricingTrustTrial") || "15 días de prueba completa"}</span>
          </div>
          <div className="pricing-trust-item">
            <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>{t("publicIndex.pricingTrustInstant") || "Activación en 2 minutos"}</span>
          </div>
          <div className="pricing-trust-item">
            <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>{t("publicIndex.pricingTrustSupport") || "Soporte personalizado por WhatsApp"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
