import { useTranslation } from 'react-i18next';

const ROW = ({ label, value }) => (
  <div className="flex gap-3">
    <span className="w-24 shrink-0 font-body font-semibold text-base text-on-surface-variant whitespace-nowrap">{label}</span>
    <span className="font-body text-base text-on-surface break-all">{value || '—'}</span>
  </div>
);

export default function RegisterSuccess({ data = {} }) {
  const { t } = useTranslation();
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || '—';

  return (
    <div className="flex flex-col gap-5">

      <div className="flex items-center gap-5">
        <div className="size-24 rounded-[20px] bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/10">
          <span className="material-symbols-outlined fill-icon text-on-primary text-[40px]">account_circle</span>
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-1">{t('registerSuccess.customerId')}</span>
          <span className="text-3xl font-black text-on-surface mb-2">{data.label || data.customerId || '—'}</span>
          <div className="flex items-center gap-2 text-on-surface-variant/70">
            <span className="material-symbols-outlined text-[16px] shrink-0">account_circle</span>
            <span className="font-body text-sm font-medium truncate">{fullName}</span>
          </div>
        </div>
      </div>

      <div className="card flex flex-col gap-3">
        <p className="text-sm font-bold uppercase tracking-wider text-primary mb-2">{t('bookingSuccess.summary')}</p>
        <ROW label={t('labels.name')}    value={fullName} />
        <ROW label={t('labels.phone')}   value={data.phone} />
        <ROW label={t('labels.email')}   value={data.email} />
        <ROW label={t('labels.address')} value={data.address} />
        {data.password && <ROW label={t('registerSuccess.password')} value={data.password} />}
      </div>

    </div>
  );
}
