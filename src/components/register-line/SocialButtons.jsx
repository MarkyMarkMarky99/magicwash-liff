import { useTranslation } from 'react-i18next';

export default function SocialButtons() {
  const { t } = useTranslation();
  return (
    <div className="mt-8">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-outline-variant/50 to-transparent" />
        <span className="font-body text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 shrink-0">{t('login.orDivider')}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-outline-variant/50 to-transparent" />
      </div>
      <p className="text-center font-body text-xs font-medium text-on-surface-variant/60 mt-4 mb-6">{t('login.signInWith')}</p>
      <div className="flex items-center justify-center gap-6">
        <button type="button" aria-label="Facebook"
          className="w-12 h-12 rounded-2xl overflow-hidden hover:opacity-90 active:scale-[0.98] transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" fill="#1877F2" />
            <path fill="white" d="M27 25.5h2.8l.7-4H27v-2.2c0-1.1.5-2.1 2.1-2.1H30v-3.4s-1.3-.2-2.5-.2c-2.9 0-4.8 1.8-4.8 5v2.9H20v4h2.7V35H27V25.5z" />
          </svg>
        </button>
        <button type="button" aria-label="Google"
          className="w-12 h-12 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container-low active:scale-[0.98] transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-outline-variant flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </button>
        <button type="button" aria-label="LINE"
          className="w-12 h-12 rounded-2xl overflow-hidden hover:opacity-90 active:scale-[0.98] transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" fill="#06C755" />
            <path fill="white" d="M39 23.2C39 16.6 32.2 11.2 24 11.2S9 16.6 9 23.2c0 5.9 5.2 10.9 12.3 11.8.5.1 1.1.3 1.3.7.1.4.1.9 0 1.3l-.2 1.1c-.1.4-.3 1.6 1.4.9 1.7-.7 9-5.3 12.3-9.1C38 27.8 39 25.6 39 23.2z" />
            <g fill="#06C755" fontSize="7" fontFamily="Arial" fontWeight="bold">
              <text x="15.5" y="27">LINE</text>
            </g>
          </svg>
        </button>
      </div>
    </div>
  );
}
