import { ReactNode } from 'react';

interface LegalSectionProps {
  title: string;
  date: string;
  children: ReactNode;
}

export default function LegalSection({ title, date, children }: LegalSectionProps) {
  return (
    <section className="terms-pane active">
      <article className="terms-card">
        <h1>{title}</h1>
        <div className="terms-date">{date}</div>
        {children}
      </article>
    </section>
  );
}
