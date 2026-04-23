import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function SignInForm({ onSubmit, isSubmitting, error, onForgotPasswordClick }) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isSubmitting && identifier.trim() && password.trim()) {
      onSubmit({ identifier: identifier.trim(), password: password.trim(), rememberMe });
    }
  };

  return (
    <div className="flex flex-col">

      {/* Form */}
      <form id="signin-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label ml-1">{t('login.identifierLabel')}</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
              <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]">person</span>
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t('login.identifierPlaceholder')}
              className="input-field pl-10"
              autoComplete="username"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="input-label ml-1">{t('login.passwordLabel')}</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
              <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]">lock</span>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              className="input-field pl-10 pr-10 [&:not(:placeholder-shown)]:uppercase [&:not(:placeholder-shown)]:tracking-[0.2em] [&:not(:placeholder-shown)]:font-headline [&:not(:placeholder-shown)]:font-bold"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-on-surface-variant/60 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-error/5 border border-error/10 rounded-lg text-error text-xs font-body">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${rememberMe ? 'bg-primary border-primary shadow-sm shadow-primary/20' : 'border-outline-variant bg-surface group-hover:border-primary/50'
              }`}>
              {rememberMe && (
                <span className="material-symbols-outlined text-on-primary text-[14px] leading-none font-bold">check</span>
              )}
            </div>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm font-medium font-body text-on-surface-variant group-hover:text-on-surface transition-colors">{t('login.rememberMe')}</span>
          </label>
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-sm font-medium font-body text-primary hover:text-primary-container transition-colors"
          >
            {t('login.forgotPassword')}
          </button>
        </div>

      </form>

    </div>
  );
}
