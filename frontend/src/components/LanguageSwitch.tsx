import { useLanguage } from '../i18n/LanguageContext';

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-switch">
      <button
        onClick={() => setLanguage('ko')}
        className={`lang-btn ${language === 'ko' ? 'active' : ''}`}
        title="한국어"
      >
        🇰🇷
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        title="English"
      >
        🇺🇸
      </button>
    </div>
  );
}
