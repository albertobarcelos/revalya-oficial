import React, { useMemo } from 'react';
import { FormProvider } from 'react-hook-form';
import { ContractFormProvider, useContractForm } from './form/ContractFormProvider';
import { ContractLoadingManager } from './form/ContractLoadingManager';
import { ContractFormActions } from './form/ContractFormActions';
import { CancelButton } from './form/CancelButton';
import { ContractCancelButton } from './ContractCancelButton';
import { ContractSuspendButton } from './ContractSuspendButton';
import { ContractActivateButton } from './ContractActivateButton';
import { ContractFormHeader } from './parts/ContractFormHeader';
import { ContractBasicInfo } from './parts/ContractBasicInfo';
import { ContractSidebar } from './parts/ContractSidebar';
import { ContractServices } from './parts/ContractServices';
import { ContractProducts } from './parts/ContractProducts';
import { ContractDiscounts } from './parts/ContractDiscounts';
import { ContractTaxes } from './parts/ContractTaxes';
import { ContractAttachments } from './parts/ContractAttachments';
import { RecebimentosHistorico } from './parts/RecebimentosHistorico';
import { useContractFormLogic } from './hooks/useContractFormLogic';
import { ContractFormConfig, mergeConfig, defaultContractsConfig, defaultBillingConfig } from './types/ContractFormConfig';
import { useCustomers } from '@/hooks/useCustomers';
import { useServices } from '@/hooks/useServices';
import { useSecureProducts } from '@/hooks/useSecureProducts';
import { 
  FileText, 
  Package, 
  Percent, 
  Building2, 
  MessageSquare,
  Calculator,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage 
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

/**
 * AIDEV-NOTE: Função auxiliar para estilização dos botões de navegação
 */
const getNavButtonClass = (isActive: boolean) => 
  `flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all duration-200
   ${isActive 
     ? 'bg-primary/10 text-primary shadow-inner' 
     : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`;

/**
 * AIDEV-NOTE: Mapeamento de ícones para as abas
 */
const tabIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  servico: FileText,
  produtos: Package,
  descontos: Percent,
  departamentos: Building2,
  observacoes: MessageSquare,
  impostos: Calculator,
  recebimentos: CreditCard
};

/**
 * AIDEV-NOTE: Componente interno que renderiza o conteúdo do formulário
 */
interface ContractFormContentProps {
  config: ContractFormConfig;
  customers: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    description?: string;
    default_price?: number;
    price?: number;
    tax_rate?: number;
    is_active?: boolean;
    created_at?: string;
    tenant_id?: string;
  }>;
  onClientCreated: (clientId: string) => void;
}

