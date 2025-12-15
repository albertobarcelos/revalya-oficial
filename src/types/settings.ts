export interface NotificationMessage {
  id: string;
  days: number;
  isBeforeDue: boolean;
  message: string;
  active: boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description?: string;
  message: string;
  category: string;
  days_offset: number;
  is_before_due: boolean;
  active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  totalReceivable: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  chargesByStatus: {
    status: string;
    count: number;
  }[];
  chargesByPriority: {
    priority: string;
    count: number;
  }[];
}

export interface NotificationSettings {
  automaticNotifications: boolean;
  messages: NotificationMessage[];
}

// AIDEV-NOTE: Tags foram completamente centralizadas em @/utils/messageTags.ts
// Use diretamente: import { TAG_DEFINITIONS, AVAILABLE_TAGS } from '@/utils/messageTags';
