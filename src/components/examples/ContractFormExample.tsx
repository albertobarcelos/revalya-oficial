import React, { useState } from 'react';
import { z } from 'zod';
import {
  Page,
  PrimeForm,
  PrimeButton,
  PrimeCard,
  useToast,
  formUtils,
  layoutUtils,
  type FormConfig,
  type PageHeaderConfig,
  type ExtendedMenuItem
} from '@/components/prime';

// Schema de validação para o formulário de contrato
const contractSchema = z.object({
  // Dados do cliente
  clientType: z.enum(['individual', 'company'], {
    required_error: 'Tipo de cliente é obrigatório'
  }),
  clientName: z.string().min(1, 'Nome/Razão social é obrigatório'),
  clientEmail: z.string().email('Email inválido'),
  clientPhone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido'),
  clientDocument: z.string().min(1, 'CPF/CNPJ é obrigatório'),
  
  // Dados do contrato
  contractNumber: z.string().min(1, 'Número do contrato é obrigatório'),
  contractType: z.enum(['service', 'product', 'subscription'], {
    required_error: 'Tipo de contrato é obrigatório'
  }),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().optional(),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  
  // Dados financeiros
  paymentMethod: z.enum(['cash', 'card', 'pix', 'bank_transfer'], {
    required_error: 'Método de pagamento é obrigatório'
  }),
  billingType: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'one_time'], {
    required_error: 'Tipo de faturamento é obrigatório'
  }),
  amount: z.number().positive('Valor deve ser positivo'),
  discount: z.number().min(0, 'Desconto não pode ser negativo').max(100, 'Desconto não pode ser maior que 100%').optional(),
  
  // Configurações adicionais
  autoRenewal: z.boolean().optional(),
  notifications: z.boolean().optional(),
  terms: z.boolean().refine(val => val === true, 'Você deve aceitar os termos e condições')
});

type ContractFormData = z.infer<typeof contractSchema>;

