import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BottomNavBar from '../../components/ui/BottomNavBar';
import CustomerSectionIcon from '../../components/customer-orders/CustomerSectionIcon';

const SECTIONS = [
  { key: 'orders', en: 'Orders', th: 'รายการซัก', icon: 'local_laundry_service' },
  { key: 'packages', en: 'Packages', th: 'แพ็กเกจ', icon: 'confirmation_number' },
  { key: 'invoices', en: 'Invoices', th: 'ใบแจ้งหนี้', icon: 'receipt_long' },
  { key: 'appointments', en: 'Appointments', th: 'นัดหมาย', icon: 'event' },
];

export default function FooterNavPreview() {
  const [activeKey, setActiveKey] = useState('orders');
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith('th') ? 'th' : 'en';
  const items = SECTIONS.map((section) => ({ ...section, label: section[language] }));
  const activeItem = items.find((item) => item.key === activeKey);

  return (
    <div className="flex-1 min-h-0 flex flex-col font-body text-on-surface">
      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-14">
        <p className="font-label text-xs font-semibold text-on-surface-variant">
          {language === 'th' ? 'ตัวอย่างเมนูด้านล่าง' : 'Footer navigation preview'}
        </p>
        <h2 className="mt-2 font-headline text-2xl font-bold">{activeItem.label}</h2>
        <p className="mt-3 text-sm text-on-surface-variant">
          {language === 'th' ? 'เลือกเมนูด้านล่างเพื่อดูสถานะที่เลือก' : 'Select a section below to preview its active state.'}
        </p>
      </main>
      <BottomNavBar
        items={items}
        activeKey={activeKey}
        ariaLabel={language === 'th' ? 'เมนูลูกค้า' : 'Customer sections'}
        onSelect={setActiveKey}
        renderIcon={(item) => <CustomerSectionIcon name={item.key} />}
      />
    </div>
  );
}