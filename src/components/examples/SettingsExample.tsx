import React, { useState } from 'react';
import {
  Page,
  PrimeCard,
  PrimeForm,
  PrimeButton,
  IconButton,
  TabMenuWrapper,
  useToast,
  layoutUtils,
  formUtils,
  commonSchemas,
  type PageHeaderConfig,
  type ExtendedMenuItem,
  type FormFieldConfig,
  type FormSectionConfig
} from '@/components/prime';
import { z } from 'zod';

// Schemas de validação para cada aba
const generalSettingsSchema = z.object({
  companyName: z.string().min(1, 'Nome da empresa é obrigatório'),
  companyDocument: z.string().min(1, 'CNPJ é obrigatório'),
  companyEmail: z.string().email('Email inválido'),
  companyPhone: z.string().min(1, 'Telefone é obrigatório'),
  companyWebsite: z.string().url('URL inválida').optional().or(z.literal('')),
  timezone: z.string().min(1, 'Fuso horário é obrigatório'),
  language: z.string().min(1, 'Idioma é obrigatório'),
  currency: z.string().min(1, 'Moeda é obrigatória'),
  dateFormat: z.string().min(1, 'Formato de data é obrigatório'),
  numberFormat: z.string().min(1, 'Formato de número é obrigatório')
});

const contractSettingsSchema = z.object({
  defaultContractDuration: z.number().min(1, 'Duração deve ser maior que 0'),
  contractNumberPrefix: z.string().min(1, 'Prefixo é obrigatório'),
  contractNumberFormat: z.string().min(1, 'Formato é obrigatório'),
  autoRenewal: z.boolean(),
  renewalNotificationDays: z.number().min(1, 'Deve ser maior que 0'),
  requireDigitalSignature: z.boolean(),
  allowContractModification: z.boolean(),
  contractApprovalRequired: z.boolean(),
  defaultPaymentTerms: z.number().min(1, 'Deve ser maior que 0'),
  lateFeePercentage: z.number().min(0, 'Deve ser maior ou igual a 0'),
  interestRatePerMonth: z.number().min(0, 'Deve ser maior ou igual a 0')
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  contractExpiration: z.boolean(),
  paymentReminders: z.boolean(),
  systemUpdates: z.boolean(),
  marketingEmails: z.boolean(),
  weeklyReports: z.boolean(),
  monthlyReports: z.boolean(),
  notificationEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  notificationPhone: z.string().optional().or(z.literal(''))
});

const securitySettingsSchema = z.object({
  twoFactorAuth: z.boolean(),
  sessionTimeout: z.number().min(5, 'Mínimo 5 minutos'),
  passwordExpiration: z.number().min(30, 'Mínimo 30 dias'),
  maxLoginAttempts: z.number().min(3, 'Mínimo 3 tentativas'),
  requireStrongPassword: z.boolean(),
  allowRememberMe: z.boolean(),
  ipWhitelist: z.string().optional().or(z.literal('')),
  auditLog: z.boolean(),
  dataRetentionDays: z.number().min(30, 'Mínimo 30 dias'),
  backupFrequency: z.string().min(1, 'Frequência é obrigatória')
});

const integrationSettingsSchema = z.object({
  emailProvider: z.string().min(1, 'Provedor é obrigatório'),
  emailApiKey: z.string().optional().or(z.literal('')),
  smsProvider: z.string().min(1, 'Provedor é obrigatório'),
  smsApiKey: z.string().optional().or(z.literal('')),
  paymentGateway: z.string().min(1, 'Gateway é obrigatório'),
  paymentApiKey: z.string().optional().or(z.literal('')),
  crmIntegration: z.boolean(),
  crmApiUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  crmApiKey: z.string().optional().or(z.literal('')),
  webhookUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  webhookSecret: z.string().optional().or(z.literal(''))
});

// Dados iniciais mockados
const initialGeneralSettings = {
  companyName: 'Revalya Sistemas',
  companyDocument: '12.345.678/0001-90',
  companyEmail: 'contato@revalya.com',
  companyPhone: '(11) 99999-9999',
  companyWebsite: 'https://revalya.com',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  currency: 'BRL',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'pt-BR'
};

const initialContractSettings = {
  defaultContractDuration: 12,
  contractNumberPrefix: 'CT',
  contractNumberFormat: 'CT-YYYY-NNN',
  autoRenewal: true,
  renewalNotificationDays: 30,
  requireDigitalSignature: true,
  allowContractModification: false,
  contractApprovalRequired: true,
  defaultPaymentTerms: 30,
  lateFeePercentage: 2.0,
  interestRatePerMonth: 1.0
};

const initialNotificationSettings = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  contractExpiration: true,
  paymentReminders: true,
  systemUpdates: true,
  marketingEmails: false,
  weeklyReports: true,
  monthlyReports: true,
  notificationEmail: 'admin@revalya.com',
  notificationPhone: ''
};