// Configuração do formulário
const createFormConfig = (clientType: 'individual' | 'company' | null): FormConfig => ({
  title: 'Novo Contrato',
  description: 'Preencha os dados abaixo para criar um novo contrato',
  schema: contractSchema,
  submitText: 'Criar Contrato',
  cancelText: 'Cancelar',
  resetText: 'Limpar',
  autoSave: true,
  autoSaveDelay: 3000,
  sections: [
    formUtils.section('Dados do Cliente', [
      formUtils.selectField('clientType', 'Tipo de Cliente', [
        { label: 'Pessoa Física', value: 'individual' },
        { label: 'Pessoa Jurídica', value: 'company' }
      ], { required: true, gridCols: 1 }),
      
      formUtils.textField('clientName', clientType === 'company' ? 'Razão Social' : 'Nome Completo', {
        required: true,
        placeholder: clientType === 'company' ? 'Digite a razão social' : 'Digite o nome completo'
      }),
      
      formUtils.emailField('clientEmail', 'Email', {
        required: true,
        placeholder: 'cliente@exemplo.com'
      }),
      
      formUtils.phoneField('clientPhone', 'Telefone', {
        required: true
      }),
      
      clientType === 'individual'
        ? formUtils.cpfField('clientDocument', 'CPF', { required: true })
        : formUtils.cnpjField('clientDocument', 'CNPJ', { required: true })
    ], { gridCols: 2 }),
    
    formUtils.section('Dados do Contrato', [
      formUtils.textField('contractNumber', 'Número do Contrato', {
        required: true,
        placeholder: 'CT-2024-001'
      }),
      
      formUtils.selectField('contractType', 'Tipo de Contrato', [
        { label: 'Prestação de Serviços', value: 'service' },
        { label: 'Venda de Produtos', value: 'product' },
        { label: 'Assinatura/Recorrente', value: 'subscription' }
      ], { required: true }),
      
      {
        name: 'startDate',
        label: 'Data de Início',
        type: 'text' as const,
        required: true,
        placeholder: 'dd/mm/aaaa'
      },
      
      {
        name: 'endDate',
        label: 'Data de Término',
        type: 'text' as const,
        placeholder: 'dd/mm/aaaa (opcional)'
      },
      
      {
        name: 'description',
        label: 'Descrição do Contrato',
        type: 'textarea' as const,
        required: true,
        placeholder: 'Descreva os serviços/produtos incluídos no contrato...',
        gridCols: 2
      }
    ], { gridCols: 2 }),
    
    formUtils.section('Configuração Financeira', [
      formUtils.selectField('paymentMethod', 'Método de Pagamento', [
        { label: 'Dinheiro', value: 'cash' },
        { label: 'Cartão', value: 'card' },
        { label: 'PIX', value: 'pix' },
        { label: 'Transferência Bancária', value: 'bank_transfer' }
      ], { required: true }),
      
      formUtils.selectField('billingType', 'Tipo de Faturamento', [
        { label: 'Mensal', value: 'monthly' },
        { label: 'Trimestral', value: 'quarterly' },
        { label: 'Semestral', value: 'semiannual' },
        { label: 'Anual', value: 'annual' },
        { label: 'Pagamento Único', value: 'one_time' }
      ], { required: true }),
      
      formUtils.numberField('amount', 'Valor (R$)', {
        required: true,
        placeholder: '0,00'
      }),
      
      formUtils.numberField('discount', 'Desconto (%)', {
        placeholder: '0'
      })
    ], { gridCols: 2 }),
    
    formUtils.section('Configurações Adicionais', [
      {
        name: 'autoRenewal',
        label: 'Renovação Automática',
        type: 'select' as const,
        options: [
          { label: 'Sim', value: true },
          { label: 'Não', value: false }
        ],
        placeholder: 'Selecione uma opção'
      },
      
      {
        name: 'notifications',
        label: 'Receber Notificações',
        type: 'select' as const,
        options: [
          { label: 'Sim', value: true },
          { label: 'Não', value: false }
        ],
        placeholder: 'Selecione uma opção'
      },
      
      {
        name: 'terms',
        label: 'Aceitar Termos e Condições',
        type: 'select' as const,
        required: true,
        options: [
          { label: 'Aceito os termos e condições', value: true }
        ],
        gridCols: 2
      }
    ], { gridCols: 2, collapsible: true, defaultExpanded: false })
  ]
});

