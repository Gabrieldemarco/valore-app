import { useTranslation } from 'react-i18next';
import ScrollReveal from '../../components/ScrollReveal';

interface LandingHoursSectionProps {
  openingHours: Record<string, unknown> | null;
}

export default function LandingHoursSection({ openingHours }: LandingHoursSectionProps) {
  const { t } = useTranslation();
  const startHour = (openingHours?.startHour as number) ?? 9;
  const endHour = (openingHours?.endHour as number) ?? 19;
  const workDays = (openingHours?.workDays as number[]) ?? [1, 2, 3, 4, 5];
  const dayNames = [t('landing.sunday'), t('landing.monday'), t('landing.tuesday'), t('landing.wednesday'), t('landing.thursday'), t('landing.friday'), t('landing.saturday')];
  return (
    <>
      <ScrollReveal>
        <div className="section-divider" />
        <h2 className="section-title">{t('landing.hoursTitle')}</h2>
        <p className="section-subtitle">{t('landing.hoursSubtitle')}</p>
      </ScrollReveal>
      <ScrollReveal delay={1}>
        <div className="hours-table">
          {dayNames.map((name, i) => (
            <div key={i} className="hours-row">
              <span className="hours-day">{name}</span>
              <span className={`hours-time ${workDays.includes(i) ? 'open' : 'closed'}`}>
                {workDays.includes(i) ? `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00` : t('landing.closed')}
              </span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </>
  );
}
