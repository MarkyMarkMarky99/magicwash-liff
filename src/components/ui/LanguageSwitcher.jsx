import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isEN = i18n.language === 'en';

  const toggle = () => {
    const next = isEN ? 'th' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 bg-on-primary/20 hover:bg-on-primary/30 rounded-full px-2.5 py-1 transition-colors"
      aria-label="Toggle language"
    >
      <span className="material-symbols-outlined text-on-primary text-[14px]">translate</span>
      <span className="font-label text-[11px] font-bold text-on-primary">{isEN ? 'EN' : 'TH'}</span>
    </button>
  );
}
