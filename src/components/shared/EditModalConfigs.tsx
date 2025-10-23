/**
 * Configurações Pré-definidas para EditModal
 * 
 * AIDEV-NOTE: Define campos e validações específicas para cada tipo de entidade
 * Centraliza configuração de formulários para manter consistência
 * Facilita manutenção e extensibilidade do sistema
 * 
 * @module EditModalConfigs
 */

import * as z from 'zod';
import { FieldConfig } from './EditModal';

/**
 * AIDEV-NOTE: Função para gerar placeholder dinâmico do código de serviço
 * Utiliza o próximo código disponível ou fallback para "001"
 */
export function getServiceCodePlaceholder(nextAvailableCode?: string, isLoading?: boolean): string {
  if (isLoading) return 'Carregando...';
  return `Ex: ${nextAvailableCode || '001'}`;
}
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Hash,
  FileText,
  DollarSign,
  Percent,
  Package,
  Tag,
  BarChart3
} from 'lucide-react';
import { getCostPriceLabel, getCostPriceDescription, getCostPricePlaceholder } from '@/utils/serviceLabels';

// AIDEV-NOTE: Configuração para edição de SERVIÇOS - REORGANIZADA conforme solicitação
export const serviceEditConfig: FieldConfig[] = [
  {
    name: 'name',
    label: 'Nome do Serviço',
    type: 'text',
    placeholder: 'Ex: Consultoria Financeira',
    required: true,
    icon: <Package className="h-4 w-4" />,
    group: 'basic'
  },
  {
    name: 'code',
    label: 'Código do Serviço',
    type: 'text',
    placeholder: 'Ex: CONS-001',
    required: true,
    icon: <Hash className="h-4 w-4" />,
    group: 'basic',
    description: 'Código único para identificação do serviço'
  },
  {
    name: 'default_price',
    label: 'Valor do Serviço',
    type: 'currency',
    placeholder: '0,00',
    required: true,
    icon: <DollarSign className="h-4 w-4" />,
    group: 'basic',
    description: 'Valor do serviço em reais'
  },
  {
    name: 'is_active',
    label: 'Status do Serviço',
    type: 'switch',
    required: false,
    group: 'basic',
    description: 'Define se o serviço está ativo para uso'
  },
  // AIDEV-NOTE: Campos movidos para aba DETALHES
  {
    name: 'description',
    label: 'Descrição',
    type: 'textarea',
    placeholder: 'Descreva detalhadamente o serviço oferecido...',
    required: false,
    icon: <FileText className="h-4 w-4" />,
    group: 'details'
  },
  {
    name: 'unit_type',
    label: 'Unidade de Cobrança',
    type: 'select',
    placeholder: 'Selecione a unidade de cobrança',
    required: false,
    icon: <BarChart3 className="h-4 w-4" />,
    group: 'details',
    description: 'Define a unidade pela qual o serviço é cobrado',
    options: [
      { value: 'hour', label: 'Por Hora' },
      { value: 'day', label: 'Por Dia' },
      { value: 'monthly', label: 'Mensalidade' },
      { value: 'unique', label: 'Único / Avulso' },
      { value: 'kilometer', label: 'Por Quilômetro' },
      { value: 'square_meter', label: 'Por Metro Quadrado' },
      { value: 'other', label: 'Outro' }
    ]
  },
  {
    name: 'lc_code',
    label: 'Código LC',
    type: 'text',
    placeholder: 'Ex: 0101',
    required: false,
    icon: <Hash className="h-4 w-4" />,
    group: 'details',
    description: 'Código da Lista de Serviços (LC 116/2003)'
  },
  {
    name: 'cost_price',
    label: 'Preço de Custo',
    type: 'currency',
    placeholder: 'R$ 0,00',
    required: false,
    icon: <DollarSign className="h-4 w-4" />,
    group: 'details',
    description: 'Valor de custo do serviço para cálculo de margem'
  },
  // AIDEV-NOTE: Campos de IMPOSTOS movidos para aba AVANÇADO
  {
    name: 'tax_rate',
    label: 'Taxa de Imposto (%)',
    type: 'number',
    placeholder: '0',
    required: false,
    icon: <Percent className="h-4 w-4" />,
    group: 'advanced',
    description: 'Percentual de imposto aplicado ao serviço'
  },
  {
    name: 'tax_code',
    label: 'Código do Imposto',
    type: 'text',
    placeholder: 'Ex: 1401',
    required: false,
    icon: <Hash className="h-4 w-4" />,
    group: 'advanced',
    description: 'Código fiscal do imposto'
  },
  {
    name: 'municipality_code',
    label: 'Código do Município',
    type: 'text',
    placeholder: 'Ex: 3550308',
    required: false,
    icon: <MapPin className="h-4 w-4" />,
    group: 'advanced',
    description: 'Código IBGE do município para ISS'
  },
  {
    name: 'withholding_tax',
    label: 'Retenção de Imposto',
    type: 'switch',
    required: false,
    group: 'advanced',
    description: 'Indica se há retenção de imposto na fonte'
  }
];