function ContractFormContentInternal({
  config,
  customers,
  services,
  onClientCreated
}: ContractFormContentProps) {
  const { products = [] } = useSecureProducts();
  const { form, isViewMode, totalValues } = useContractForm();
  const logic = useContractFormLogic(config);
  
  // Observar o número do contrato do formulário
  const contractNumber = form.watch('contract_number');
  
  // AIDEV-NOTE: Renderizar conteúdo da aba ativa
  const renderTabContent = () => {
    const { activeTab } = logic;
    
    switch (activeTab) {
      case 'servico':
        return <ContractServices form={form} contractId={config.contractId} />;
      
      case 'produtos':
        return (
          <div>
            <h2 className="font-medium flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-primary" />
              Produtos do Contrato
            </h2>
            <ContractProducts products={products || []} />
          </div>
        );
      
      case 'descontos':
        return (
          <div>
            <h2 className="font-medium flex items-center gap-2 mb-4">
              <Percent className="h-4 w-4 text-primary" />
              Descontos
            </h2>
            <ContractDiscounts />
          </div>
        );
      
      case 'departamentos':
        return (
          <div>
            <h2 className="font-medium flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-primary" />
              Departamentos
            </h2>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/50">
              <div className="flex flex-col items-center space-y-3">
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Funcionalidade de Departamentos em desenvolvimento</p>
                <p className="text-xs text-muted-foreground/60">Em breve você poderá organizar contratos por departamentos</p>
              </div>
            </div>
          </div>
        );
      
      case 'impostos':
        return (
          <div>
            <h2 className="font-medium flex items-center gap-2 mb-4">
              <Calculator className="h-4 w-4 text-primary" />
              Impostos e Retenções
            </h2>
            <ContractTaxes />
          </div>
        );
      
      case 'observacoes':
        return (
          <div className="space-y-6">
            <h2 className="font-medium flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-primary" />
              Observações e Anexos
            </h2>
            
            {/* AIDEV-NOTE: Seção de observações internas */}
            <div className="bg-card rounded-lg border border-border/50 p-4">
              <FormField
                control={form.control}
                name="internal_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Observações Internas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione observações internas sobre este contrato..."
                        className="resize-none h-24 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* AIDEV-NOTE: Seção de anexos - só exibe se contractId existir */}
            {config.contractId && (
              <div className="bg-card rounded-lg border border-border/50 p-4">
                <ContractAttachments contractId={config.contractId} />
              </div>
            )}
            
            {/* AIDEV-NOTE: Aviso quando não há contractId */}
            {!config.contractId && (
              <div className="bg-muted/30 rounded-lg border border-border/30 p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Os anexos estarão disponíveis após salvar o contrato.
                </p>
              </div>
            )}
          </div>
        );
      
      case 'recebimentos':
        return (
          <div>
            <RecebimentosHistorico 
              recebimentos={[]} 
              onNovoRecebimento={() => {}} 
              contractId={config.contractId}
              showRealData={!!config.contractId}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <FormProvider {...form}>
      <div className={cn(
        'bg-background flex flex-col',
        logic.isModal ? 'h-full max-h-full' : 'min-h-screen'
      )}>
        {/* AIDEV-NOTE: Header do formulário */}
        {logic.showHeader && (
          <ContractFormHeader
            onBack={config.callbacks?.onCancel}
            contractNumber={contractNumber}
            mode={config.mode}
            title={config.labels?.title}
            subtitle={config.labels?.subtitle}
            className="min-h-[60px] flex-shrink-0 z-10"
          />
        )}
        
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* AIDEV-NOTE: Sidebar de navegação */}
          {logic.showSidebar && (
            <div className="w-[90px] bg-card shadow-md flex flex-col items-center border-r border-border/30 flex-shrink-0">
              {/* Botão de Salvar/Editar no topo */}
              <div className="py-3 flex-shrink-0">
                <ContractFormActions
                  contractId={config.contractId}
                  onSuccess={config.callbacks?.onSuccess || (() => {})}
                  onCancel={config.callbacks?.onCancel || (() => {})}
                  forceRefreshContracts={config.forceRefreshContracts}
                />
              </div>
              
              {/* AIDEV-NOTE: Área de rolagem otimizada para a navegação */}
              <div className={cn(
                'flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40 px-1.5 py-2',
                logic.isModal && 'max-h-[calc(100vh-400px)]'
              )}>
                <nav className="space-y-3">
                  {logic.enabledTabsList.map((tab) => {
                    const Icon = tabIcons[tab.id] || FileText;
                    return (
                      <button
                        key={tab.id}
                        className={getNavButtonClass(logic.activeTab === tab.id)}
                        onClick={() => logic.navigateToTab(tab.id)}
                        aria-label={`Aba de ${logic.getTabLabel(tab.id)}`}
                        aria-pressed={logic.activeTab === tab.id}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[9px] mt-1 font-medium">{logic.getTabLabel(tab.id)}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
              
              {/* AIDEV-NOTE: Seção inferior com ações e botão cancelar */}
              <div className="flex-shrink-0 w-full min-h-[200px]">
                {/* Ações do contrato (Ativar/Suspender/Cancelar) - só em modo view/edit */}
                {config.mode !== 'create' && config.contractId && (
                  <div className="px-1.5 py-2 border-t border-border/20">
                    <div className="text-center mb-2">
                      <span className="text-[7px] text-muted-foreground font-medium uppercase tracking-wide">
                        Ações
                      </span>
                    </div>
                    
                    <div className="space-y-1.5">
                      <ContractActivateButton
                        contractId={config.contractId}
                        contractNumber={form.watch('contract_number') || 'N/A'}
                        contractStatus={form.watch('status')}
                        onSuccess={() => {
                          toast.success('Contrato ativado com sucesso!');
                          config.callbacks?.onSuccess?.(config.contractId!);
                        }}
                        className="!w-16 !h-10 !p-1.5 text-[8px] flex flex-col items-center justify-center bg-green-50 border-green-200 text-green-700 hover:bg-green-100 transition-all duration-200 rounded-md"
                      />
                      
                      <ContractSuspendButton
                        contractId={config.contractId}
                        contractNumber={form.watch('contract_number') || 'N/A'}
                        contractStatus={form.watch('status')}
                        onSuccess={() => {
                          toast.success('Contrato suspenso com sucesso!');
                          config.callbacks?.onSuccess?.(config.contractId!);
                        }}
                        className="!w-16 !h-10 !p-1.5 text-[8px] flex flex-col items-center justify-center bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 transition-all duration-200 rounded-md"
                      />
                      
                      <ContractCancelButton
                        contractId={config.contractId}
                        contractNumber={form.watch('contract_number') || 'N/A'}
                        onSuccess={() => {
                          toast.success('Contrato cancelado com sucesso!');
                          config.callbacks?.onSuccess?.(config.contractId!);
                        }}
                        className="!w-16 !h-10 !p-1.5 text-[8px] flex flex-col items-center justify-center bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 transition-all duration-200 rounded-md"
                      />
                    </div>
                  </div>
                )}
                
                {/* Botão de Cancelar na parte inferior */}
                <div className="p-2 border-t border-border/20 w-full flex justify-center">
                  <CancelButton 
                    onClick={config.callbacks?.onCancel || (() => {})}
                    className="hover:bg-destructive/10 hover:text-destructive !h-8 !w-16 !text-[8px]"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* AIDEV-NOTE: Área principal com scroll otimizado */}
          <div className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40',
            logic.isModal && 'max-h-[calc(100vh-120px)]'
          )}>
            <div className="min-h-full">
              <div className={cn(
                'grid grid-cols-1 lg:grid-cols-3 gap-6',
                logic.isModal ? 'p-4 pb-20' : 'p-6'
              )}>
                <div className="col-span-1 lg:col-span-2 space-y-6">
                  {/* AIDEV-NOTE: Informações básicas */}
                  <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm">
                    <h2 className="font-medium flex items-center gap-2 mb-4">
                      <Building2 className="h-4 w-4 text-primary" />
                      Informações Básicas
                    </h2>
                    <ContractBasicInfo 
                      customers={customers || []} 
                      onClientCreated={onClientCreated}
                      isFieldLoading={config.isFieldLoading}
                      hideVigenceFields={config.layout?.hideVigenceFields}
                      contractNumberLabel={config.labels?.fields?.contractNumber}
                      billingDayLabel={config.labels?.fields?.billingDay}
                      useBillingDatePicker={config.useBillingDatePicker}
                    />
                  </div>
                  
                  {/* AIDEV-NOTE: Conteúdo da aba ativa */}
                  <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm min-h-[500px]">
                    {renderTabContent()}
                  </div>
                </div>
                
                {/* AIDEV-NOTE: Sidebar de resumo */}
                <div className="col-span-1 lg:col-span-1">
                  <div className="bg-card sticky top-4 rounded-lg border border-border/50 shadow-sm p-6 mb-8">
                    <ContractSidebar 
                      totalValues={totalValues}
                      onCancel={config.callbacks?.onCancel || (() => {})}
                      isViewMode={logic.isViewMode}
                      contractId={config.contractId}
                      fromBilling={config.fromBilling}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}

/**
 * AIDEV-NOTE: Componente base reutilizável do formulário de contrato
 * 
 * Este componente é totalmente desacoplado de contexto específico e pode ser usado
 * em diferentes situações (tela de contratos, faturamento, etc.) através de configuração.
 * 
 * @param config - Configuração completa do formulário
 */
export function ContractForm({ config }: { config: ContractFormConfig }) {
  // AIDEV-NOTE: Merge da configuração com valores padrão baseado no contexto
  const mergedConfig = useMemo(() => {
    const defaultConfig = config.context === 'billing' 
      ? defaultBillingConfig 
      : defaultContractsConfig;
    
    return mergeConfig(config, defaultConfig);
  }, [config]);

  // AIDEV-NOTE: Buscar dados necessários
  const { customers, refetch: refetchCustomers } = useCustomers();
  const { data: servicesData } = useServices();
  const availableServices = servicesData?.data || [];

  // AIDEV-NOTE: Handler para quando um cliente é criado
  const handleClientCreated = async (clientId: string) => {
    await refetchCustomers();
  };

  return (
    <ContractFormProvider
      mode={mergedConfig.mode}
      contractId={mergedConfig.contractId}
      onSuccess={mergedConfig.callbacks?.onSuccess || (() => {})}
      onCancel={mergedConfig.callbacks?.onCancel || (() => {})}
      onFormChange={mergedConfig.callbacks?.onFormChange}
      onEditRequest={mergedConfig.callbacks?.onEditRequest}
    >
      <ContractLoadingManager contractId={mergedConfig.contractId}>
        <ContractFormContentInternal
          config={mergedConfig}
          customers={customers || []}
          services={availableServices}
          onClientCreated={handleClientCreated}
        />
      </ContractLoadingManager>
    </ContractFormProvider>
  );
}

