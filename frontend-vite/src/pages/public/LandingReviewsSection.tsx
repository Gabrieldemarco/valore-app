import { useTranslation } from 'react-i18next';
import ScrollReveal from '../../components/ScrollReveal';

interface ReviewItem {
  id: number;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface LandingReviewsSectionProps {
  reviews: ReviewItem[];
}

export default function LandingReviewsSection({ reviews }: LandingReviewsSectionProps) {
  const { t } = useTranslation();
  if (reviews.length === 0) return null;
  return (
    <>
      <ScrollReveal>
        <div className="section-divider" />
        <h2 className="section-title">{t('landing.reviewsTitle')}</h2>
      </ScrollReveal>
      <ScrollReveal delay={1}>
        <div className="reviews-summary">
          <span className="reviews-average">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`star ${i < Math.round(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) ? 'filled' : ''}`}>&#9733;</span>
            ))}
            <span className="reviews-score">{(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)}</span>
            <span className="reviews-count">({reviews.length} {t('landing.reviewsCount')})</span>
          </span>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={2}>
        <div className="reviews-list">
          {reviews.slice(0, 6).map(r => (
            <div key={r.id} className="review-card">
              <div className="review-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`star ${i < r.rating ? 'filled' : ''}`}>&#9733;</span>
                ))}
              </div>
              <p className="review-comment">{r.comment}</p>
              <span className="review-author">- {r.client_name}</span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </>
  );
}