// AIDEV-NOTE: Configuração para edição de PRODUTOS
export const productEditConfig: FieldConfig[] = [
  {
    name: 'name',
    label: 'Nome do Produto',
    type: 'text',
    placeholder: 'Ex: Software de Gestão',
    required: true,
    icon: <Package className="h-4 w-4" />,
    group: 'basic'
  },
  {
    name: 'description',
    label: 'Descrição',
    type: 'textarea',
    placeholder: 'Descreva as características e benefícios do produto...',
    required: false,
    icon: <FileText className="h-4 w-4" />,
    group: 'basic'
  },
  {
    name: 'sku',
    label: 'SKU',
    type: 'text',
    placeholder: 'Ex: SOFT-001',
    required: false,
    icon: <Hash className="h-4 w-4" />,
    group: 'basic'
  },
  {
    name: 'category',
    label: 'Categoria',
    type: 'select',
    placeholder: 'Selecione uma categoria',
    required: false,
    icon: <Tag className="h-4 w-4" />,
    group: 'basic',
    options: [
      { value: 'software', label: 'Software' },
      { value: 'hardware', label: 'Hardware' },
      { value: 'licenca', label: 'Licença' },
      { value: 'consultoria', label: 'Consultoria' },
      { value: 'treinamento', label: 'Treinamento' },
      { value: 'suporte', label: 'Suporte' }
    ]
  },
  {
    name: 'price',
    label: 'Preço',
    type: 'currency',
    placeholder: '0,00',
    required: true,
    icon: <DollarSign className="h-4 w-4" />,
    group: 'financial'
  },
  {
    name: 'cost',
    label: 'Custo',
    type: 'currency',
    placeholder: '0,00',
    required: false,
    icon: <DollarSign className="h-4 w-4" />,
    group: 'financial',
    description: 'Custo de aquisição ou produção'
  },
  {
    name: 'tax_rate',
    label: 'Taxa de Imposto (%)',
    type: 'number',
    placeholder: '0',
    required: false,
    icon: <Percent className="h-4 w-4" />,
    group: 'financial'
  },
  {
    name: 'stock_quantity',
    label: 'Quantidade em Estoque',
    type: 'number',
    placeholder: '0',
    required: false,
    icon: <Package className="h-4 w-4" />,
    group: 'inventory',
    description: 'Quantidade disponível em estoque'
  },
  {
    name: 'min_stock',
    label: 'Estoque Mínimo',
    type: 'number',
    placeholder: '0',
    required: false,
    icon: <Package className="h-4 w-4" />,
    group: 'inventory',
    description: 'Quantidade mínima para alerta de reposição'
  },
  {
    name: 'is_active',
    label: 'Status do Produto',
    type: 'switch',
    required: false,
    group: 'basic',
    description: 'Define se o produto está ativo para venda'
  }
];

