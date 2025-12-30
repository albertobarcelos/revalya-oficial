import { z } from "zod";
import { startOfDay, isBefore, isAfter } from "date-fns";

// Esquema base para os serviços do contrato
const serviceItemSchema = z.object({
  id: z.string().optional(),
  service_id: z.string({
    required_error: "Selecione um serviço",
  }),
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  quantity: z.coerce
    .number()
    .min(0.01, "A quantidade deve ser maior que zero")
    .default(1),
  unit_price: z.coerce
    .number()
    .min(0, "O preço unitário não pode ser negativo")
    .default(0),
  cost_price: z.coerce
    .number()
    .min(0, "O preço de custo não pode ser negativo")
    .optional(),
  default_price: z.coerce
    .number()
    .min(0, "O preço padrão não pode ser negativo")
    .default(0),
  tax_rate: z.coerce
    .number()
    .min(0, "A taxa não pode ser negativa")
    .default(0),
  tax_code: z.string().optional().nullable(),
  cost_percentage: z.coerce
    .number()
    .min(0, "A porcentagem de custo não pode ser negativa")
    .max(100, "A porcentagem de custo não pode ser maior que 100%")
    .default(0),
  discount_percentage: z.coerce
    .number()
    .min(0, "O desconto não pode ser negativo")
    .max(100, "O desconto não pode ser maior que 100%")
    .default(0),
  discount_amount: z.coerce
    .number()
    .min(0, "O valor do desconto não pode ser negativo")
    .default(0),
  total_amount: z.coerce
    .number()
    .min(0, "O valor total não pode ser negativo")
    .default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  tenant_id: z.string().optional(),
  withholding_tax: z.boolean().default(false),
  due_type: z.enum(['days_after_billing', 'fixed_day']).default('days_after_billing'),
  due_value: z.number().min(1).default(5),
  due_next_month: z.boolean().default(false),

  // AIDEV-NOTE: Campo para controlar se o serviço deve gerar cobrança automaticamente
  generate_billing: z.boolean().default(true),
  // Campos financeiros
  payment_method: z.string().optional().nullable(),
  card_type: z.string().optional().nullable(),
  billing_type: z.string().optional().nullable(),
  recurrence_frequency: z.string().optional().nullable(),
  installments: z.coerce.number().min(1).optional().nullable(),
});

// Função auxiliar para validar datas - REMOVIDA validação de data futura
const validateFutureDate = (date: Date) => {
  // Permitir qualquer data válida - removida restrição de data futura
  return date instanceof Date && !isNaN(date.getTime());
};

// Esquema para dados de impostos e retenções
const taxDataSchema = z.object({
  // Código NBS
  nbs_code: z.string().optional(),
  
  // ISS
  iss_rate: z.coerce.number().min(0).max(100).default(0),
  iss_value: z.coerce.number().min(0).default(0),
  iss_withheld: z.boolean().default(false),
  inform_iss_value: z.boolean().default(false),
  deduct_iss_from_calculation_base: z.boolean().default(false),
  
  // IR
  ir_rate: z.coerce.number().min(0).max(100).default(0),
  ir_value: z.coerce.number().min(0).default(0),
  ir_withheld: z.boolean().default(false),
  inform_ir_value: z.boolean().default(false),
  deduct_ir_from_calculation_base: z.boolean().default(false),
  
  // CSLL
  csll_rate: z.coerce.number().min(0).max(100).default(0),
  csll_value: z.coerce.number().min(0).default(0),
  csll_withheld: z.boolean().default(false),
  inform_csll_value: z.boolean().default(false),
  
  // INSS
  inss_rate: z.coerce.number().min(0).max(100).default(0),
  inss_value: z.coerce.number().min(0).default(0),
  inss_withheld: z.boolean().default(false),
  inform_inss_value: z.boolean().default(false),
  
  // PIS
  pis_rate: z.coerce.number().min(0).max(100).default(0),
  pis_value: z.coerce.number().min(0).default(0),
  pis_withheld: z.boolean().default(false),
  inform_pis_value: z.boolean().default(false),
  
  // COFINS
  cofins_rate: z.coerce.number().min(0).max(100).default(0),
  cofins_value: z.coerce.number().min(0).default(0),
  cofins_withheld: z.boolean().default(false),
  inform_cofins_value: z.boolean().default(false),
  
  // Valores calculados
  service_calculation_base: z.coerce.number().min(0).default(0),
  total_item_value: z.coerce.number().min(0).default(0),
});

