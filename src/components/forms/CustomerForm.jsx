import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function isFormValid(f) {
  return !!(f.phone.trim() && f.firstName.trim() && f.email.trim() && f.address.trim());
}

export default function CustomerForm({ formData, onChange, disabled, onSubmit, onValidChange }) {
  useEffect(() => { onValidChange?.(isFormValid(formData)); }, [formData]);

  const { t } = useTranslation();

  return (
    <div className="flex flex-col">
      <form id="register-form-v2" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="input-label ml-1">{t('register.phone')}</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
              <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]">phone</span>
            </div>
            <input
              type="tel" name="phone" value={formData.phone} onChange={onChange}
              required disabled={disabled} placeholder="0812345678"
              pattern="^0\d{9}$"
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label ml-1">{t('register.firstName')}</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]">person</span>
              </div>
              <input
                type="text" name="firstName" value={formData.firstName} onChange={onChange}
                required disabled={disabled} placeholder={t('register.firstNamePlaceholder')}
                className="input-field pl-10 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="input-label ml-1">{t('register.lastName')}</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]">person</span>
              </div>
              <input
                type="text" name="lastName" value={formData.lastName} onChange={onChange}
                disabled={disabled} placeholder={t('register.lastNamePlaceholder')}
                className="input-field pl-10 text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="input-label ml-1">{t('register.email')}</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
              <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]">mail</span>
            </div>
            <input
              type="email" name="email" value={formData.email} onChange={onChange}
              required disabled={disabled} placeholder="example@email.com"
              className="input-field pl-10"
            />
          </div>
        </div>

        <div>
          <label className="input-label ml-1">{t('register.address')}</label>
          <div className="relative group rounded-2xl border border-outline-variant/40 bg-transparent transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
            <div className="absolute top-3 left-0 pl-3 pointer-events-none transition-colors group-focus-within:text-primary">
              <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]">location_on</span>
            </div>
            <textarea
              name="address" value={formData.address} onChange={onChange}
              required disabled={disabled}
              placeholder={t('register.addressPlaceholder')}
              className="w-full pl-11 pr-4 py-3 h-[72px] resize-none bg-transparent font-body text-lg text-on-surface outline-none placeholder:text-on-surface-variant/45 disabled:opacity-50"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
