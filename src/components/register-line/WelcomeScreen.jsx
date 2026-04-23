import { useTranslation } from 'react-i18next';
import SocialButtons from './SocialButtons';

export default function WelcomeScreen({ onLoginClick, onSignupClick }) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 bg-primary flex flex-col px-8 pb-10 relative overflow-hidden select-none">

      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute top-1/3 -left-24 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-24 right-8 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center gap-10 z-10">

        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined fill-icon text-on-primary text-[48px]">local_laundry_service</span>
          </div>
          <div className="text-center">
            <h1 className="font-headline font-bold text-3xl text-on-primary tracking-tight">Magicwash</h1>
            <p className="font-body text-sm text-on-primary/60 mt-1">{t('welcome.tagline')}</p>
          </div>
        </div>

        <div className="w-full space-y-3">
          <h2 className="font-headline font-bold text-2xl text-on-primary text-center mb-6">{t('welcome.greeting')}</h2>

          <button
            onClick={onLoginClick}
            className="w-full type-btn py-3.5 rounded-2xl uppercase bg-surface-container-lowest text-primary hover:bg-surface-container active:scale-[0.98] transition-all shadow-lg"
          >
            {t('login.submit')}
          </button>

          <button
            onClick={onSignupClick}
            className="w-full type-btn py-3.5 rounded-2xl uppercase border-2 border-white/50 text-on-primary hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            {t('login.signupLink')}
          </button>

          <div className="pt-3">
            <p className="text-center font-body text-xs text-on-primary/50 mb-3">{t('login.signInWith')}</p>
            <SocialButtons />
          </div>
        </div>
      </div>
    </div>
  );
}