// Componente principal
export const ContractFormExample: React.FC = () => {
  const toast = useToast();
  const [clientType, setClientType] = useState<'individual' | 'company' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuração do cabeçalho da página
  const headerConfig: PageHeaderConfig = {
    title: 'Novo Contrato',
    subtitle: 'Gestão de Contratos',
    description: 'Crie um novo contrato preenchendo as informações necessárias do cliente e configurações financeiras.',
    breadcrumb: [
      { label: 'Dashboard', href: '/dashboard', icon: 'pi pi-home' },
      { label: 'Contratos', href: '/contracts', icon: 'pi pi-file' },
      { label: 'Novo Contrato', icon: 'pi pi-plus' }
    ],
    actions: layoutUtils.createHeaderActions(
      <PrimeButton
        variant="outline"
        icon="pi pi-question-circle"
        onClick={() => toast.info('Ajuda: Preencha todos os campos obrigatórios para criar o contrato.')}
      >
        Ajuda
      </PrimeButton>,
      <PrimeButton
        variant="outline"
        icon="pi pi-save"
        onClick={() => toast.info('Rascunho salvo automaticamente a cada 3 segundos.')}
      >
        Salvar Rascunho
      </PrimeButton>
    )
  };

  // Itens do menu lateral
  const sidebarItems: ExtendedMenuItem[] = [
    layoutUtils.createMenuItem('Dashboard', 'pi pi-home', '/dashboard'),
    layoutUtils.createMenuGroup('Contratos', [
      layoutUtils.createMenuItem('Listar Contratos', 'pi pi-list', '/contracts'),
      layoutUtils.createMenuItem('Novo Contrato', 'pi pi-plus', '/contracts/new', { badge: 'Atual' }),
      layoutUtils.createMenuItem('Modelos', 'pi pi-copy', '/contracts/templates')
    ], 'pi pi-file'),
    layoutUtils.createMenuGroup('Clientes', [
      layoutUtils.createMenuItem('Listar Clientes', 'pi pi-users', '/clients'),
      layoutUtils.createMenuItem('Novo Cliente', 'pi pi-user-plus', '/clients/new')
    ], 'pi pi-users'),
    layoutUtils.createMenuItem('Relatórios', 'pi pi-chart-bar', '/reports'),
    layoutUtils.createMenuItem('Configurações', 'pi pi-cog', '/settings')
  ];

  // Itens do menu superior
  const topNavItems: ExtendedMenuItem[] = [
    layoutUtils.createMenuItem('Contratos', 'pi pi-file', '/contracts'),
    layoutUtils.createMenuItem('Clientes', 'pi pi-users', '/clients'),
    layoutUtils.createMenuItem('Financeiro', 'pi pi-dollar', '/financial')
  ];

  // Menu do usuário
  const userMenuItems: ExtendedMenuItem[] = [
    layoutUtils.createMenuItem('Perfil', 'pi pi-user', '/profile'),
    layoutUtils.createMenuItem('Configurações', 'pi pi-cog', '/settings'),
    { separator: true },
    layoutUtils.createMenuItem('Sair', 'pi pi-sign-out', '/logout')
  ];

  // Manipuladores de eventos
  const handleSubmit = async (data: ContractFormData) => {
    setIsSubmitting(true);
    
    try {
      // Simular chamada à API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Dados do contrato:', data);
      
      toast.success('Contrato criado com sucesso!', {
        actions: [
          {
            label: 'Ver Contrato',
            action: () => console.log('Navegar para o contrato criado')
          },
          {
            label: 'Criar Outro',
            action: () => window.location.reload()
          }
        ]
      });
      
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      toast.error('Erro ao criar contrato. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    toast.warning('Operação cancelada', {
      actions: [
        {
          label: 'Voltar',
          action: () => console.log('Navegar de volta')
        }
      ]
    });
  };

  const handleReset = () => {
    setClientType(null);
    toast.info('Formulário resetado');
  };

  // Valores padrão do formulário
  const defaultValues: Partial<ContractFormData> = {
    contractNumber: `CT-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    startDate: new Date().toLocaleDateString('pt-BR'),
    autoRenewal: false,
    notifications: true,
    discount: 0
  };

  return (
    <Page
      header={headerConfig}
      layout={layoutUtils.configs.form}
      sidebarItems={sidebarItems}
      topNavItems={topNavItems}
      userMenuItems={userMenuItems}
      notifications={3}
      onNotificationClick={() => toast.info('Você tem 3 notificações pendentes')}
    >
      <PrimeCard
        title="Informações do Contrato"
        subtitle="Preencha todos os campos obrigatórios"
        className="max-w-4xl mx-auto"
      >
        <PrimeForm
          config={createFormConfig(clientType)}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onReset={handleReset}
        >
          {/* Conteúdo adicional do formulário */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <i className="pi pi-info-circle text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Informações Importantes
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• O formulário é salvo automaticamente a cada 3 segundos</li>
                  <li>• Todos os campos marcados com * são obrigatórios</li>
                  <li>• O número do contrato deve ser único no sistema</li>
                  <li>• Contratos podem ser editados após a criação</li>
                </ul>
              </div>
            </div>
          </div>
        </PrimeForm>
      </PrimeCard>
    </Page>
  );
};

export default ContractFormExample;
