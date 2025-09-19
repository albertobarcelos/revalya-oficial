export interface AsaasCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string | null; // AIDEV-NOTE: Campo correto conforme schema da tabela customers
  postalCode: string | null;
  cpfCnpj: string | null;
  personType: string | null;
  deleted: boolean;
  additionalEmails: string | null;
  externalReference: string | null;
  notificationDisabled: boolean;
  city: string | null;
  state: string | null;
  country: string;
  observations: string | null;
  company: string | null; // Adicionado campo company
}

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  description?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeUrl?: string;
  nossoNumero?: string;
  invoiceNumber?: string;
  deleted: boolean;
  dateCreated: string;
  subscription?: string;
  installment?: string;
  externalReference?: string;
}

export interface AsaasListResponse<T> {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}

export const mapAsaasCustomerToCustomer = (asaasCustomer: AsaasCustomer) => {
  return {
    asaas_id: asaasCustomer.id,
    name: asaasCustomer.name,
    email: asaasCustomer.email,
    phone: asaasCustomer.phone || asaasCustomer.mobilePhone,
    cpf_cnpj: asaasCustomer.cpfCnpj,
    address: asaasCustomer.address,
    city: asaasCustomer.city,
    state: asaasCustomer.state,
    postal_code: asaasCustomer.postalCode,
    notes: asaasCustomer.observations,
    status: asaasCustomer.deleted ? 'inactive' : 'active',
    company: asaasCustomer.company // Atualizado para mapear o campo company
  };
};

export const mapAsaasPaymentToCharge = (payment: AsaasPayment) => {
  return {
    asaas_id: payment.id,
    customer_id: payment.customer,
    amount: payment.value,
    due_date: payment.dueDate,
    status: payment.status.toLowerCase() as 'pending' | 'paid' | 'overdue' | 'cancelled',
    description: payment.description || null,
    payment_link: payment.invoiceUrl || null,
    barcode: payment.bankSlipUrl || null,
    pix_code: payment.pixQrCodeUrl || null,
    paid_at: payment.paymentDate || null,
    priority: 'medium' as const,
    attempts: 0
  };
};

export interface CreateCustomerDTO {
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  // AIDEV-NOTE: Removido mobilePhone - campo não existe na tabela customers
  address?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string; // AIDEV-NOTE: Campo correto conforme schema da tabela customers
  neighborhood?: string; // Campo explícito para bairro
  postal_code?: string; // AIDEV-NOTE: Campo correto conforme schema da tabela customers
  city?: string;
  state?: string;
  country?: string;
  company?: string;
}

export interface AsaasCity {
  id: string;
  name: string;
  state: string;
  district?: string;
  ibgeCode?: string;
}

export type { AsaasCustomer as Customer };
