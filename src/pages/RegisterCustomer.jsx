import { useState, useEffect } from 'react';
import { registerCustomer, linkLineId } from '../api/customerApi';

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
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [apiError, setApiError] = useState(null);
  const [registeredData, setRegisteredData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fillMockData = () => {
    setFormData({
      firstName: 'Somchai',
      lastName: 'Rakdee',
      email: 'somchai.r@example.com',
      phone: '0812345678',
      address: '99/9 หมู่ 1 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    });
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
    let timer;
    if (showSuccessModal && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    } else if (showSuccessModal && countdown === 0) {
      onRegisterSuccess(registeredData || formData);
    }
    return () => clearInterval(timer);
  }, [showSuccessModal, countdown, registeredData, formData, onRegisterSuccess]);

  const inputClass = `w-full bg-surface-container border border-outline-variant/30 rounded-xl py-2.5 pr-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder:text-on-surface-variant/60 text-on-surface font-body text-sm transition-colors disabled:opacity-60`;

  return (
    <div className="h-full flex flex-col relative overflow-hidden font-body text-on-surface w-full">

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-[2rem] p-8 w-full max-w-[320px] flex flex-col items-center text-center shadow-2xl">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-primary text-[48px]">check_circle</span>
            </div>
            <h3 className="text-2xl font-headline font-bold text-primary mb-2">Registration<br />Successful!</h3>
            <p className="text-on-surface-variant mb-6 text-sm font-body">Your account has been created.</p>
            <div className="w-full bg-surface-container rounded-2xl p-4 flex flex-col items-center border border-outline-variant/30 mb-2">
              <span className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold font-label">Redirecting in</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-headline font-bold text-primary">{countdown}</span>
                <span className="text-on-surface-variant font-medium">s</span>
              </div>
            </div>
            <button
              onClick={() => onRegisterSuccess(registeredData || formData)}
              className="mt-4 w-full text-on-surface-variant font-semibold py-3 rounded-xl hover:bg-surface-container transition-colors text-sm font-body"
            >
              Skip &amp; Continue
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-none bg-primary text-on-primary px-4 py-3 flex items-center gap-4 shadow-md z-10">
        <h1 className="text-lg font-headline font-bold tracking-tight flex-1">New Customer</h1>
        <button
          onClick={() => setIsDebugMode(!isDebugMode)}
          className={`p-1 rounded-full transition-colors flex items-center justify-center ${isDebugMode ? 'bg-yellow-500 text-black' : 'hover:bg-white/10'}`}
        >
          <span className="material-symbols-outlined text-2xl">bug_report</span>
        </button>
      </header>

      {/* Main — no scroll */}
      <main className="flex-1 overflow-hidden">
        <div className="px-5 pt-6 pb-4">

          {apiError && (
            <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-error text-[18px] mt-0.5 flex-shrink-0">error</span>
              <p className="text-error text-sm font-body">{apiError}</p>
            </div>
          )}

          {isDebugMode && (
            <div className="mb-4 p-3 bg-gray-800 text-green-400 rounded-2xl text-xs font-mono shadow-inner border border-gray-700">
              <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-2">
                <span className="font-bold text-white">Debug Panel</span>
                <button
                  onClick={fillMockData}
                  className="bg-green-600 text-white px-3 py-1 rounded text-[10px] hover:bg-green-500 transition-colors"
                  type="button"
                >
                  Fill Mock Data
                </button>
              </div>
              <pre className="overflow-x-auto">{JSON.stringify(formData, null, 2)}</pre>
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
      </main>

      {/* Footer */}
      <footer className="flex-none p-4 bg-surface border-t border-outline-variant/20 z-50">
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
      </footer>

    </div>
  );
}
