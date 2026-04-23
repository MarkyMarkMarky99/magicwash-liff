import { useTranslation } from 'react-i18next';

export default function SubmitButton({
  form,
  onClick,
  disabled = false,
  isSubmitting = false,
  isSuccess = false,
  idleIcon        = 'how_to_reg',
  idleLabelKey    = 'register.submit',
  submittingIcon  = 'sync',
  submittingLabelKey = 'register.registering',
  successIcon     = 'check_circle',
  successLabelKey = 'register.success',
}) {
  const { t } = useTranslation();

  const icon  = isSuccess ? successIcon  : isSubmitting ? submittingIcon  : idleIcon;
  const label = isSuccess ? successLabelKey : isSubmitting ? submittingLabelKey : idleLabelKey;
  const spin  = isSubmitting && !isSuccess;

  return (
    <button
      form={onClick ? undefined : form}
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled || isSubmitting || isSuccess}
      className={[
        'w-full mt-6 py-4 rounded-full',
        'flex items-center justify-center gap-2',
        'font-headline text-base font-bold',
        'transition-all duration-150',
        'shadow-[0_4px_16px_rgba(0,79,69,0.25)]',
        'bg-primary text-on-primary',
        'hover:brightness-110 active:scale-[0.98]',
        'disabled:opacity-60 disabled:cursor-not-allowed',
      ].join(' ')}
    >
      <span className={`material-symbols-outlined text-[20px]${spin ? ' animate-spin' : ''}`}>
        {icon}
      </span>
      {t(label)}
    </button>
  );
}
