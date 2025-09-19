export interface MessageTemplate {
  id: string;
  name: string;
  description: string | null;
  message: string;
  days_offset: number;
  is_before_due: boolean | null;
  category: string;
  active: boolean | null;
  created_at: string;
  updated_at: string;
  tags: string[] | null;
}