// Esquema base para o formulário de contrato
const baseContractSchema = z.object({
  id: z.string().optional(),
  contract_number: z.string().optional().nullable(), // Completamente opcional
  customer_id: z.string({
    required_error: "Selecione um cliente",
  }).min(1, "Cliente é obrigatório"),
  initial_date: z.union([z.date(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }).refine((date) => {
    return date instanceof Date && !isNaN(date.getTime());
  }, {
    message: "Selecione uma vigência inicial válida"
  }),
  final_date: z.union([z.date(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }).refine((date) => {
    return date instanceof Date && !isNaN(date.getTime());
  }, {
    message: "Selecione uma vigência final válida"
  }),
  billing_type: z.string({
    required_error: "Selecione o tipo de faturamento",
  }).min(1, "Tipo de faturamento é obrigatório"),
  billing_day: z.coerce
    .number({
      required_error: "Informe o dia de vencimento",
      invalid_type_error: "O dia deve ser um número",
    })
    .int("O dia deve ser um número inteiro")
    .min(1, "Dia deve ser entre 1 e 31")
    .max(31, "Dia deve ser entre 1 e 31")
    .default(15), // Valor padrão: dia 15
  anticipate_weekends: z.boolean().default(true),
  installments: z.coerce
    .number({
      required_error: "Informe o número de parcelas",
      invalid_type_error: "O número de parcelas deve ser um número",
    })
    .int("O número de parcelas deve ser um número inteiro")
    .min(1, "Deve ter pelo menos 1 parcela")
    .max(360, "O número máximo de parcelas é 360"),
  total_amount: z.coerce
    .number()
    .min(0, "O valor total não pode ser negativo")
    .default(0),
  total_discount: z.coerce
    .number()
    .min(0, "O desconto total não pode ser negativo")
    .default(0),
  total_tax: z.coerce
    .number()
    .min(0, "O imposto total não pode ser negativo")
    .default(0),
  description: z.string()
    .max(500, "A descrição não pode ter mais de 500 caracteres")
    .optional(),
  internal_notes: z.string()
    .max(1000, "As observações internas não podem ter mais de 1000 caracteres")
    .optional(),
  due_type: z.enum(['days_after_billing', 'fixed_day']).default('days_after_billing'),
  due_value: z.number().min(1).default(5),
  due_next_month: z.boolean().default(false),

  // AIDEV-NOTE: Campo para controlar se o contrato deve gerar cobrança automaticamente
  generate_billing: z.boolean().default(true),
  tax_data: taxDataSchema.optional(),
  // AIDEV-NOTE: Configurações fiscais do contrato
  fiscal_config: z.object({
    auto_emit_nfe: z.boolean().default(false),
    auto_emit_nfse: z.boolean().default(false),
    nfse_emit_moment: z.enum(['faturamento', 'recebimento']).default('recebimento'),
    nfse_valor_mode: z.enum(['proporcional', 'total']).default('proporcional'),
    nfse_parcelas_mode: z.enum(['por_recebimento', 'acumulado']).default('por_recebimento'),
    auto_send_email: z.boolean().default(false),
  }).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  tenant_id: z.string().optional(),
});

// Validação personalizada para as datas
const validateDates = (data: z.infer<typeof baseContractSchema>) => {
  const today = startOfDay(new Date());
  const startDate = data.initial_date ? startOfDay(new Date(data.initial_date)) : null;
  const endDate = data.final_date ? startOfDay(new Date(data.final_date)) : null;
  
  // Se alguma das datas não estiver definida, não faz validação
  if (!startDate || !endDate) {
    return { isValid: true };
  }
  
  // Verifica se a data final é posterior à data inicial
  if (isBefore(endDate, startDate)) {
    return {
      isValid: false,
      message: "A data final deve ser posterior à data inicial",
      path: ["final_date"]
    };
  }
  
  // Verifica se o período é muito longo (mais de 10 anos)
  const maxDate = new Date(startDate);
  maxDate.setFullYear(maxDate.getFullYear() + 10);
  
  if (isAfter(endDate, maxDate)) {
    return {
      isValid: false,
      message: "O período máximo é de 10 anos",
      path: ["final_date"]
    };
  }
  
  return { isValid: true };
};

// Esquema para produtos do contrato
const productItemSchema = z.object({
  id: z.string(),
  product_id: z.string().optional(), // Tornado opcional para permitir produtos customizados
  name: z.string().min(1, "Nome do produto é obrigatório"),
  description: z.string().optional(),
  quantity: z.coerce
    .number()
    .min(1, "A quantidade deve ser maior que 0")
    .default(1),
  unit_price: z.coerce
    .number()
    .min(0, "O valor unitário não pode ser negativo")
    .default(0),
  tax_rate: z.coerce
    .number()
    .min(0, "A taxa de imposto não pode ser negativa")
    .max(100, "A taxa de imposto não pode ser maior que 100%")
    .default(0),
  tax_code: z.string().optional().nullable(),
  discount_percentage: z.coerce
    .number()
    .min(0, "O desconto não pode ser negativo")
    .max(100, "O desconto não pode ser maior que 100%")
    .default(0),
  discount_amount: z.coerce
    .number()
    .min(0, "O valor do desconto não pode ser negativo")
    .default(0),
  total_amount: z.coerce
    .number()
    .min(0, "O valor total não pode ser negativo")
    .default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  tenant_id: z.string().optional(),
  withholding_tax: z.boolean().default(false),
  // AIDEV-NOTE: Campo para controlar se o produto deve gerar cobrança automaticamente
  generate_billing: z.boolean().default(true),
  // AIDEV-NOTE: Campos financeiros adicionados para produtos (igual aos serviços)
  payment_method: z.string().optional().nullable(),
  card_type: z.string().optional().nullable(),
  billing_type: z.string().optional().nullable(),
  recurrence_frequency: z.string().optional().nullable(),
  installments: z.coerce.number().min(1).optional().nullable(),
  payment_gateway: z.string().optional().nullable(),
  due_type: z.string().optional().nullable(),
  due_value: z.coerce.number().optional().nullable(),
  due_next_month: z.boolean().optional().nullable(),
});

// Esquema base com validação de datas
const contractBaseSchema = z.object({
  ...baseContractSchema.shape,
  services: z.array(serviceItemSchema)
    .optional()
    .default([]),
  products: z.array(productItemSchema)
    .optional()
    .default([]),
}).refine(
  (data) => {
    if (!data.initial_date || !data.final_date) return true;
    return isAfter(new Date(data.final_date), new Date(data.initial_date));
  },
  {
    message: "A data final deve ser posterior à data inicial",
    path: ["final_date"],
  }
);

// Esquema final com validação personalizada
const contractFormSchema = contractBaseSchema.superRefine((data, ctx) => {
  const validation = validateDates(data);
  if (!validation.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: validation.message,
      path: validation.path,
    });
  }

  // Validação adicional para o dia de vencimento baseado no mês
  if (data.billing_day) {
    const day = data.billing_day;
    const initialDate = data.initial_date ? new Date(data.initial_date) : null;
    
    if (initialDate) {
      // Verifica se o dia de vencimento é válido para o mês da data inicial
      const lastDayOfMonth = new Date(
        initialDate.getFullYear(), 
        initialDate.getMonth() + 1, 
        0
      ).getDate();
      
      if (day > lastDayOfMonth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `O mês da data inicial tem apenas ${lastDayOfMonth} dias`,
          path: ["billing_day"],
        });
      }
    }
  }
});

// Tipo para os valores do formulário
export type ContractFormValues = z.infer<typeof contractFormSchema>;

// Interface para as props do formulário
export interface ContractFormProps {
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
}

export { contractFormSchema };
