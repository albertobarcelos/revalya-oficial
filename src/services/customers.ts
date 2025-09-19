import { supabase } from '@/lib/supabase';
import type { Customer } from "@/types/database";
import { asaasService } from "./asaas";

export const customersService = {
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as Customer[];
  },

  async syncCustomers(): Promise<boolean> {
    const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'syncCustomers'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to sync customers');
    }

    return true;
  },

  async handleWebhook(payload: any): Promise<void> {
    // Handle webhook payload from Asaas
    console.log('Received webhook payload:', payload);
    
    // Implement webhook handling logic here
    // For example, updating customer status or syncing data
    if (payload.event === 'CUSTOMER_UPDATED') {
      await customersService.syncCustomers();
    }
  }
};

export const { syncCustomers, handleWebhook } = customersService;