// AIDEV-NOTE: Configuração para edição de CLIENTES
export const clientEditConfig: FieldConfig[] = [
  {
    name: 'name',
    label: 'Nome Completo',
    type: 'text',
    placeholder: 'Ex: João Silva Santos',
    required: true,
    icon: <User className="h-4 w-4" />,
    group: 'personal'
  },
  {
    name: 'company',
    label: 'Empresa',
    type: 'text',
    placeholder: 'Ex: Empresa LTDA',
    required: false,
    icon: <Building2 className="h-4 w-4" />,
    group: 'personal'
  },
  {
    name: 'cpf_cnpj',
    label: 'CPF/CNPJ',
    type: 'cpf_cnpj',
    placeholder: '000.000.000-00 ou 00.000.000/0000-00',
    required: false,
    icon: <Hash className="h-4 w-4" />,
    group: 'personal',
    description: 'Documento de identificação fiscal'
  },
  {
    name: 'email',
    label: 'E-mail',
    type: 'email',
    placeholder: 'exemplo@email.com',
    required: false,
    icon: <Mail className="h-4 w-4" />,
    group: 'contact'
  },
  {
    name: 'phone',
    label: 'Telefone',
    type: 'phone',
    placeholder: '(11) 99999-9999',
    required: false,
    icon: <Phone className="h-4 w-4" />,
    group: 'contact'
  },
  {
    name: 'address',
    label: 'Endereço',
    type: 'text',
    placeholder: 'Rua, Avenida, etc.',
    required: false,
    icon: <MapPin className="h-4 w-4" />,
    group: 'address'
  },
  {
    name: 'address_number',
    label: 'Número',
    type: 'text',
    placeholder: '123',
    required: false,
    icon: <Hash className="h-4 w-4" />,
    group: 'address'
  },
  {
    name: 'complement',
    label: 'Complemento',
    type: 'text',
    placeholder: 'Apto, Sala, etc.',
    required: false,
    icon: <Building2 className="h-4 w-4" />,
    group: 'address'
  },
  {
    name: 'neighborhood',
    label: 'Bairro',
    type: 'text',
    placeholder: 'Centro, Jardins, etc.',
    required: false,
    icon: <MapPin className="h-4 w-4" />,
    group: 'address'
  },
  {
    name: 'city',
    label: 'Cidade',
    type: 'text',
    placeholder: 'São Paulo',
    required: false,
    icon: <MapPin className="h-4 w-4" />,
    group: 'address'
  },
  {
    name: 'state',
    label: 'Estado',
    type: 'select',
    placeholder: 'Selecione o estado',
    required: false,
    icon: <MapPin className="h-4 w-4" />,
    group: 'address',
    options: [
      { value: 'AC', label: 'Acre' },
      { value: 'AL', label: 'Alagoas' },
      { value: 'AP', label: 'Amapá' },
      { value: 'AM', label: 'Amazonas' },
      { value: 'BA', label: 'Bahia' },
      { value: 'CE', label: 'Ceará' },
      { value: 'DF', label: 'Distrito Federal' },
      { value: 'ES', label: 'Espírito Santo' },
      { value: 'GO', label: 'Goiás' },
      { value: 'MA', label: 'Maranhão' },
      { value: 'MT', label: 'Mato Grosso' },
      { value: 'MS', label: 'Mato Grosso do Sul' },
      { value: 'MG', label: 'Minas Gerais' },
      { value: 'PA', label: 'Pará' },
      { value: 'PB', label: 'Paraíba' },
      { value: 'PR', label: 'Paraná' },
      { value: 'PE', label: 'Pernambuco' },
      { value: 'PI', label: 'Piauí' },
      { value: 'RJ', label: 'Rio de Janeiro' },
      { value: 'RN', label: 'Rio Grande do Norte' },
      { value: 'RS', label: 'Rio Grande do Sul' },
      { value: 'RO', label: 'Rondônia' },
      { value: 'RR', label: 'Roraima' },
      { value: 'SC', label: 'Santa Catarina' },
      { value: 'SP', label: 'São Paulo' },
      { value: 'SE', label: 'Sergipe' },
      { value: 'TO', label: 'Tocantins' }
    ]
  },
  {
    name: 'postal_code',
    label: 'CEP',
    type: 'text',
    placeholder: '00000-000',
    required: false,
    icon: <MapPin className="h-4 w-4" />,
    group: 'address'
  },
  {
    name: 'active',
    label: 'Status do Cliente',
    type: 'switch',
    required: false,
    group: 'personal',
    description: 'Define se o cliente está ativo no sistema'
  }
];

// AIDEV-NOTE: Schema de validação para SERVIÇOS - CORRIGIDO para corresponder à estrutura real da tabela
export const serviceValidationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional(),
  code: z.string().min(1, 'Código é obrigatório').max(50, 'Código muito longo'),
  default_price: z.number().min(0, 'Preço deve ser positivo'),
  cost_price: z.number().min(0, 'Preço de custo deve ser positivo').optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  tax_code: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  lc_code: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  municipality_code: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  withholding_tax: z.boolean().optional(),
  is_active: z.boolean().optional(),
  unit_type: z.enum(['hour', 'day', 'monthly', 'unique', 'kilometer', 'square_meter', 'other']).optional().or(z.literal("")).transform(val => val === "" ? undefined : val)
});

export const productValidationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser positivo'),
  cost: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  stock_quantity: z.number().min(0).optional(),
  min_stock: z.number().min(0).optional(),
  is_active: z.boolean().optional()
});

export const clientValidationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  company: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  address_number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  active: z.boolean().optional()
});

// AIDEV-NOTE: Função para obter configuração dinâmica de serviços baseada na unidade de cobrança
export const getDynamicServiceConfig = (unitType?: string) => {
  // AIDEV-NOTE: Clona a configuração base para evitar mutação
  const dynamicFields = serviceEditConfig.map(field => {
    if (field.name === 'cost_price') {
      return {
        ...field,
        label: getCostPriceLabel(unitType),
        description: getCostPriceDescription(unitType),
        placeholder: getCostPricePlaceholder(unitType)
      };
    }
    return field;
  });

  return {
    fields: dynamicFields,
    validation: serviceValidationSchema
  };
};

// AIDEV-NOTE: Função para obter configuração de serviços com placeholder dinâmico
export const getServiceEditConfig = (nextAvailableCode?: string, isLoading?: boolean) => {
  const dynamicFields = serviceEditConfig.map(field => {
    if (field.name === 'code') {
      return {
        ...field,
        placeholder: getServiceCodePlaceholder(nextAvailableCode, isLoading)
      };
    }
    return field;
  });

  return {
    fields: dynamicFields,
    validation: serviceValidationSchema
  };
};

// AIDEV-NOTE: Função helper para obter configuração por tipo de entidade
export const getEditConfig = (entityType: 'service' | 'product' | 'client') => {
  switch (entityType) {
    case 'service':
      return {
        fields: serviceEditConfig,
        validation: serviceValidationSchema
      };
    case 'product':
      return {
        fields: productEditConfig,
        validation: productValidationSchema
      };
    case 'client':
      return {
        fields: clientEditConfig,
        validation: clientValidationSchema
      };
    default:
      throw new Error(`Tipo de entidade não suportado: ${entityType}`);
  }
};