import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { registerCustomer, linkLineId, loginCustomer } from '../api/customerApi';
import BookingSheet from '../components/ui/BookingSheet';
import HeroSheet from '../components/layout/HeroSheet';
import FormHeader from '../components/register-line/FormHeader';
import RegisterSuccessView from '../components/register-line/RegisterSuccessView';
import SignInForm from '../components/forms/SignInForm';
import CustomerForm from '../components/forms/CustomerForm';
import SubmitButton from '../components/register-line/SubmitButton';
import SocialButtons from '../components/register-line/SocialButtons';
import WelcomeScreen from '../components/register-line/WelcomeScreen';

const AUTH_KEY = 'mw_auth_customer_id';

export default function RegisterCustomerV2({ onRegisterSuccess, lineProfile }) {
  const { t } = useTranslation();
  const [sheet, setSheet] = useState(null); // null | 'login' | 'signup'

  // ── Registration form state ──
  const [formData, setFormData] = useState(() => {
    const displayName = lineProfile?.displayName ?? '';
    const [firstName = '', ...rest] = displayName.split(' ');
    return {
      phone: '',
      firstName,
      lastName: rest.join(' '),
      email: '',
      address: '',
      lineId: lineProfile?.userId ?? '',
    };
  });

  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [loginError, setLoginError]             = useState(null);
  const [apiError, setApiError]                 = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredData, setRegisteredData]     = useState(null);
  const [showBookingForm, setShowBookingForm]   = useState(false);
  const [isSignupValid, setIsSignupValid]       = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) onRegisterSuccess({ customerId: stored });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──
  const handleLogin = async ({ identifier, password, rememberMe }) => {
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const res = await loginCustomer(identifier, password);
      if (res.status === 'not_found')        { setLoginError(t('login.errorNotFound'));  return; }
      if (res.status === 'invalid_password') { setLoginError(t('login.errorPassword')); return; }

      if (rememberMe) localStorage.setItem(AUTH_KEY, res.data.customerId);
      if (lineProfile?.userId && !res.data.lineId) {
        linkLineId(res.data.customerId, lineProfile.userId).catch(() => {});
      }
      onRegisterSuccess(res.data);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);
    try {
      const res = await registerCustomer({ ...formData });
      if (res.status === 'success') {
        const password = `${res.data.label ?? ''}${formData.phone.slice(-4)}`;
        setRegisteredData({ ...formData, customerId: res.data.uuid, label: res.data.label, password });
        setShowSuccessModal(true);
      } else if (res.existingCustomerId) {
        // Phone already registered but no LINE linked yet — silently link and proceed
        const linkRes = await linkLineId(res.existingCustomerId, formData.lineId);
        if (linkRes.status === 'success') {
          setRegisteredData({ ...formData, customerId: res.existingCustomerId });
          setShowSuccessModal(true);
        } else {
          setApiError(linkRes.message || t('register.error'));
        }
      } else {
        setApiError(res.message || t('register.error'));
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived config ──
  const heroTitle = showSuccessModal ? t('registerSuccess.bgTitle')
    : sheet === 'login'               ? t('login.bgTitle')
    :                                   t('register.bgTitle');
  const heroSubtitle = showSuccessModal ? t('registerSuccess.bgSubtitle')
    : sheet === 'login'                  ? t('login.bgSubtitle')
    :                                      t('register.bgSubtitle');

  const hero = (
    <div className="absolute inset-0 px-8 pt-12 cursor-pointer">
      <h2 className="font-headline font-bold text-4xl text-white leading-tight">{heroTitle}</h2>
      {heroSubtitle && <p className="font-body text-sm text-white/70 mt-1">{heroSubtitle}</p>}
    </div>
  );

  const headerConfig = showSuccessModal
    ? { icon: 'check_circle', title: t('registerSuccess.title'), subtitle: t('registerSuccess.subtitle') }
    : sheet === 'login'
    ? { icon: 'login',        title: t('login.title'),           subtitle: t('login.subtitle')           }
    : { icon: 'how_to_reg',   title: t('register.heading'),      subtitle: t('register.subheading')      };

  const submitConfig = showSuccessModal
    ? { onClick: () => setShowBookingForm(true),                                        idleIcon: 'calendar_month', idleLabelKey: 'registerSuccess.bookAppointment'                                         }
    : sheet === 'login'
    ? { form: 'signin-form',      disabled: isSubmitting, isSubmitting,                idleIcon: 'login',          idleLabelKey: 'login.submit',       submittingLabelKey: 'login.loggingIn'             }
    : { form: 'register-form-v2', disabled: !isSignupValid, isSubmitting,              idleIcon: 'how_to_reg',     idleLabelKey: 'register.submit',    submittingLabelKey: 'register.registering'        };

  const footerConfig = showSuccessModal
    ? { linkText: t('registerSuccess.skipBooking'), onClick: () => onRegisterSuccess(registeredData) }
    : sheet === 'login'
    ? { text: t('login.noAccount'),   linkText: t('login.signupLink'), onClick: () => { setSheet('signup'); setLoginError(null); } }
    : { text: t('register.hasAccount'), linkText: t('login.submit'),   onClick: () => { setSheet('login');  setApiError(null);  } };

  const handleSheetClose = () => {
    setSheet(null);
    setLoginError(null);
    setApiError(null);
    setShowSuccessModal(false);
    setShowBookingForm(false);
  };

  const bookingCustomer = registeredData ? {
    customerId:    registeredData.customerId,
    customerIndex: registeredData.label,
    address:       registeredData.address,
    phone:         registeredData.phone,
    customerName:  `${registeredData.firstName ?? ''} ${registeredData.lastName ?? ''}`.trim(),
  } : null;

  return (
    <>
      <div className="relative h-full flex flex-col overflow-hidden">

        {/* ── Welcome screen ── */}
        <WelcomeScreen
          onLoginClick={() => setSheet('login')}
          onSignupClick={() => setSheet('signup')}
        />

        {/* ── Sheet: login / signup / register success ── */}
        <HeroSheet
          isOpen={sheet !== null}
          onClose={handleSheetClose}
          hero={hero}
          snapHeight="82%"
        >
          <FormHeader {...headerConfig} />

          {sheet === 'login' ? (
            <SignInForm
              onSubmit={handleLogin}
              isSubmitting={isSubmitting}
              error={loginError}
            />
          ) : showSuccessModal ? (
            <RegisterSuccessView data={registeredData} />
          ) : (
            <>
              {apiError && (
                <div className="mb-3 p-3 bg-error/10 border border-error/30 rounded-xl flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0">error</span>
                  <p className="text-error text-sm font-body">{apiError}</p>
                </div>
              )}
              <CustomerForm
                formData={formData}
                onChange={handleFormChange}
                disabled={isSubmitting}
                onSubmit={handleRegister}
                onValidChange={setIsSignupValid}
              />
            </>
          )}

          <SubmitButton {...submitConfig} />

          {footerConfig && (
            <p className="mt-4 text-center text-xs font-body text-on-surface-variant">
              {footerConfig.text && <>{footerConfig.text}{' '}</>}
              <button type="button" onClick={footerConfig.onClick} className="text-primary font-semibold hover:underline">
                {footerConfig.linkText}
              </button>
            </p>
          )}

          {sheet === 'login' && <SocialButtons />}

          {import.meta.env.DEV && !showSuccessModal && sheet !== 'login' && (
            <button
              type="button"
              onClick={() => { setRegisteredData({ firstName: 'Somchai', lastName: 'Jaidee', phone: '0812345678', email: 'somchai@example.com', address: '123 Sukhumvit Rd, Bangkok', customerId: 'mock-uuid-001', label: 'MW042', password: 'MW0425678' }); setShowSuccessModal(true); }}
              className="w-full mt-3 py-2 rounded-xl border border-dashed border-outline-variant text-on-surface-variant text-xs font-body hover:bg-surface-container active:scale-[0.98] transition-all"
            >
              [DEV] Preview RegisterSuccess
            </button>
          )}
        </HeroSheet>

        {/* ── Booking sheet (full-screen overlay, z-50) ── */}
        <BookingSheet
          isOpen={showSuccessModal && showBookingForm}
          onClose={() => setShowBookingForm(false)}
          onDone={() => onRegisterSuccess(registeredData)}
          customer={bookingCustomer}
        />

      </div>
    </>
  );
}
