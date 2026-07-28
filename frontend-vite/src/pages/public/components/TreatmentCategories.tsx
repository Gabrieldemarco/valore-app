import { useTranslation } from 'react-i18next';

interface CategoryItem {
  key: string;
  label: string;
  image: string;
}

interface TreatmentCategoriesProps {
  categories: CategoryItem[];
  activeCategory: string;
  onCategoryClick: (key: string) => void;
}

export default function TreatmentCategories({ categories, activeCategory, onCategoryClick }: TreatmentCategoriesProps) {
  const { t } = useTranslation();
  return (
    <section className="service-cards-section">
      <div className="container">
        <h2 className="section-title text-center mb-8">{t('publicIndex.treatmentsTitle')}</h2>
        <p className="section-subtitle text-center mb-32">{t('publicIndex.treatmentsSubtitle')}</p>
        <div className="service-cards-grid">
          {categories.map(cat => (
            <div
              key={cat.key}
              className={`service-card${activeCategory === cat.key ? ' active' : ''}`}
              onClick={() => onCategoryClick(cat.key)}
            >
              <img src={cat.image} alt={cat.label} className="service-card-image" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
