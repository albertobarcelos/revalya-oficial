export interface Notification {
  id: string;
  charge_id: string | null;
  customer_id: string | null;
  type: string;
  message: string;
  status: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}
