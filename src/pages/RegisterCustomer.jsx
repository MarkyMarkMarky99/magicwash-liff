import { useState, useEffect } from 'react';
import { registerCustomer, linkLineId } from '../api/customerApi';
import PageLayout from '../components/layout/PageLayout';
import SuccessModal from '../components/ui/SuccessModal';

export default function RegisterCustomer({ onRegisterSuccess, lineProfile }) {
  const [formData, setFormData] = useState(() => {
    const displayName = lineProfile?.displayName ?? '';
    const [firstName = '', ...rest] = displayName.split(' ');
    return {
      firstName,
      lastName: rest.join(' '),
      email: '',
      phone: '',
      address: '',
      lineId: lineProfile?.userId ?? '',
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [apiError, setApiError] = useState(null);
  const [registeredData, setRegisteredData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await registerCustomer(formData);

      if (res.status === 'success') {
        setRegisteredData({ ...formData, customerId: res.data.uuid });
        setShowSuccessModal(true);
      } else if (res.status === 'error' && res.existingCustomerId) {
        // Phone exists but no LINE account linked yet — silently link and proceed
        const linkRes = await linkLineId(res.existingCustomerId, formData.lineId);
        if (linkRes.status === 'success') {
          setRegisteredData({ ...formData, customerId: res.existingCustomerId });
          setShowSuccessModal(true);
        } else {
          setApiError(linkRes.message || 'Failed to link LINE account');
        }
      } else {
        setApiError(res.message || 'Registration failed');
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!showSuccessModal) return;
    if (countdown === 0) {
      onRegisterSuccess(registeredData || formData);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showSuccessModal, countdown, onRegisterSuccess, registeredData, formData]);

  const inputClass = `w-full bg-surface-container border border-outline-variant/30 rounded-xl py-2.5 pr-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder:text-on-surface-variant/60 text-on-surface font-body text-sm transition-colors disabled:opacity-60`;

  const footer = (
    <button
      form="register-form" type="submit" disabled={isLoading}
      className={`w-full font-headline font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
        isLoading
          ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
          : 'bg-primary hover:brightness-110 text-on-primary shadow-[0_4px_12px_rgba(0,79,69,0.2)] active:scale-[0.98]'
      }`}
    >
      {isLoading ? (
        <>
          <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
          Registering…
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
          Register Account
        </>
      )}
    </button>
  );

  return (
    <>
      {showSuccessModal && (
        <SuccessModal
          title={<>Registration<br />Successful!</>}
          action={
            <button
              onClick={() => onRegisterSuccess(registeredData || formData)}
              className="w-full text-on-surface-variant font-semibold py-3 rounded-xl hover:bg-surface-container transition-colors text-sm font-body"
            >
              Skip &amp; Continue
            </button>
          }
        >
          <p className="text-on-surface-variant text-sm font-body mb-4">Your account has been created.</p>
          <div className="w-full bg-surface-container rounded-2xl p-4 flex flex-col items-center border border-outline-variant/30">
            <span className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold font-label">Redirecting in</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-headline font-bold text-primary">{countdown}</span>
              <span className="text-on-surface-variant font-medium">s</span>
            </div>
          </div>
        </SuccessModal>
      )}

      <PageLayout title="New Customer" footer={footer}>
        <div className="px-5 pt-6 pb-4">

        {apiError && (
          <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-error text-[18px] mt-0.5 flex-shrink-0">error</span>
            <p className="text-error text-sm font-body">{apiError}</p>
          </div>
        )}

        {/* Avatar + title */}
        <div className="mb-5 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-primary text-[36px]">person_add</span>
          </div>
          <h2 className="text-xl font-headline font-bold text-primary mb-1">Create Account</h2>
          <p className="text-on-surface-variant font-body text-sm">Please enter your details to register.</p>
        </div>

        <form id="register-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-primary font-headline font-bold text-xs mb-1.5">First Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant text-[16px]">person</span>
                </div>
                <input
                  type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                  required disabled={isLoading} placeholder="John"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
            <div>
              <label className="block text-primary font-headline font-bold text-xs mb-1.5">Last Name</label>
              <input
                type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                required disabled={isLoading} placeholder="Doe"
                className={`${inputClass} px-4`}
              />
            </div>
          </div>

          <div>
            <label className="block text-primary font-headline font-bold text-xs mb-1.5">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">mail</span>
              </div>
              <input
                type="email" name="email" value={formData.email} onChange={handleChange}
                required disabled={isLoading} placeholder="john.doe@example.com"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className="block text-primary font-headline font-bold text-xs mb-1.5">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">phone</span>
              </div>
              <input
                type="tel" name="phone" value={formData.phone} onChange={handleChange}
                required disabled={isLoading} placeholder="+66 81 234 5678"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className="block text-primary font-headline font-bold text-xs mb-1.5">Address</label>
            <div className="relative">
              <div className="absolute top-3 left-0 pl-3 pointer-events-none">
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">location_on</span>
              </div>
              <textarea
                name="address" value={formData.address} onChange={handleChange}
                required disabled={isLoading}
                placeholder="Street, city, and postal code..."
                className={`${inputClass} pl-9 h-[72px] resize-none`}
              />
            </div>
          </div>
        </form>
        </div>
      </PageLayout>
    </>
  );
}
