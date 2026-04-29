// Mock data for ActiveOrder page preview (?dev=active)
// Shape mirrors the planned backend response so swapping to real data is minimal.

export const mockCustomer = {
  customerId: 'CUS-88291',
  customerName: 'บุสรินทร์ หอมวิเชียร (โบ)',
  phone: '081-234-5678',
  address: '123 ถนนสุขุมวิท, กรุงเทพฯ 10110',
};

// Pickup appointment — already completed
export const mockPickupAppointment = {
  appointmentId: 'APT-1001',
  customerId: 'CUS-88291',
  appointmentType: 'PICKUP',
  appointmentDate: '2026-04-22',
  timeSlot: '10:00-12:00',
  status: 'COMPLETED',
  pickupOrderId: 'ORD-5521',
  deliveryOrderId: null,
};

// Delivery appointment — not yet booked (null means no delivery appointment exists)
export const mockDeliveryAppointmentNone = null;

export const mockDeliveryAppointmentPending = {
  appointmentId: 'APT-1002',
  customerId: 'CUS-88291',
  appointmentType: 'DELIVERY',
  appointmentDate: '2026-04-27',
  timeSlot: '13:00-15:00',
  status: 'CONFIRMED',
  pickupOrderId: null,
  deliveryOrderId: 'ORD-5521',
};

// Order + items (pricing from OrderItemForms.price * quantity)
export const mockOrderUnpaid = {
  orderId: 'ORD-5521',
  orderNumber: '5521',
  customerId: 'CUS-88291',
  receivedDate: '2026-04-22',
  dueDate: '2026-04-27',
  serviceType: 'ซักรีด',
  status: 'CONFIRM',
  quantity: 9,
  note: 'ผ้าเปียก กรุณาตากก่อนซัก',
  paymentStatus: 'UNPAID',
  paidAt: null,
  items: [
    { id: 'OI-1', description: 'เสื้อโปโล', category: 'Tops',   quantity: 5, price: 50 },
    { id: 'OI-2', description: 'กางเกงขายาว', category: 'Bottoms', quantity: 3, price: 60 },
    { id: 'OI-3', description: 'ผ้าปูที่นอน', category: 'Bedding', quantity: 1, price: 120 },
  ],
};

export const mockOrderPaid = {
  ...mockOrderUnpaid,
  paymentStatus: 'PAID',
  paidAt: '2026-04-23T14:32:00Z',
};

// Switch this to preview different states while developing.
// States:
//   'unpaid-no-delivery' — after pickup, before payment
//   'paid-no-delivery'   — paid, ready to book delivery
//   'paid-with-delivery' — paid, delivery scheduled
export const MOCK_STATE = 'unpaid-no-delivery';

export function getMockActiveOrder(state = MOCK_STATE) {
  switch (state) {
    case 'paid-no-delivery':
      return {
        customer: mockCustomer,
        pickupAppointment: mockPickupAppointment,
        deliveryAppointment: null,
        order: mockOrderPaid,
      };
    case 'paid-with-delivery':
      return {
        customer: mockCustomer,
        pickupAppointment: mockPickupAppointment,
        deliveryAppointment: mockDeliveryAppointmentPending,
        order: mockOrderPaid,
      };
    case 'unpaid-no-delivery':
    default:
      return {
        customer: mockCustomer,
        pickupAppointment: mockPickupAppointment,
        deliveryAppointment: null,
        order: mockOrderUnpaid,
      };
  }
}
