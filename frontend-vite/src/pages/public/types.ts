export interface Appointment {
  id: number;
  client_name: string;
  client_phone: string;
  client_email: string;
  service: string;
  service_duration: number;
  appointment_date: string;
  status: string;
  notes: string;
  staff_name: string;
  staff_id: number;
  management_link: string;
  deposit_amount: string;
  deposit_paid: boolean;
  recurring_group: string;
  recurring_rule: { frequency: string; count: number } | null;
}

export interface RecurringAppointment {
  id: number;
  appointment_date: string;
  status: string;
  client_token: string;
}
