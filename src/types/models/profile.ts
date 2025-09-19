export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  phone: string | null;
  user_role: string | null;
  preferences: Record<string, any> | null;
  active: boolean | null;
  profile_id?: string | null;
  tenant_id?: string | null;
  reseller_id?: string | null;
}
