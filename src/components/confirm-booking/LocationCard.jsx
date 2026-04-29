import { useTranslation } from 'react-i18next';

export default function LocationCard({ address }) {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest mb-3 px-1">
        {t('confirmBooking.location')}
      </p>

      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-50/50">
        {/* Address + nav button */}
        <div className="bg-[#f8f9fb] rounded-xl p-3 flex items-center justify-between mb-4">
          <p className="font-body text-[15px] font-semibold text-[#2d3648] leading-snug pr-4 flex-1">{address}</p>
          <button
            onClick={() => window.open(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
              '_blank',
              'noopener,noreferrer',
            )}
            className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-white text-[20px]">navigation</span>
          </button>
        </div>

        {/* Mockup Map */}
        <div className="relative w-full h-[180px] rounded-xl overflow-hidden bg-[#eff1f4]">
          <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M-10,50 L100,20 L150,80 L320,30" stroke="#d1d5db" strokeWidth="4" fill="none" />
            <path d="M50,-10 L80,100 L20,180" stroke="#d1d5db" strokeWidth="3" fill="none" />
            <path d="M150,80 L200,150 L320,130" stroke="#d1d5db" strokeWidth="4" fill="none" />
            <path d="M100,200 L120,130 L80,100" stroke="#d1d5db" strokeWidth="2" fill="none" />
            <path d="M220,-10 L250,90 L200,150 L280,220" stroke="#d1d5db" strokeWidth="6" fill="none" />
            <path d="M0,120 L50,150 L100,130" stroke="#d1d5db" strokeWidth="5" fill="none" />
          </svg>

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200">
            <defs>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0cd9c3" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <path
              d="M 60 110 L 60 160 C 60 170, 70 170, 80 170 L 90 170 L 100 70 L 150 130 L 200 80 L 230 110"
              stroke="url(#routeGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>

          <div className="absolute left-[54px] top-[104px] flex flex-col items-center">
            <span className="text-[10px] font-bold text-gray-500 mb-1">{t('confirmBooking.mapYou')}</span>
            <div className="w-3.5 h-3.5 bg-[#0cd9c3] rounded-full border-[2.5px] border-white shadow-sm" />
          </div>
          <div className="absolute left-[224px] top-[104px] w-3.5 h-3.5 bg-[#3b82f6] rounded-full border-[2.5px] border-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}