const initialSecuritySettings = {
  twoFactorAuth: true,
  sessionTimeout: 60,
  passwordExpiration: 90,
  maxLoginAttempts: 5,
  requireStrongPassword: true,
  allowRememberMe: true,
  ipWhitelist: '',
  auditLog: true,
  dataRetentionDays: 365,
  backupFrequency: 'daily'
};

const initialIntegrationSettings = {
  emailProvider: 'sendgrid',
  emailApiKey: '',
  smsProvider: 'twilio',
  smsApiKey: '',
  paymentGateway: 'stripe',
  paymentApiKey: '',
  crmIntegration: false,
  crmApiUrl: '',
  crmApiKey: '',
  webhookUrl: '',
  webhookSecret: ''
};

// Componente principal
export const SettingsExample: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Configuração do cabeçalho da página
  const headerConfig: PageHeaderConfig = {
    title: 'Configurações',
    subtitle: 'Gerencie as configurações do sistema',
    description: 'Configure todos os aspectos do sistema de acordo com suas necessidades.',
    breadcrumb: [
      { label: 'Dashboard', icon: 'pi pi-home', url: '/dashboard' },
      { label: 'Configurações', icon: 'pi pi-cog' }
    ],
    actions: layoutUtils.createHeaderActions(
      <PrimeButton
        variant="outline"
        icon="pi pi-refresh"
        onClick={() => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            toast.success('Configurações recarregadas!');
          }, 1000);
        }}
        loading={loading}
      >
        Recarregar
      </PrimeButton>,
      <PrimeButton
        variant="outline"
        icon="pi pi-download"
        onClick={() => toast.success('Exportando configurações...')}
      >
        Exportar
      </PrimeButton>
    )
  };

  // Itens do menu lateral
  const sidebarItems: ExtendedMenuItem[] = [
    layoutUtils.createMenuItem('Dashboard', 'pi pi-home', '/dashboard'),
    layoutUtils.createMenuItem('Contratos', 'pi pi-file', '/contracts'),
    layoutUtils.createMenuItem('Clientes', 'pi pi-users', '/clients'),
    layoutUtils.createMenuItem('Financeiro', 'pi pi-wallet', '/financial'),
    layoutUtils.createMenuItem('Configurações', 'pi pi-cog', '/settings', { badge: 'Atual' })
  ];

  // Configuração das abas
  const tabItems = [
    { label: 'Geral', icon: 'pi pi-cog' },
    { label: 'Contratos', icon: 'pi pi-file' },
    { label: 'Notificações', icon: 'pi pi-bell' },
    { label: 'Segurança', icon: 'pi pi-shield' },
    { label: 'Integrações', icon: 'pi pi-link' }
  ];

  // Configurações de campos para cada aba
  const generalFields: FormFieldConfig[] = [
    formUtils.createField('text', 'companyName', 'Nome da Empresa', { required: true }),
    formUtils.createField('text', 'companyDocument', 'CNPJ', { required: true, mask: '99.999.999/9999-99' }),
    formUtils.createField('email', 'companyEmail', 'Email da Empresa', { required: true }),
    formUtils.createField('text', 'companyPhone', 'Telefone', { required: true, mask: '(99) 99999-9999' }),
    formUtils.createField('text', 'companyWebsite', 'Website', { placeholder: 'https://exemplo.com' }),
    formUtils.createField('select', 'timezone', 'Fuso Horário', {
      required: true,
      options: [
        { label: 'São Paulo (GMT-3)', value: 'America/Sao_Paulo' },
        { label: 'Rio de Janeiro (GMT-3)', value: 'America/Rio_de_Janeiro' },
        { label: 'Manaus (GMT-4)', value: 'America/Manaus' },
        { label: 'UTC (GMT+0)', value: 'UTC' }
      ]
    }),
    formUtils.createField('select', 'language', 'Idioma', {
      required: true,
      options: [
        { label: 'Português (Brasil)', value: 'pt-BR' },
        { label: 'English (US)', value: 'en-US' },
        { label: 'Español', value: 'es-ES' }
      ]
    }),
    formUtils.createField('select', 'currency', 'Moeda', {
      required: true,
      options: [
        { label: 'Real (BRL)', value: 'BRL' },
        { label: 'Dólar (USD)', value: 'USD' },
        { label: 'Euro (EUR)', value: 'EUR' }
      ]
    }),
    formUtils.createField('select', 'dateFormat', 'Formato de Data', {
      required: true,
      options: [
        { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
        { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
        { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
      ]
    }),
    formUtils.createField('select', 'numberFormat', 'Formato de Número', {
      required: true,
      options: [
        { label: 'Brasileiro (1.234,56)', value: 'pt-BR' },
        { label: 'Americano (1,234.56)', value: 'en-US' },
        { label: 'Europeu (1 234,56)', value: 'fr-FR' }
      ]
    })
  ];

  const contractFields: FormFieldConfig[] = [
    formUtils.createField('number', 'defaultContractDuration', 'Duração Padrão (meses)', { required: true, min: 1 }),
    formUtils.createField('text', 'contractNumberPrefix', 'Prefixo do Contrato', { required: true }),
    formUtils.createField('text', 'contractNumberFormat', 'Formato da Numeração', { 
      required: true,
      helpText: 'Use YYYY para ano, MM para mês, DD para dia, NNN para número sequencial'
    }),
    formUtils.createField('switch', 'autoRenewal', 'Renovação Automática'),
    formUtils.createField('number', 'renewalNotificationDays', 'Notificar Renovação (dias)', { required: true, min: 1 }),
    formUtils.createField('switch', 'requireDigitalSignature', 'Exigir Assinatura Digital'),
    formUtils.createField('switch', 'allowContractModification', 'Permitir Modificação de Contratos'),
    formUtils.createField('switch', 'contractApprovalRequired', 'Aprovação Obrigatória'),
    formUtils.createField('number', 'defaultPaymentTerms', 'Prazo de Pagamento Padrão (dias)', { required: true, min: 1 }),
    formUtils.createField('number', 'lateFeePercentage', 'Multa por Atraso (%)', { required: true, min: 0, step: 0.1 }),
    formUtils.createField('number', 'interestRatePerMonth', 'Juros Mensais (%)', { required: true, min: 0, step: 0.1 })
  ];

  const notificationFields: FormFieldConfig[] = [
    formUtils.createField('switch', 'emailNotifications', 'Notificações por Email'),
    formUtils.createField('switch', 'smsNotifications', 'Notificações por SMS'),
    formUtils.createField('switch', 'pushNotifications', 'Notificações Push'),
    formUtils.createField('switch', 'contractExpiration', 'Expiração de Contratos'),
    formUtils.createField('switch', 'paymentReminders', 'Lembretes de Pagamento'),
    formUtils.createField('switch', 'systemUpdates', 'Atualizações do Sistema'),
    formUtils.createField('switch', 'marketingEmails', 'Emails de Marketing'),
    formUtils.createField('switch', 'weeklyReports', 'Relatórios Semanais'),
    formUtils.createField('switch', 'monthlyReports', 'Relatórios Mensais'),
    formUtils.createField('email', 'notificationEmail', 'Email para Notificações'),
    formUtils.createField('text', 'notificationPhone', 'Telefone para SMS', { mask: '(99) 99999-9999' })
  ];

  const securityFields: FormFieldConfig[] = [
    formUtils.createField('switch', 'twoFactorAuth', 'Autenticação de Dois Fatores'),
    formUtils.createField('number', 'sessionTimeout', 'Timeout da Sessão (minutos)', { required: true, min: 5 }),
    formUtils.createField('number', 'passwordExpiration', 'Expiração de Senha (dias)', { required: true, min: 30 }),
    formUtils.createField('number', 'maxLoginAttempts', 'Máximo de Tentativas de Login', { required: true, min: 3 }),
    formUtils.createField('switch', 'requireStrongPassword', 'Exigir Senha Forte'),
    formUtils.createField('switch', 'allowRememberMe', 'Permitir "Lembrar de Mim"'),
    formUtils.createField('textarea', 'ipWhitelist', 'Lista de IPs Permitidos', {
      helpText: 'Um IP por linha. Deixe vazio para permitir todos.'
    }),
    formUtils.createField('switch', 'auditLog', 'Log de Auditoria'),
    formUtils.createField('number', 'dataRetentionDays', 'Retenção de Dados (dias)', { required: true, min: 30 }),
    formUtils.createField('select', 'backupFrequency', 'Frequência de Backup', {
      required: true,
      options: [
        { label: 'Diário', value: 'daily' },
        { label: 'Semanal', value: 'weekly' },
        { label: 'Mensal', value: 'monthly' }
      ]
    })
  ];

  const integrationFields: FormFieldConfig[] = [
    formUtils.createField('select', 'emailProvider', 'Provedor de Email', {
      required: true,
      options: [
        { label: 'SendGrid', value: 'sendgrid' },
        { label: 'Mailgun', value: 'mailgun' },
        { label: 'Amazon SES', value: 'ses' },
        { label: 'SMTP Customizado', value: 'smtp' }
      ]
    }),
    formUtils.createField('password', 'emailApiKey', 'Chave da API de Email'),
    formUtils.createField('select', 'smsProvider', 'Provedor de SMS', {
      required: true,
      options: [
        { label: 'Twilio', value: 'twilio' },
        { label: 'Nexmo', value: 'nexmo' },
        { label: 'AWS SNS', value: 'sns' }
      ]
    }),
    formUtils.createField('password', 'smsApiKey', 'Chave da API de SMS'),
    formUtils.createField('select', 'paymentGateway', 'Gateway de Pagamento', {
      required: true,
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'PagSeguro', value: 'pagseguro' },
        { label: 'Mercado Pago', value: 'mercadopago' },
        { label: 'PayPal', value: 'paypal' }
      ]
    }),
    formUtils.createField('password', 'paymentApiKey', 'Chave da API de Pagamento'),
    formUtils.createField('switch', 'crmIntegration', 'Integração com CRM'),
    formUtils.createField('text', 'crmApiUrl', 'URL da API do CRM'),
    formUtils.createField('password', 'crmApiKey', 'Chave da API do CRM'),
    formUtils.createField('text', 'webhookUrl', 'URL do Webhook'),
    formUtils.createField('password', 'webhookSecret', 'Segredo do Webhook')
  ];

  // Seções para cada aba
  const generalSections: FormSectionConfig[] = [
    formUtils.createSection('Informações da Empresa', generalFields.slice(0, 5)),
    formUtils.createSection('Configurações Regionais', generalFields.slice(5))
  ];

  const contractSections: FormSectionConfig[] = [
    formUtils.createSection('Configurações Gerais', contractFields.slice(0, 5)),
    formUtils.createSection('Assinatura e Aprovação', contractFields.slice(5, 8)),
    formUtils.createSection('Configurações Financeiras', contractFields.slice(8))
  ];

  const notificationSections: FormSectionConfig[] = [
    formUtils.createSection('Canais de Notificação', notificationFields.slice(0, 3)),
    formUtils.createSection('Tipos de Notificação', notificationFields.slice(3, 9)),
    formUtils.createSection('Contatos para Notificação', notificationFields.slice(9))
  ];

  const securitySections: FormSectionConfig[] = [
    formUtils.createSection('Autenticação', securityFields.slice(0, 6)),
    formUtils.createSection('Auditoria e Logs', securityFields.slice(6, 8)),
    formUtils.createSection('Backup e Retenção', securityFields.slice(8))
  ];

  const integrationSections: FormSectionConfig[] = [
    formUtils.createSection('Comunicação', integrationFields.slice(0, 4)),
    formUtils.createSection('Pagamentos', integrationFields.slice(4, 6)),
    formUtils.createSection('CRM e Webhooks', integrationFields.slice(6))
  ];

  // Handlers para salvar cada aba
  const handleSaveGeneral = async (data: any) => {
    setLoading(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações gerais salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações gerais');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContract = async (data: any) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações de contratos salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações de contratos');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotification = async (data: any) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações de notificações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações de notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async (data: any) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações de segurança salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações de segurança');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIntegration = async (data: any) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações de integrações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações de integrações');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar conteúdo da aba ativa
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <PrimeForm
            schema={generalSettingsSchema}
            sections={generalSections}
            defaultValues={initialGeneralSettings}
            onSubmit={handleSaveGeneral}
            submitText="Salvar Configurações Gerais"
            loading={loading}
          />
        );
      case 1:
        return (
          <PrimeForm
            schema={contractSettingsSchema}
            sections={contractSections}
            defaultValues={initialContractSettings}
            onSubmit={handleSaveContract}
            submitText="Salvar Configurações de Contratos"
            loading={loading}
          />
        );
      case 2:
        return (
          <PrimeForm
            schema={notificationSettingsSchema}
            sections={notificationSections}
            defaultValues={initialNotificationSettings}
            onSubmit={handleSaveNotification}
            submitText="Salvar Configurações de Notificações"
            loading={loading}
          />
        );
      case 3:
        return (
          <PrimeForm
            schema={securitySettingsSchema}
            sections={securitySections}
            defaultValues={initialSecuritySettings}
            onSubmit={handleSaveSecurity}
            submitText="Salvar Configurações de Segurança"
            loading={loading}
          />
        );
      case 4:
        return (
          <PrimeForm
            schema={integrationSettingsSchema}
            sections={integrationSections}
            defaultValues={initialIntegrationSettings}
            onSubmit={handleSaveIntegration}
            submitText="Salvar Configurações de Integrações"
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Page
      header={headerConfig}
      layout={layoutUtils.configs.form}
      sidebarItems={sidebarItems}
    >
      <div className="space-y-6">
        {/* Navegação por abas */}
        <PrimeCard>
          <TabMenuWrapper
            model={tabItems}
            activeIndex={activeTab}
            onTabChange={(e) => setActiveTab(e.index)}
          />
        </PrimeCard>

        {/* Conteúdo da aba ativa */}
        <div className="min-h-[600px]">
          {renderTabContent()}
        </div>
      </div>
    </Page>
  );
};

export default SettingsExample;
