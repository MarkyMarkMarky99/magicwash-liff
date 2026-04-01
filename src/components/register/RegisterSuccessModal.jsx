import { useTranslation } from 'react-i18next';
import SuccessModal from '../ui/SuccessModal';

const ROW = ({ label, value }) => (
  <div className="flex gap-3 text-sm font-body">
    <span className="w-16 flex-shrink-0 text-on-surface-variant font-semibold">{label}</span>
    <span className="text-on-surface break-all">{value || '—'}</span>
  </div>
);

/**
 * Props:
 *  - data        {object}    Registered customer data (firstName, lastName, phone, email, address, label)
 *  - onContinue  {function}  Called on close or "Continue" click
 */
export default function RegisterSuccessModal({ data = {}, onContinue }) {
  const { t } = useTranslation();
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || '—';

  return (
    <SuccessModal
      title={<>{t('registerSuccess.line1')}<br />{t('registerSuccess.line2')}</>}
      onClose={onContinue}
      headerInline
      action={
        <button
            onClick={onContinue}
            className="w-full bg-primary text-on-primary font-headline font-bold py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all text-sm shadow-[0_4px_12px_rgba(0,79,69,0.2)] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            {t('registerSuccess.bookAppointment')}
          </button>
      }
    >
      {/* Customer ID */}
      <div className="w-full bg-primary/10 rounded-lg px-3 py-2 mb-2 text-center border border-primary/20">
        <p className="text-xs font-label font-semibold text-primary/70 uppercase tracking-wider mb-0.5">
          {t('registerSuccess.customerId')}
        </p>
        <p className="text-2xl font-headline font-bold text-primary tracking-wide">
          {data.label || data.customerId || '—'}
        </p>
      </div>

      {/* Customer info */}
      <div className="w-full bg-surface-container rounded-lg px-3 py-2 flex flex-col gap-1.5 border border-outline-variant/30 text-left">
        <ROW label={t('labels.name')}    value={fullName} />
        <ROW label={t('labels.phone')}   value={data.phone} />
        <ROW label={t('labels.email')}   value={data.email} />
        <ROW label={t('labels.address')} value={data.address} />
      </div>
    </SuccessModal>
  );
}
