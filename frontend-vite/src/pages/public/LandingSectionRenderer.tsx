import DOMPurify from 'dompurify';
import ScrollReveal from '../../components/ScrollReveal';
import LandingHeroSection from './LandingHeroSection';
import LandingServicesSection from './LandingServicesSection';
import LandingReviewsSection from './LandingReviewsSection';
import LandingGallerySection from './LandingGallerySection';
import LandingTeamSection from './LandingTeamSection';
import LandingBookingSection from './LandingBookingSection';
import LandingHoursSection from './LandingHoursSection';
import type { LayoutBlock, ReviewItem, ServiceImage, ServiceItem, SlotItem, StaffMember, TenantData, TeamItem } from './LandingTypes';

interface Props {
  layout: LayoutBlock[];
  tenant: TenantData;
  services: ServiceItem[];
  reviews: ReviewItem[];
  gallery: string[];
  team: TeamItem[];
  staff: StaffMember[];
  fixImageUrl: (url: string | null | undefined) => string;
  onOpenLightbox: (idx: number | null) => void;
  onSelectService: (serviceId: number) => void;
  onSelectStaff: (id: number) => void;
  onOpenServiceLightbox: (images: ServiceImage[], idx: number) => void;
  slots: SlotItem[];
  slotsTimeout: boolean;
  step: number;
  selectedStaff: number | null;
  selectedService: number | null;
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientNotes: string;
  couponCode: string;
  couponDiscount: { valid: boolean; discount_amount?: number; final_price?: number; error?: string } | null;
  msg: string;
  errMsg: string;
  isQuickBook: boolean;
  quickBookError: boolean;
  tenantSlug: string;
  calMonth: number;
  calYear: number;
  today: string;
  monthNames: string[];
  dayNames: string[];
  daysInMonth: (m: number, y: number) => number;
  firstDayOfMonth: (m: number, y: number) => number;
  onSetStep: (step: number) => void;
  onSetSelectedStaff: (id: number | null) => void;
  onSetSelectedService: (id: number | null) => void;
  onSetSelectedDate: (date: string) => void;
  onSetSelectedTime: (time: string) => void;
  onSetClientName: (v: string) => void;
  onSetClientPhone: (v: string) => void;
  onSetClientEmail: (v: string) => void;
  onSetClientNotes: (v: string) => void;
  onSetCouponCode: (v: string) => void;
  onSetCouponDiscount: (v: { valid: boolean; discount_amount?: number; final_price?: number; error?: string } | null) => void;
  onSetCalMonth: (m: number) => void;
  onSetCalYear: (y: number) => void;
  onFetchSlots: () => void;
  onSubmit: () => void;
  recurringEnabled: boolean;
  recurringFrequency: string;
  recurringCount: number;
  onSetRecurringEnabled: (v: boolean) => void;
  onSetRecurringFrequency: (v: string) => void;
  onSetRecurringCount: (v: number) => void;
  captchaEnabled: boolean;
  captchaSiteKey: string;
  captchaToken: string;
  onSetCaptchaToken: (v: string) => void;
  showWaitlistForm: boolean;
  waitlistMsg: string;
  waitlistErr: string;
  onSetShowWaitlistForm: (v: boolean) => void;
  onJoinWaitlist: () => void;
}

