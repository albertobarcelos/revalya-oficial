import { z } from 'zod';

export const contractFormSchema = z.object({
  customer_id: z.string().min(1, 'Cliente é obrigatório'),
  contract_number: z.string().optional(),
  status: z.string().default('DRAFT'),
  start_date: z.date(),
  end_date: z.date(),
  billing_day: z.number().min(1).max(31),
  installments: z.number().min(1),
  total_amount: z.number().default(0),
  total_discount: z.number().default(0),
  total_tax: z.number().default(0),
  description: z.string().optional(),
  internal_notes: z.string().optional(),
  stage_id: z.string().optional(),
  anticipate_weekends: z.boolean().default(false),
  is_active: z.boolean().default(true),
  services: z.array(z.any()).default([])
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;
