import type { NotificationSettings } from '@/types/settings';

// TODO: Implementar integração com Supabase
export const settingsService = {
  async saveSettings(settings: NotificationSettings) {
    // Simula um delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 1000));
    return settings;
  },

  async getSettings(): Promise<NotificationSettings> {
    return {
      automaticNotifications: true,
      messages: []
    };
  }
};
