type Translate = (key: string) => string;

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  confirmed: 'statusConfirmed',
  pending: 'statusPending',
  cancelled: 'statusCancelled',
  completed: 'statusCompleted',
  'no-show': 'statusNoShow',
  no_show: 'statusNoShow',
};

export function getAppointmentStatusLabel(status: string, t: Translate) {
  const key = STATUS_TRANSLATION_KEYS[status];
  return key ? t(`appointmentManage.${key}`) : status;
}