export default function LandingSectionRenderer({
  layout, tenant, services, reviews, gallery, team, staff, fixImageUrl,
  onOpenLightbox, onSelectService, onSelectStaff, onOpenServiceLightbox,
  slots, slotsTimeout, step, selectedStaff, selectedService, selectedDate, selectedTime,
  clientName, clientPhone, clientEmail, clientNotes, couponCode, couponDiscount,
  msg, errMsg, isQuickBook, quickBookError, tenantSlug,
  calMonth, calYear, today, monthNames, dayNames, daysInMonth, firstDayOfMonth,
  onSetStep, onSetSelectedStaff, onSetSelectedService, onSetSelectedDate, onSetSelectedTime,
  onSetClientName, onSetClientPhone, onSetClientEmail, onSetClientNotes,
  onSetCouponCode, onSetCouponDiscount, onSetCalMonth, onSetCalYear, onFetchSlots, onSubmit,
  recurringEnabled, recurringFrequency, recurringCount,
  onSetRecurringEnabled, onSetRecurringFrequency, onSetRecurringCount,
  captchaEnabled, captchaSiteKey, captchaToken, onSetCaptchaToken,
  showWaitlistForm, waitlistMsg, waitlistErr, onSetShowWaitlistForm, onJoinWaitlist,
}: Props) {
  const renderSection = (block: LayoutBlock) => {
    if (!block.enabled) return null;

    switch (block.type) {
      case 'hero':
        return (
          <div key={block.id} id="hero">
            <LandingHeroSection
              businessName={tenant.business_name}
              description={tenant.landing_description}
              heroImage={tenant.landing_hero_image}
              logoUrl={tenant.brand_logo_url}
              fixImageUrl={fixImageUrl}
              category={tenant.category}
            />
          </div>
        );

      case 'services':
        return (
          <section key={block.id} id="servicios">
            <ScrollReveal>
              <div className="section-divider wide" />
            </ScrollReveal>
            <ScrollReveal delay={2}>
              <LandingServicesSection
                services={services}
                fixImageUrl={fixImageUrl}
                onSelectService={onSelectService}
                onOpenServiceLightbox={onOpenServiceLightbox}
              />
            </ScrollReveal>
          </section>
        );

      case 'reviews':
        return reviews.length > 0 ? (
          <section key={block.id} id="resenas">
            <LandingReviewsSection reviews={reviews} />
          </section>
        ) : null;

      case 'gallery':
        return gallery.length > 0 ? (
          <section key={block.id} id="galeria">
            <LandingGallerySection gallery={gallery} fixImageUrl={fixImageUrl} onOpenLightbox={onOpenLightbox} />
          </section>
        ) : null;

      case 'team':
        return team.length > 0 ? (
          <section key={block.id} id="equipo">
            <ScrollReveal>
              <LandingTeamSection
                team={team}
                staff={staff}
                gallery={[]}
                fixImageUrl={fixImageUrl}
                onSelectStaff={onSelectStaff}
                onOpenLightbox={onOpenLightbox}
              />
            </ScrollReveal>
          </section>
        ) : null;

      case 'booking':
        return (
          <section key={block.id} id="reservar">
            <ScrollReveal>
              <div className="section-divider wide" />
            </ScrollReveal>
            <ScrollReveal delay={1}>
              <LandingBookingSection
                staff={staff}
                services={services}
                onOpenServiceLightbox={onOpenServiceLightbox}
                slots={slots}
                slotsTimeout={slotsTimeout}
                step={step}
                selectedStaff={selectedStaff}
                selectedService={selectedService}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                clientName={clientName}
                clientPhone={clientPhone}
                clientEmail={clientEmail}
                clientNotes={clientNotes}
                couponCode={couponCode}
                couponDiscount={couponDiscount}
                msg={msg}
                errMsg={errMsg}
                isQuickBook={isQuickBook}
                quickBookError={quickBookError}
                tenantSlug={tenantSlug}
                calMonth={calMonth}
                calYear={calYear}
                today={today}
                monthNames={monthNames}
                dayNames={dayNames}
                daysInMonth={daysInMonth}
                firstDayOfMonth={firstDayOfMonth}
                fixImageUrl={fixImageUrl}
                onSetStep={onSetStep}
                onSetSelectedStaff={onSetSelectedStaff}
                onSetSelectedService={onSetSelectedService}
                onSetSelectedDate={onSetSelectedDate}
                onSetSelectedTime={onSetSelectedTime}
                onSetClientName={onSetClientName}
                onSetClientPhone={onSetClientPhone}
                onSetClientEmail={onSetClientEmail}
                onSetClientNotes={onSetClientNotes}
                onSetCouponCode={onSetCouponCode}
                onSetCouponDiscount={onSetCouponDiscount}
                onSetCalMonth={onSetCalMonth}
                onSetCalYear={onSetCalYear}
                onFetchSlots={onFetchSlots}
                onSubmit={onSubmit}
                recurringEnabled={recurringEnabled}
                recurringFrequency={recurringFrequency}
                recurringCount={recurringCount}
                onSetRecurringEnabled={onSetRecurringEnabled}
                onSetRecurringFrequency={onSetRecurringFrequency}
                onSetRecurringCount={onSetRecurringCount}
                captchaEnabled={captchaEnabled}
                captchaSiteKey={captchaSiteKey}
                captchaToken={captchaToken}
                onSetCaptchaToken={onSetCaptchaToken}
                showWaitlistForm={showWaitlistForm}
                waitlistMsg={waitlistMsg}
                waitlistErr={waitlistErr}
                onSetShowWaitlistForm={onSetShowWaitlistForm}
                onJoinWaitlist={onJoinWaitlist}
              />
            </ScrollReveal>
          </section>
        );

      case 'hours':
        return (
          <section key={block.id} id="horarios">
            <LandingHoursSection openingHours={tenant.opening_hours as Record<string, unknown> | null} />
          </section>
        );

      case 'custom':
        return (
          <section key={block.id} id={block.id}>
            {block.title && <h2 className="section-title">{block.title}</h2>}
            <div className="custom-block-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content || '', { ADD_TAGS: ['iframe'], ADD_ATTR: ['src', 'width', 'height', 'style', 'allowfullscreen', 'loading', 'frameborder', 'allow', 'title', 'referrerpolicy'] }) }} />
          </section>
        );

      default:
        return null;
    }
  };

  return <>{layout.map(renderSection)}</>;
}
