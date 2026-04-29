/**
 * Derives the current 5-step status index from pickup appointment, order,
 * and delivery appointment data.
 *
 *   0: Pending     — pickup exists but not COMPLETED
 *   1: Received    — pickup COMPLETED (laundry is with us)
 *   2: In Progress — order being washed (SUBMITTED / CONFIRM)
 *   3: Ready       — order washed, ready to hand back
 *   4: Completed   — delivery COMPLETED
 */
export function currentStepIndex({ pickup, order, delivery }) {
  if (delivery?.status === 'COMPLETED') return 4;
  const orderReady = order?.status === 'READY' || order?.status === 'เสร็จแล้ว';
  if (orderReady) return 3;
  const pickupDone = pickup?.status === 'COMPLETED';
  const orderActive = ['SUBMITTED', 'CONFIRM'].includes(order?.status);
  if (pickupDone && orderActive) return 2;
  if (pickupDone) return 1;
  return 0;
}

export const STATUS_KEYS = ['pending', 'received', 'inProgress', 'ready', 'completed'];
