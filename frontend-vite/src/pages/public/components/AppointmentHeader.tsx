import type { ReactNode } from 'react';

interface AppointmentHeaderProps {
  t: (key: string) => string;
  slug?: string;
  children?: ReactNode;
}

export default function AppointmentHeader({ t, slug, children }: AppointmentHeaderProps) {
  return (
    <div className="flex-center-center min-h-screen bg-deep" style={{
      fontFamily: 'Outfit, sans-serif',
    }}>
      <div className="w-full max-w-480 p-40 px-20">
        <a href={`/p/${slug}`} className="text-muted no-underline inline-block mb-24">
          {t('appointmentManage.backLink')}
        </a>
        {children}
      </div>
    </div>
  );
}
