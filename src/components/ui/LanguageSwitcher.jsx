import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isEN = i18n.language === 'en';

  const setLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <div className="flex bg-white/20 backdrop-blur-md rounded-full p-0.5 border border-white/30 shadow-md">
      <button
        onClick={() => setLang('en')}
        className={`w-6 h-6 rounded-full text-xs font-bold font-label transition-all duration-200 ${isEN ? 'bg-white/90 text-primary shadow-sm' : 'text-white/70 hover:text-white'
          }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('th')}
        className={`w-6 h-6 rounded-full text-xs font-bold font-label transition-all duration-200 ${!isEN ? 'bg-white/90 text-primary shadow-sm' : 'text-white/70 hover:text-white'
          }`}
      >
        TH
      </button>
    </div>
  );
}
