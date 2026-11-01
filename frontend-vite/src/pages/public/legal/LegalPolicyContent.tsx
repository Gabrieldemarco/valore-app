import { useTranslation } from 'react-i18next';
import { legalContent, type LegalDocument, type LegalLanguage } from './legalContent';

const SUPPORTED_LANGUAGES: LegalLanguage[] = ['es', 'en', 'pt'];

export default function LegalPolicyContent({ document }: { document: LegalDocument }) {
  const { i18n, t } = useTranslation();
  const requestedLanguage = (i18n.resolvedLanguage || i18n.language).split('-')[0] as LegalLanguage;
  const language = SUPPORTED_LANGUAGES.includes(requestedLanguage) ? requestedLanguage : 'es';

  return (
    <>
      {legalContent[language][document].map((section, index) => (
        <section key={section.title}>
          {index > 0 && <hr />}
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={`${section.title}-paragraph-${paragraphIndex}`}>{paragraph}</p>
          ))}
          {section.lists?.map((list, listIndex) => (
            <ul key={`${section.title}-list-${listIndex}`}>
              {list.map((item, itemIndex) => <li key={`${section.title}-item-${listIndex}-${itemIndex}`}>{item}</li>)}
            </ul>
          ))}
          {section.email && (
            <p>{t('common.emailLabel')}: <a href={`mailto:${section.email}`}>{section.email}</a></p>
          )}
        </section>
      ))}
    </>
  );
}
